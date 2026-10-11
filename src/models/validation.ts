import { appError } from './errors'
import type { AppError, ContainerType, ID, Priority, Snapshot } from './types'
import { PRIORITIES } from './types'

export const TITLE_MAX = 500
export const NAME_MAX = 80
export const DESCRIPTION_MAX = 10_000

/** workspace → space → folder → list. Lists hold tasks, never containers. */
export const PARENT_TYPE: Record<Exclude<ContainerType, 'workspace'>, ContainerType> = {
  space: 'workspace',
  folder: 'space',
  list: 'folder',
}

export const CHILD_TYPE: Partial<Record<ContainerType, ContainerType>> = {
  workspace: 'space',
  space: 'folder',
  folder: 'list',
}

export function validateTitle(title: string): AppError | null {
  const trimmed = title.trim()
  if (!trimmed) return appError('VALIDATION', 'Title is required.')
  if (trimmed.length > TITLE_MAX) return appError('VALIDATION', `Title must be ${TITLE_MAX} characters or fewer.`)
  return null
}

export function validateName(name: string): AppError | null {
  const trimmed = name.trim()
  if (!trimmed) return appError('VALIDATION', 'Name is required.')
  if (trimmed.length > NAME_MAX) return appError('VALIDATION', `Name must be ${NAME_MAX} characters or fewer.`)
  return null
}

export function validateDescription(description: string): AppError | null {
  return description.length > DESCRIPTION_MAX
    ? appError('VALIDATION', `Description must be ${DESCRIPTION_MAX.toLocaleString()} characters or fewer.`)
    : null
}

export function validatePriority(priority: string): AppError | null {
  return PRIORITIES.includes(priority as Priority) ? null : appError('VALIDATION', `Unknown priority “${priority}”.`)
}

export function validateDueDate(dueDate: string | null): AppError | null {
  if (dueDate === null) return null
  return Number.isNaN(Date.parse(dueDate)) ? appError('VALIDATION', 'Due date must be a valid ISO date.') : null
}

export function validateAssignees(snap: Snapshot, assigneeIds: ID[]): AppError | null {
  if (new Set(assigneeIds).size !== assigneeIds.length) return appError('VALIDATION', 'Assignees must be unique.')
  const unknown = assigneeIds.find((id) => !snap.users[id])
  return unknown ? appError('VALIDATION', `Unknown assignee “${unknown}”.`) : null
}

export function validateStatusForList(snap: Snapshot, statusId: ID, listId: ID): AppError | null {
  const status = snap.statuses[statusId]
  if (!status || status.listId !== listId) {
    return appError('INVALID_STATUS', 'That status does not belong to this list.')
  }
  return null
}

export function validateParent(snap: Snapshot, type: ContainerType, parentId: ID | null): AppError | null {
  if (type === 'workspace') return appError('INVALID_PARENT', 'Only one workspace is supported.')
  const parent = parentId ? snap.containers[parentId] : undefined
  if (!parent) return appError('INVALID_PARENT', 'Parent does not exist.')
  if (parent.archivedAt) return appError('INVALID_PARENT', `“${parent.name}” is archived.`)
  const expected = PARENT_TYPE[type]
  if (parent.type !== expected) {
    return appError('INVALID_PARENT', `A ${type} must live inside a ${expected}, not a ${parent.type}.`)
  }
  return null
}

/** Returns the first error, or null. Keeps call-sites flat. */
export function firstError(...checks: Array<AppError | null | (() => AppError | null)>): AppError | null {
  for (const check of checks) {
    const result = typeof check === 'function' ? check() : check
    if (result) return result
  }
  return null
}
