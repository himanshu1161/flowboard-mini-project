import { createSelector } from '@reduxjs/toolkit'
import { compareTasks } from '../models/ordering'
import {
  checkViewList,
  checkViewTask,
  canViewContainer,
  ancestry,
  visibleTree,
  canManageContainers,
} from '../models/permissions'
import { WORKSPACE_ID } from '../models/seed'
import { columnTasks, listStatuses, subtasksOf } from '../models/taskOps'
import type { Container, ID, Result, Snapshot, Status, Task, User } from '../models/types'
import type { RootState } from './index'

/**
 * Selectors are permission-aware: every read of containers or tasks goes
 * through the same checks the mutations use, so the UI can never render
 * something the current user is not allowed to see.
 */

export const selectSnapshot = createSelector(
  [
    (s: RootState) => s.users,
    (s: RootState) => s.containers,
    (s: RootState) => s.statuses,
    (s: RootState) => s.tasks,
    (s: RootState) => s.grants,
  ],
  (users, containers, statuses, tasks, grants): Snapshot => ({ users, containers, statuses, tasks, grants }),
)

export const selectUsers = createSelector([(s: RootState) => s.users], (users) => Object.values(users))

export const selectCurrentUser = (s: RootState): User => s.users[s.session.currentUserId] ?? Object.values(s.users)[0]

export const selectIsAdmin = (s: RootState) => canManageContainers(selectCurrentUser(s))

export const selectWorkspace = (s: RootState): Container | undefined => s.containers[WORKSPACE_ID]

export const selectVisibleTree = createSelector([selectSnapshot, selectCurrentUser], (snap, user) =>
  visibleTree(snap, user, WORKSPACE_ID),
)

/** Lists the user can see, with their breadcrumb path — used for "Move to list". */
export const selectVisibleLists = createSelector([selectSnapshot, selectCurrentUser], (snap, user) =>
  Object.values(snap.containers)
    .filter((c) => c.type === 'list' && canViewContainer(snap, user, c.id))
    .map((list) => ({
      list,
      path: (ancestry(snap, list.id) ?? [])
        .filter((c) => c.type !== 'workspace' && c.id !== list.id)
        .map((c) => c.name),
    }))
    .sort((a, b) => [...a.path, a.list.name].join('/').localeCompare([...b.path, b.list.name].join('/'))),
)

export const selectArchivedContainers = createSelector([selectSnapshot, selectCurrentUser], (snap, user) =>
  canManageContainers(user) ? Object.values(snap.containers).filter((c) => c.archivedAt !== null) : [],
)

const NO_LIST: Result<Container> = { error: { code: 'NOT_FOUND', message: 'No list selected.', status: 404 } }

export const selectListAccess = createSelector(
  [selectSnapshot, selectCurrentUser, (_s: RootState, listId: ID | null) => listId],
  (snap, user, listId): Result<Container> => {
    if (!listId) return NO_LIST
    const error = checkViewList(snap, user, listId)
    return error ? { error } : { data: snap.containers[listId] }
  },
)

export const selectBreadcrumb = createSelector(
  [selectSnapshot, (_s: RootState, listId: ID | null) => listId],
  (snap, listId): Container[] =>
    listId ? (ancestry(snap, listId) ?? []).filter((c) => c.type !== 'workspace') : [],
)

export const selectListStatuses = createSelector(
  [selectSnapshot, (_s: RootState, listId: ID | null) => listId],
  (snap, listId): Status[] => (listId ? listStatuses(snap, listId) : []),
)

function matchesSearch(task: Task, query: string) {
  if (!query) return true
  const q = query.toLowerCase()
  return task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q)
}

export interface BoardColumn {
  status: Status
  tasks: Task[]
}

/** Kanban columns for a list — empty when the user cannot see the list. */
export const selectBoardColumns = createSelector(
  [
    selectSnapshot,
    selectCurrentUser,
    (s: RootState) => s.ui.search,
    (_s: RootState, listId: ID | null) => listId,
  ],
  (snap, user, search, listId): BoardColumn[] => {
    if (!listId || checkViewList(snap, user, listId)) return []
    return listStatuses(snap, listId).map((status) => ({
      status,
      tasks: columnTasks(snap, listId, status.id).filter((t) => matchesSearch(t, search)),
    }))
  },
)

/** Rows for the list view, sorted by the current sort key. */
export const selectListRows = createSelector(
  [
    selectSnapshot,
    selectCurrentUser,
    (s: RootState) => s.ui.search,
    (s: RootState) => s.ui.sort,
    (_s: RootState, listId: ID | null) => listId,
  ],
  (snap, user, search, sort, listId): Task[] => {
    if (!listId || checkViewList(snap, user, listId)) return []
    const statusOrder = new Map(listStatuses(snap, listId).map((s) => [s.id, s.position]))
    return Object.values(snap.tasks)
      .filter((t) => t.listId === listId && t.parentTaskId === null && !t.deletedAt && matchesSearch(t, search))
      .sort((a, b) =>
        sort.key === 'manual'
          ? (statusOrder.get(a.statusId) ?? 0) - (statusOrder.get(b.statusId) ?? 0) || a.position - b.position
          : compareTasks(sort.key, sort.dir)(a, b),
      )
  },
)

export const selectListTaskCount = createSelector(
  [selectSnapshot, (_s: RootState, listId: ID | null) => listId],
  (snap, listId) =>
    listId
      ? Object.values(snap.tasks).filter((t) => t.listId === listId && !t.parentTaskId && !t.deletedAt).length
      : 0,
)

const NO_TASK: Result<Task> = { error: { code: 'NOT_FOUND', message: 'No task selected.', status: 404 } }

export const selectTaskAccess = createSelector(
  [selectSnapshot, selectCurrentUser, (_s: RootState, taskId: ID | null) => taskId],
  (snap, user, taskId): Result<Task> => {
    if (!taskId) return NO_TASK
    const error = checkViewTask(snap, user, taskId)
    return error ? { error } : { data: snap.tasks[taskId] }
  },
)

export const selectSubtasks = createSelector(
  [selectSnapshot, (_s: RootState, taskId: ID | null) => taskId],
  (snap, taskId): Task[] => (taskId ? subtasksOf(snap, taskId) : []),
)

/** Subtask counts per parent id, for card badges. */
export const selectSubtaskStats = createSelector([(s: RootState) => s.tasks, (s: RootState) => s.statuses], (tasks, statuses) => {
  const stats: Record<ID, { done: number; total: number }> = {}
  for (const t of Object.values(tasks)) {
    if (!t.parentTaskId || t.deletedAt) continue
    const entry = (stats[t.parentTaskId] ??= { done: 0, total: 0 })
    entry.total += 1
    if (statuses[t.statusId]?.category === 'done') entry.done += 1
  }
  return stats
})
