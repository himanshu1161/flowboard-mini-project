export type ID = string

// ---------------------------------------------------------------------------
// Users & permissions
// ---------------------------------------------------------------------------

export type Role = 'admin' | 'member'

export interface User {
  id: ID
  name: string
  email: string
  role: Role
  /** Tailwind background class token used for the avatar. */
  color: AvatarColor
}

export type AvatarColor = 'indigo' | 'amber' | 'emerald' | 'rose' | 'sky'

export type GrantMode = 'allow' | 'deny'

export interface Grant {
  id: ID
  resourceId: ID
  userId: ID
  mode: GrantMode
}

// ---------------------------------------------------------------------------
// Hierarchy
// ---------------------------------------------------------------------------

export type ContainerType = 'workspace' | 'space' | 'folder' | 'list'
export type Visibility = 'public' | 'private'

export interface Container {
  id: ID
  name: string
  type: ContainerType
  parentId: ID | null
  position: number
  visibility: Visibility
  /** Soft-archive marker. Archived containers (and their subtree) are hidden. */
  archivedAt: string | null
}

// ---------------------------------------------------------------------------
// Statuses & tasks
// ---------------------------------------------------------------------------

export type StatusCategory = 'todo' | 'in_progress' | 'done'
export type StatusColor = 'gray' | 'blue' | 'violet' | 'amber' | 'green' | 'red'

export interface Status {
  id: ID
  listId: ID
  name: string
  category: StatusCategory
  color: StatusColor
  position: number
}

export type Priority = 'urgent' | 'high' | 'normal' | 'low' | 'none'
export const PRIORITIES: Priority[] = ['urgent', 'high', 'normal', 'low', 'none']

export interface Task {
  id: ID
  /** The task's primary list (a.k.a. primaryListId). */
  listId: ID
  /** One level of subtasks only. */
  parentTaskId: ID | null
  title: string
  description: string
  statusId: ID
  priority: Priority
  assigneeIds: ID[]
  dueDate: string | null
  /** Order within its status column. */
  position: number
  createdAt: string
  updatedAt: string
  /** Soft-delete marker (enables "Undo"). */
  deletedAt: string | null
}

// ---------------------------------------------------------------------------
// Results & errors — every store operation resolves to this shape
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'INVALID_PARENT'
  | 'INVALID_STATUS'
  | 'CONFLICT'
  | 'NETWORK'

export interface AppError {
  code: ErrorCode
  message: string
  /** HTTP-ish status, purely informational (403, 404, 409, 422, 503). */
  status: number
}

export type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: AppError }

// ---------------------------------------------------------------------------
// Snapshot of all entities — the input to every domain rule
// ---------------------------------------------------------------------------

export interface Snapshot {
  users: Record<ID, User>
  containers: Record<ID, Container>
  statuses: Record<ID, Status>
  tasks: Record<ID, Task>
  grants: Record<ID, Grant>
}

/** A set of entity changes produced by a domain operation and applied by reducers. */
export interface Patch {
  upsert?: {
    containers?: Container[]
    statuses?: Status[]
    tasks?: Task[]
    grants?: Grant[]
  }
  remove?: {
    containers?: ID[]
    statuses?: ID[]
    tasks?: ID[]
    grants?: ID[]
  }
}

/** Domain operations return the patch to apply plus a value for the caller. */
export interface Planned<T> {
  patch: Patch
  value: T
}

/** Injected clock + id generator so domain rules stay pure and testable. */
export interface OpContext {
  now: string
  newId: (prefix: string) => ID
}
