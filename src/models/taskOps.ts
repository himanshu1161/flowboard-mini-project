import { appError, fail, ok } from './errors'
import { byPosition, insertAt, reindex } from './ordering'
import { checkEditTasksInList, checkViewTask } from './permissions'
import type { ID, OpContext, Planned, Priority, Result, Snapshot, Status, Task, User } from './types'
import {
  firstError,
  validateAssignees,
  validateDescription,
  validateDueDate,
  validatePriority,
  validateStatusForList,
  validateTitle,
} from './validation'

/**
 * Pure task rules. Each `plan*` function validates against a snapshot and
 * returns the entity patch to apply — it never mutates anything.
 */

export function listStatuses(snap: Snapshot, listId: ID): Status[] {
  return Object.values(snap.statuses)
    .filter((s) => s.listId === listId)
    .sort(byPosition)
}

/** Top-level, non-deleted tasks in one kanban column, ordered. */
export function columnTasks(snap: Snapshot, listId: ID, statusId: ID, excludeId?: ID): Task[] {
  return Object.values(snap.tasks)
    .filter(
      (t) =>
        t.listId === listId && t.statusId === statusId && t.parentTaskId === null && !t.deletedAt && t.id !== excludeId,
    )
    .sort(byPosition)
}

export function subtasksOf(snap: Snapshot, parentId: ID): Task[] {
  return Object.values(snap.tasks)
    .filter((t) => t.parentTaskId === parentId && !t.deletedAt)
    .sort(byPosition)
}

