import { createListenerMiddleware } from '@reduxjs/toolkit'
import type { RootState } from './index'

/**
 * localStorage persistence (optional per the brief — enabled in the app, off in tests).
 * Entity data + a few session/ui preferences are stored under a versioned key;
 * bumping the version discards incompatible data instead of crashing on it.
 */
export const STORAGE_KEY = 'flowboard:v1'

const listener = createListenerMiddleware()

listener.startListening({
  predicate: (action) => !action.type.startsWith('ui/toast') && action.type !== 'ui/listLoadChanged',
  effect: (_action, api) => {
    const state = api.getState() as RootState
    savePersistedState(state)
  },
})

export const persistenceMiddleware = listener.middleware

function savePersistedState(state: RootState) {
  try {
    const { users, containers, statuses, tasks, grants, session, ui } = state
    const payload = {
      users,
      containers,
      statuses,
      tasks,
      grants,
      session: { currentUserId: session.currentUserId, simulation: session.simulation },
      ui: { selectedListId: ui.selectedListId, view: ui.view, collapsedIds: ui.collapsedIds, sidebarCollapsed: ui.sidebarCollapsed },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Storage full / disabled — the app keeps working in memory.
  }
}

export function loadPersistedState(): Partial<RootState> | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    const tables = ['users', 'containers', 'statuses', 'tasks', 'grants'] as const
    if (!tables.every((t) => parsed[t] && typeof parsed[t] === 'object')) return undefined
    return parsed as Partial<RootState>
  } catch {
    return undefined
  }
}

export function clearPersistedState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
