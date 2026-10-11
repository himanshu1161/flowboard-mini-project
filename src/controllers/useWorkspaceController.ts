import { useCallback, useEffect } from 'react'
import type { SortKey } from '../models/ordering'
import type { CreateTaskInput } from '../models/taskOps'
import type { ID } from '../models/types'
import { useAppDispatch, useAppSelector } from '../store'
import {
  selectBreadcrumb,
  selectListAccess,
  selectListRows,
  selectListStatuses,
  selectListTaskCount,
  selectSubtaskStats,
  selectUsers,
  selectVisibleLists,
} from '../store/selectors'
import { bootstrap, openList } from '../store/services/loadService'
import { createTask } from '../store/services/taskService'
import {
  drawerOpened,
  listSelected,
  newTaskClosed,
  newTaskOpened,
  searchChanged,
  sidebarToggled,
  sortChanged,
  viewChanged,
  type ViewMode,
} from '../store/slices/ui'
import { useRun } from './useToast'

/** Boot sequence: simulated fetch, then open the remembered list (or the first visible one). */
export function useBootstrap() {
  const dispatch = useAppDispatch()
  const ready = useAppSelector((s) => s.session.ready)
  const selectedListId = useAppSelector((s) => s.ui.selectedListId)
  const firstList = useAppSelector((s) => selectVisibleLists(s)[0]?.list.id ?? null)

  useEffect(() => {
    void dispatch(bootstrap())
  }, [dispatch])

  useEffect(() => {
    if (!ready) return
    const target = selectedListId ?? firstList
    if (target) void dispatch(openList(target))
    // Only on first ready — later selection changes go through openList directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])
}

/** State + actions for the main content area (header, board/list switcher, list view). */
export function useWorkspaceController() {
  const dispatch = useAppDispatch()
  const run = useRun()
  const selectedListId = useAppSelector((s) => s.ui.selectedListId)
  const view = useAppSelector((s) => s.ui.view)
  const search = useAppSelector((s) => s.ui.search)
  const sort = useAppSelector((s) => s.ui.sort)
  const listLoad = useAppSelector((s) => s.ui.listLoad)
  const ready = useAppSelector((s) => s.session.ready)
  const access = useAppSelector((s) => selectListAccess(s, selectedListId))
  const breadcrumb = useAppSelector((s) => selectBreadcrumb(s, selectedListId))
  const statuses = useAppSelector((s) => selectListStatuses(s, selectedListId))
  const rows = useAppSelector((s) => selectListRows(s, selectedListId))
  const taskCount = useAppSelector((s) => selectListTaskCount(s, selectedListId))
  const users = useAppSelector(selectUsers)
  const subtaskStats = useAppSelector(selectSubtaskStats)
  const firstVisibleList = useAppSelector((s) => selectVisibleLists(s)[0]?.list ?? null)
  const newTask = useAppSelector((s) => s.ui.newTask)

  const loading = !ready || (listLoad.listId === selectedListId && listLoad.status === 'loading')
  const loadError = listLoad.listId === selectedListId && listLoad.status === 'error' ? listLoad.error : null

  const setView = useCallback((v: ViewMode) => dispatch(viewChanged(v)), [dispatch])
  const setSearch = useCallback((q: string) => dispatch(searchChanged(q)), [dispatch])
  const setSort = useCallback((key: SortKey) => dispatch(sortChanged(key)), [dispatch])
  const openTask = useCallback((id: ID) => dispatch(drawerOpened(id)), [dispatch])
  const retry = useCallback(() => selectedListId && void dispatch(openList(selectedListId)), [dispatch, selectedListId])
  const goTo = useCallback((listId: ID) => void dispatch(openList(listId)), [dispatch])
  const clearSelection = useCallback(() => dispatch(listSelected(null)), [dispatch])
  const toggleSidebar = useCallback(() => dispatch(sidebarToggled()), [dispatch])
  const openNewTask = useCallback((statusId: ID | null = null) => dispatch(newTaskOpened(statusId)), [dispatch])
  const closeNewTask = useCallback(() => dispatch(newTaskClosed()), [dispatch])

  const addTask = useCallback(
    (input: Omit<CreateTaskInput, 'listId'>, options: { toast?: boolean } = {}) => {
      if (!selectedListId) return Promise.resolve(undefined)
      return run(() => createTask({ ...input, listId: selectedListId }), {
        success: options.toast ? (t) => `“${truncate(t.title)}” created` : undefined,
        successAction: options.toast ? (t) => ({ label: 'Open', onClick: () => dispatch(drawerOpened(t.id)) }) : undefined,
      })
    },
    [selectedListId, run, dispatch],
  )

  return {
    selectedListId,
    view,
    search,
    sort,
    loading,
    loadError,
    access,
    breadcrumb,
    statuses,
    rows,
    taskCount,
    users,
    subtaskStats,
    firstVisibleList,
    newTask,
    setView,
    setSearch,
    setSort,
    openTask,
    retry,
    goTo,
    clearSelection,
    toggleSidebar,
    openNewTask,
    closeNewTask,
    addTask,
  }
}

export type WorkspaceController = ReturnType<typeof useWorkspaceController>

function truncate(s: string, n = 40) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