/** Map a status onto the target list: same category first, else the list's first status. */
export function remapStatus(snap: Snapshot, statusId: ID, targetListId: ID): Status | undefined {
  const targetStatuses = listStatuses(snap, targetListId)
  const source = snap.statuses[statusId]
  return targetStatuses.find((s) => s.category === source?.category) ?? targetStatuses[0]
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateTaskInput {
  listId: ID
  title: string
  statusId?: ID
  priority?: Priority
  assigneeIds?: ID[]
  dueDate?: string | null
  description?: string
  parentTaskId?: ID | null
}

export function planCreateTask(
  snap: Snapshot,
  user: User,
  input: CreateTaskInput,
  ctx: OpContext,
): Result<Planned<Task>> {
  const access = checkEditTasksInList(snap, user, input.listId)
  if (access) return { error: access }

  const statuses = listStatuses(snap, input.listId)
  const statusId = input.statusId ?? statuses[0]?.id
  if (!statusId) return fail('INVALID_STATUS', 'This list has no statuses configured.')

  const parentTaskId = input.parentTaskId ?? null
  const error = firstError(
    validateTitle(input.title),
    validateDescription(input.description ?? ''),
    validatePriority(input.priority ?? 'none'),
    validateDueDate(input.dueDate ?? null),
    validateAssignees(snap, input.assigneeIds ?? []),
    validateStatusForList(snap, statusId, input.listId),
    () => (parentTaskId ? validateSubtaskParent(snap, parentTaskId, input.listId) : null),
  )
  if (error) return { error }

  const siblings = parentTaskId ? subtasksOf(snap, parentTaskId) : columnTasks(snap, input.listId, statusId)
  const task: Task = {
    id: ctx.newId('task'),
    listId: input.listId,
    parentTaskId,
    title: input.title.trim(),
    description: input.description ?? '',
    statusId,
    priority: input.priority ?? 'none',
    assigneeIds: input.assigneeIds ?? [],
    dueDate: input.dueDate ?? null,
    position: siblings.length,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    deletedAt: null,
  }
  return ok({ patch: { upsert: { tasks: [task] } }, value: task })
}

function validateSubtaskParent(snap: Snapshot, parentTaskId: ID, listId: ID) {
  const parent = snap.tasks[parentTaskId]
  if (!parent || parent.deletedAt) return appError('VALIDATION', 'Parent task does not exist.')
  if (parent.parentTaskId) return appError('VALIDATION', 'Subtasks can only be one level deep.')
  if (parent.listId !== listId) return appError('VALIDATION', 'A subtask must be in the same list as its parent.')
  return null
}

// ---------------------------------------------------------------------------
// Update fields
// ---------------------------------------------------------------------------

export type TaskChanges = Partial<Pick<Task, 'title' | 'description' | 'statusId' | 'priority' | 'assigneeIds' | 'dueDate'>>

export function planUpdateTask(
  snap: Snapshot,
  user: User,
  taskId: ID,
  changes: TaskChanges,
  ctx: OpContext,
  expectedUpdatedAt?: string,
): Result<Planned<Task>> {
  const access = checkViewTask(snap, user, taskId)
  if (access) return { error: access }
  const task = snap.tasks[taskId]

  if (expectedUpdatedAt && task.updatedAt !== expectedUpdatedAt) {
    return fail('CONFLICT', 'This task changed since you opened it. The latest version is now shown.')
  }

  const error = firstError(
    changes.title !== undefined ? validateTitle(changes.title) : null,
    changes.description !== undefined ? validateDescription(changes.description) : null,
    changes.priority !== undefined ? validatePriority(changes.priority) : null,
    changes.dueDate !== undefined ? validateDueDate(changes.dueDate) : null,
    changes.assigneeIds !== undefined ? validateAssignees(snap, changes.assigneeIds) : null,
    changes.statusId !== undefined ? validateStatusForList(snap, changes.statusId, task.listId) : null,
  )
  if (error) return { error }

  // A status change on a top-level task is a move to the end of the new column.
  if (changes.statusId !== undefined && changes.statusId !== task.statusId && task.parentTaskId === null) {
    const { statusId, ...rest } = changes
    const moved = planMoveTask(snap, user, taskId, { toStatusId: statusId }, ctx)
    if (moved.error) return moved
    const movedTask = moved.data.value
    const updated: Task = { ...movedTask, ...normalize(rest), updatedAt: ctx.now }
    const others = (moved.data.patch.upsert?.tasks ?? []).filter((t) => t.id !== taskId)
    return ok({ patch: { upsert: { tasks: [...others, updated] } }, value: updated })
  }

  const updated: Task = { ...task, ...normalize(changes), updatedAt: ctx.now }
  return ok({ patch: { upsert: { tasks: [updated] } }, value: updated })
}

function normalize(changes: TaskChanges): TaskChanges {
  return changes.title !== undefined ? { ...changes, title: changes.title.trim() } : changes
}

// ---------------------------------------------------------------------------
// Move (status column, position, and/or list)
// ---------------------------------------------------------------------------

export interface MoveTaskInput {
  toListId?: ID
  toStatusId?: ID
  /** Index within the target column. Defaults to the end. */
  toIndex?: number
}

export function planMoveTask(
  snap: Snapshot,
  user: User,
  taskId: ID,
  input: MoveTaskInput,
  ctx: OpContext,
): Result<Planned<Task>> {
  const access = checkViewTask(snap, user, taskId)
  if (access) return { error: access }
  const task = snap.tasks[taskId]

  const toListId = input.toListId ?? task.listId
  const listChanged = toListId !== task.listId
  if (listChanged) {
    if (task.parentTaskId) return fail('VALIDATION', 'Subtasks move together with their parent task.')
    const targetAccess = checkEditTasksInList(snap, user, toListId)
    if (targetAccess) return { error: targetAccess }
  }

  let toStatusId = input.toStatusId
  if (!toStatusId) {
    toStatusId = listChanged ? remapStatus(snap, task.statusId, toListId)?.id : task.statusId
  }
  if (!toStatusId) return fail('INVALID_STATUS', 'The target list has no statuses.')
  const statusError = validateStatusForList(snap, toStatusId, toListId)
  if (statusError) return { error: statusError }

  // Subtasks only carry status; their order is within the parent.
  if (task.parentTaskId) {
    const updated = { ...task, statusId: toStatusId, updatedAt: ctx.now }
    return ok({ patch: { upsert: { tasks: [updated] } }, value: updated })
  }

  const changed = new Map<ID, Task>()
  const sameColumn = !listChanged && toStatusId === task.statusId

  if (!sameColumn) {
    const source = columnTasks(snap, task.listId, task.statusId, task.id)
    reindex(source, (t, position) => ({ ...t, position })).forEach((t) => changed.set(t.id, t))
  }

  const target = columnTasks(snap, toListId, toStatusId, task.id)
  const moving: Task = { ...task, listId: toListId, statusId: toStatusId }
  const ordered = insertAt(target, moving, input.toIndex ?? target.length)
  ordered.forEach((t, position) => {
    if (t.id === task.id) {
      const nothingChanged = sameColumn && t.position === position
      if (!nothingChanged) changed.set(t.id, { ...t, position, updatedAt: ctx.now })
    } else if (t.position !== position) {
      changed.set(t.id, { ...t, position })
    }
  })

  if (listChanged) {
    for (const sub of subtasksOf(snap, task.id)) {
      const status = remapStatus(snap, sub.statusId, toListId)
      changed.set(sub.id, { ...sub, listId: toListId, statusId: status?.id ?? toStatusId, updatedAt: ctx.now })
    }
  }

  const value = changed.get(task.id) ?? task
  return ok({ patch: { upsert: { tasks: [...changed.values()] } }, value })
}

// ---------------------------------------------------------------------------
// Delete / restore (soft)
// ---------------------------------------------------------------------------

export function planDeleteTask(snap: Snapshot, user: User, taskId: ID, ctx: OpContext): Result<Planned<Task>> {
  const access = checkViewTask(snap, user, taskId)
  if (access) return { error: access }
  const task = snap.tasks[taskId]

  const deleted: Task = { ...task, deletedAt: ctx.now, updatedAt: ctx.now }
  const subtasks = subtasksOf(snap, task.id).map((s) => ({ ...s, deletedAt: ctx.now, updatedAt: ctx.now }))
  const siblings = task.parentTaskId
    ? subtasksOf(snap, task.parentTaskId).filter((t) => t.id !== task.id)
    : columnTasks(snap, task.listId, task.statusId, task.id)
  const reordered = reindex(siblings, (t, position) => ({ ...t, position }))

  return ok({ patch: { upsert: { tasks: [deleted, ...subtasks, ...reordered] } }, value: deleted })
}

export function planRestoreTask(snap: Snapshot, user: User, taskId: ID, ctx: OpContext): Result<Planned<Task>> {
  const task = snap.tasks[taskId]
  if (!task) return fail('NOT_FOUND', 'Task was not found.')
  if (!task.deletedAt) return ok({ patch: {}, value: task })
  const access = checkEditTasksInList(snap, user, task.listId)
  if (access) return { error: access }
  if (task.parentTaskId) {
    const parent = snap.tasks[task.parentTaskId]
    if (!parent || parent.deletedAt) return fail('VALIDATION', 'Restore the parent task first.')
  }

  const siblings = task.parentTaskId
    ? subtasksOf(snap, task.parentTaskId)
    : columnTasks(snap, task.listId, task.statusId)
  const restored: Task = {
    ...task,
    deletedAt: null,
    position: Math.min(task.position, siblings.length),
    updatedAt: ctx.now,
  }
  const reordered = reindex(insertAt(siblings, restored, restored.position), (t, position) => ({ ...t, position }))
  // Subtasks deleted together with the parent come back with it.
  const subtasks = Object.values(snap.tasks)
    .filter((t) => t.parentTaskId === task.id && t.deletedAt === task.deletedAt)
    .map((t) => ({ ...t, deletedAt: null, updatedAt: ctx.now }))

  const tasks = [restored, ...reordered.filter((t) => t.id !== restored.id), ...subtasks]
  return ok({ patch: { upsert: { tasks } }, value: restored })
}
