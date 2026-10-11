import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppError, ID } from '../../models/types'
import type { SortDir, SortKey } from '../../models/ordering'

export type ViewMode = 'board' | 'list'
export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  kind: ToastKind
  title: string
  message?: string
  /** Label of an action button; the callback lives in the controller layer. */
  actionLabel?: string
}

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UiState {
  selectedListId: ID | null
  view: ViewMode
  drawerTaskId: ID | null
  search: string
  sort: { key: SortKey; dir: SortDir }
  collapsedIds: ID[]
  sidebarCollapsed: boolean
  listLoad: { listId: ID | null; status: LoadStatus; error: AppError | null }
  /** "New task" dialog — opened from the header button or the `n` shortcut. */
  newTask: { open: boolean; statusId: ID | null }
  toasts: Toast[]
}

const initialState: UiState = {
  selectedListId: null,
  view: 'board',
  drawerTaskId: null,
  search: '',
  sort: { key: 'manual', dir: 'asc' },
  collapsedIds: [],
  sidebarCollapsed: false,
  listLoad: { listId: null, status: 'idle', error: null },
  newTask: { open: false, statusId: null },
  toasts: [],
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    listSelected(state, action: PayloadAction<ID | null>) {
      state.selectedListId = action.payload
      state.drawerTaskId = null
    },
    viewChanged(state, action: PayloadAction<ViewMode>) {
      state.view = action.payload
    },
    drawerOpened(state, action: PayloadAction<ID>) {
      state.drawerTaskId = action.payload
    },
    drawerClosed(state) {
      state.drawerTaskId = null
    },
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload
    },
    sortChanged(state, action: PayloadAction<SortKey>) {
      const key = action.payload
      if (state.sort.key === key && key !== 'manual') {
        state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc'
      } else {
        state.sort = { key, dir: 'asc' }
      }
    },
    nodeToggled(state, action: PayloadAction<ID>) {
      const id = action.payload
      state.collapsedIds = state.collapsedIds.includes(id)
        ? state.collapsedIds.filter((x) => x !== id)
        : [...state.collapsedIds, id]
    },
    nodeExpanded(state, action: PayloadAction<ID>) {
      state.collapsedIds = state.collapsedIds.filter((x) => x !== action.payload)
    },
    sidebarToggled(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    listLoadChanged(state, action: PayloadAction<UiState['listLoad']>) {
      state.listLoad = action.payload
    },
    newTaskOpened(state, action: PayloadAction<ID | null>) {
      state.newTask = { open: true, statusId: action.payload }
    },
    newTaskClosed(state) {
      state.newTask.open = false
    },
    toastAdded(state, action: PayloadAction<Toast>) {
      state.toasts = [...state.toasts.slice(-3), action.payload]
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const {
  listSelected,
  viewChanged,
  drawerOpened,
  drawerClosed,
  searchChanged,
  sortChanged,
  nodeToggled,
  nodeExpanded,
  sidebarToggled,
  listLoadChanged,
  newTaskOpened,
  newTaskClosed,
  toastAdded,
  toastDismissed,
} = uiSlice.actions
