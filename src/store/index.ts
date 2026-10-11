import { combineReducers, configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { createSeed } from '../models/seed'
import {
  containersSlice,
  grantsSlice,
  statusesSlice,
  tasksSlice,
  usersSlice,
} from './slices/entities'
import { sessionSlice, type SimulationSettings } from './slices/session'
import { uiSlice } from './slices/ui'
import { persistenceMiddleware } from './persistence'

const rootReducer = combineReducers({
  users: usersSlice.reducer,
  containers: containersSlice.reducer,
  statuses: statusesSlice.reducer,
  tasks: tasksSlice.reducer,
  grants: grantsSlice.reducer,
  session: sessionSlice.reducer,
  ui: uiSlice.reducer,
})

export type RootState = ReturnType<typeof rootReducer>

export interface MakeStoreOptions {
  /** Partial state to start from (tests, persisted state). Missing entity tables come from a fresh seed. */
  preloadedState?: Partial<RootState>
  simulation?: Partial<SimulationSettings>
  /** Write changes to localStorage. Off by default so tests stay isolated. */
  persist?: boolean
}

export function makeStore({ preloadedState, simulation, persist = false }: MakeStoreOptions = {}) {
  const seed = createSeed()
  const base = rootReducer(undefined, { type: '@@init' })
  const state: RootState = {
    ...base,
    ...seed,
    ...preloadedState,
    session: {
      ...base.session,
      ...preloadedState?.session,
      simulation: { ...base.session.simulation, ...preloadedState?.session?.simulation, ...simulation },
    },
    ui: { ...base.ui, ...preloadedState?.ui },
  }
  return configureStore({
    reducer: rootReducer,
    preloadedState: state,
    middleware: (getDefault) => (persist ? getDefault().prepend(persistenceMiddleware) : getDefault()),
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
export type AppThunk<R = void> = ThunkAction<R, RootState, unknown, UnknownAction>

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
