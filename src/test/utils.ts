import { makeStore, type MakeStoreOptions } from '../store'
import { userSwitched } from '../store/slices/session'

/** A fresh, isolated store with no latency and no persistence. */
export function freshStore(options: MakeStoreOptions = {}) {
  return makeStore({ ...options, simulation: { latencyMs: 0, failuresEnabled: false, ...options.simulation } })
}

export function storeAs(userId: string, options: MakeStoreOptions = {}) {
  const store = freshStore(options)
  store.dispatch(userSwitched(userId))
  return store
}

export const ALICE = 'u_alice'
export const BOB = 'u_bob'
export const CAROL = 'u_carol'
