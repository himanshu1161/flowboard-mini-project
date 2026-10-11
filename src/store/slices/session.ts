import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ID } from '../../models/types'

export interface SimulationSettings {
  /** When on, each request fails with probability `failureRate`. */
  failuresEnabled: boolean
  failureRate: number
  /** Artificial latency for every request, in ms. */
  latencyMs: number
}

export interface SessionState {
  currentUserId: ID
  simulation: SimulationSettings
  /** True once the initial workspace "fetch" has completed. */
  ready: boolean
}

export const DEFAULT_SIMULATION: SimulationSettings = {
  failuresEnabled: false,
  failureRate: 0.5,
  latencyMs: 350,
}

const initialState: SessionState = {
  currentUserId: 'u_alice',
  simulation: DEFAULT_SIMULATION,
  ready: false,
}

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    userSwitched(state, action: PayloadAction<ID>) {
      state.currentUserId = action.payload
    },
    simulationChanged(state, action: PayloadAction<Partial<SimulationSettings>>) {
      state.simulation = { ...state.simulation, ...action.payload }
    },
    readyChanged(state, action: PayloadAction<boolean>) {
      state.ready = action.payload
    },
  },
})

export const { userSwitched, simulationChanged, readyChanged } = sessionSlice.actions
