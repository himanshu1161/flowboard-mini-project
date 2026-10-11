import { createAction, createSlice } from '@reduxjs/toolkit'
import type { Patch, Snapshot } from '../../models/types'

/** The only way entity data changes: apply a patch produced by a domain rule. */
export const patchApplied = createAction<Patch>('data/patchApplied')
/** Replace all entity data (fresh seed / "Reset demo data"). */
export const dataReset = createAction<Snapshot>('data/reset')

type PatchKey = keyof NonNullable<Patch['upsert']>

/**
 * Reducers are intentionally dumb: all validation and permission checks
 * happen before a patch is produced (see `models/*Ops.ts` + `store/services`).
 */
function createEntitySlice<K extends PatchKey>(key: K, initialState: Snapshot[K]) {
  return createSlice({
    name: key,
    initialState,
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addCase(patchApplied, (state, { payload }) => {
          const table = state as Record<string, unknown>
          for (const entity of payload.upsert?.[key] ?? []) table[entity.id] = entity
          for (const id of payload.remove?.[key] ?? []) delete table[id]
        })
        .addCase(dataReset, (_state, { payload }) => payload[key])
    },
  })
}

export const containersSlice = createEntitySlice('containers', {})
export const statusesSlice = createEntitySlice('statuses', {})
export const tasksSlice = createEntitySlice('tasks', {})
export const grantsSlice = createEntitySlice('grants', {})

export const usersSlice = createSlice({
  name: 'users',
  initialState: {} as Snapshot['users'],
  reducers: {},
  extraReducers: (builder) => builder.addCase(dataReset, (_state, { payload }) => payload.users),
})
