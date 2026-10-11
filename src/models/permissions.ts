import { appError, forbidden, notFound } from './errors'
import type { AppError, Container, Grant, ID, Snapshot, Task, User } from './types'

/**
 * Permission model
 * ----------------
 * - Admins bypass every check.
 * - Members resolve visibility top-down from the workspace root:
 *   - a `deny` grant on a node (or any ancestor) hides that whole subtree;
 *   - an `allow` grant is inherited by descendants;
 *   - a `private` node is only visible with an inherited or direct `allow`.
 * - Archived nodes (or nodes under an archived ancestor) are hidden for everyone
 *   in normal views; admins can see them in the Archive panel.
 * - Members may view and edit tasks in lists they can see.
 * - Container management (create / rename / reorder / archive / share) is admin-only.
 */

export function findGrant(snap: Snapshot, resourceId: ID, userId: ID): Grant | undefined {
  for (const grant of Object.values(snap.grants)) {
    if (grant.resourceId === resourceId && grant.userId === userId) return grant
  }
  return undefined
}

/** Root → node chain (inclusive). Returns null if the chain is broken. */
export function ancestry(snap: Snapshot, id: ID): Container[] | null {
  const chain: Container[] = []
  const seen = new Set<ID>()
  let current: Container | undefined = snap.containers[id]
  while (current) {
    if (seen.has(current.id)) return null // cycle guard
    seen.add(current.id)
    chain.unshift(current)
    if (current.parentId === null) return chain
    current = snap.containers[current.parentId]
  }
  return null
}

export function isArchived(snap: Snapshot, id: ID): boolean {
  const chain = ancestry(snap, id)
  return !chain || chain.some((c) => c.archivedAt !== null)
}

function memberCanSee(snap: Snapshot, user: User, chain: Container[]): boolean {
  let inheritedAllow = false
  for (const node of chain) {
    if (node.type === 'workspace') continue
    const grant = findGrant(snap, node.id, user.id)
    if (grant?.mode === 'deny') return false
    if (grant?.mode === 'allow') inheritedAllow = true
    if (node.visibility === 'private' && !inheritedAllow) return false
  }
  return true
}

/** Raw visibility, ignoring archive state. */
export function hasAccess(snap: Snapshot, user: User, containerId: ID): boolean {
  const chain = ancestry(snap, containerId)
  if (!chain) return false
  if (user.role === 'admin') return true
  return memberCanSee(snap, user, chain)
}

export function canViewContainer(snap: Snapshot, user: User, containerId: ID): boolean {
  return hasAccess(snap, user, containerId) && !isArchived(snap, containerId)
}

/** `null` when the user can view the container; otherwise a 403/404 error. */
export function checkViewContainer(snap: Snapshot, user: User, containerId: ID): AppError | null {
  const container = snap.containers[containerId]
  if (!container) return notFound('Container')
  if (!hasAccess(snap, user, containerId)) return forbidden(`“${container.name}”`)
  if (isArchived(snap, containerId)) return appError('NOT_FOUND', `“${container.name}” has been archived.`)
  return null
}

export function checkViewList(snap: Snapshot, user: User, listId: ID): AppError | null {
  const list = snap.containers[listId]
  if (!list || list.type !== 'list') return notFound('List')
  return checkViewContainer(snap, user, listId)
}

/** Members can edit tasks in any list they can see. */
export function checkEditTasksInList(snap: Snapshot, user: User, listId: ID): AppError | null {
  return checkViewList(snap, user, listId)
}

export function checkViewTask(snap: Snapshot, user: User, taskId: ID): AppError | null {
  const task = snap.tasks[taskId]
  if (!task || task.deletedAt) return notFound('Task')
  return checkViewList(snap, user, task.listId)
}

export function canManageContainers(user: User): boolean {
  return user.role === 'admin'
}

export function checkManageContainers(user: User): AppError | null {
  return canManageContainers(user) ? null : forbidden('workspace settings — only admins can change the hierarchy')
}

export function visibleTaskFilter(snap: Snapshot, user: User) {
  const cache = new Map<ID, boolean>()
  return (task: Task) => {
    if (task.deletedAt) return false
    let allowed = cache.get(task.listId)
    if (allowed === undefined) {
      allowed = canViewContainer(snap, user, task.listId)
      cache.set(task.listId, allowed)
    }
    return allowed
  }
}

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

export interface TreeNode {
  container: Container
  children: TreeNode[]
}

export function childrenOf(snap: Snapshot, parentId: ID): Container[] {
  return Object.values(snap.containers)
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.position - b.position)
}

/** The workspace tree as seen by `user` — hidden and archived nodes are pruned. */
export function visibleTree(snap: Snapshot, user: User, rootId: ID): TreeNode[] {
  const build = (parentId: ID, parentChain: Container[]): TreeNode[] =>
    childrenOf(snap, parentId)
      .filter((c) => c.archivedAt === null)
      .filter((c) => user.role === 'admin' || memberCanSee(snap, user, [...parentChain, c]))
      .map((c) => ({ container: c, children: c.type === 'list' ? [] : build(c.id, [...parentChain, c]) }))
  const root = snap.containers[rootId]
  return root ? build(rootId, [root]) : []
}
