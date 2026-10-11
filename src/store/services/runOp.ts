import { appError } from '../../models/errors'
import type { AppError, OpContext, Patch, Planned, Result, Snapshot, User } from '../../models/types'
import type { AppThunk, RootState } from '../index'
import { selectCurrentUser, selectSnapshot } from '../selectors'
import { patchApplied } from '../slices/entities'
import type { SimulationSettings } from '../slices/session'

/**
 * The client-side "API". Every mutation goes through `runOp`:
 *
 *   1. run the pure domain rule (permissions + validation) against current state
 *   2. simulate the network round-trip (latency + optional random failure)
 *   3. apply the resulting patch — or, for optimistic ops, apply first and
 *      roll back if the "request" fails
 *
 * Every call resolves to `Result<T>` = `{ data }` | `{ error: { code, message } }`.
 * Nothing throws, so callers handle success and failure uniformly.
 */

export type Plan<T> = (snap: Snapshot, user: User, ctx: OpContext) => Result<Planned<T>>

export function createContext(): OpContext {
  return {
    now: new Date().toISOString(),
    newId: (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`,
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function simulateNetwork(
  sim: SimulationSettings,
  message = 'The server did not respond (simulated failure). Your change was not saved.',
): Promise<AppError | null> {
  if (sim.latencyMs > 0) await delay(sim.latencyMs)
  if (sim.failuresEnabled && Math.random() < sim.failureRate) return appError('NETWORK', message)
  return null
}

/** Build a patch that undoes `patch` relative to `snap`. */
export function invertPatch(snap: Snapshot, patch: Patch): Patch {
  const inverse: Required<Patch> = { upsert: {}, remove: {} }
  const tables = ['containers', 'statuses', 'tasks', 'grants'] as const
  for (const table of tables) {
    const upserts = patch.upsert?.[table] ?? []
    const removes = patch.remove?.[table] ?? []
    const restore: unknown[] = []
    const drop: string[] = []
    for (const entity of upserts) {
      const previous = snap[table][entity.id]
      if (previous) restore.push(previous)
      else drop.push(entity.id)
    }
    for (const id of removes) {
      const previous = snap[table][id]
      if (previous) restore.push(previous)
    }
    ;(inverse.upsert as Record<string, unknown[]>)[table] = restore
    inverse.remove[table] = drop
  }
  return inverse
}

const isEmpty = (patch: Patch) =>
  Object.values(patch.upsert ?? {}).every((v) => !v?.length) && Object.values(patch.remove ?? {}).every((v) => !v?.length)

export function runOp<T>(plan: Plan<T>, options: { optimistic?: boolean } = {}): AppThunk<Promise<Result<T>>> {
  return async (dispatch, getState) => {
    const state = getState()
    const user = selectCurrentUser(state)
    const snap = selectSnapshot(state)
    const planned = plan(snap, user, createContext())
    if (planned.error) return planned
    if (isEmpty(planned.data.patch)) return { data: planned.data.value }

    if (options.optimistic) {
      const rollback = invertPatch(snap, planned.data.patch)
      dispatch(patchApplied(planned.data.patch))
      const networkError = await simulateNetwork(
        simulation(state),
        'The server did not respond (simulated failure). The change was rolled back.',
      )
      if (networkError) {
        dispatch(patchApplied(rollback))
        return { error: networkError }
      }
      return { data: planned.data.value }
    }

    const networkError = await simulateNetwork(simulation(state))
    if (networkError) return { error: networkError }

    // Re-validate against the latest state: something may have changed during the "request".
    const fresh = plan(selectSnapshot(getState()), user, createContext())
    if (fresh.error) return fresh
    dispatch(patchApplied(fresh.data.patch))
    return { data: fresh.data.value }
  }
}

const simulation = (state: RootState) => state.session.simulation
