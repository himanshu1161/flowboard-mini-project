import { fail, notFound, ok } from './errors'
import { insertAt, reindex } from './ordering'
import { checkManageContainers, childrenOf } from './permissions'
import type {
  Container,
  ContainerType,
  GrantMode,
  ID,
  OpContext,
  Planned,
  Result,
  Snapshot,
  Status,
  User,
  Visibility,
} from './types'
import { firstError, validateName, validateParent } from './validation'

export const DEFAULT_STATUSES: Array<Pick<Status, 'name' | 'category' | 'color'>> = [
  { name: 'To do', category: 'todo', color: 'gray' },
  { name: 'In progress', category: 'in_progress', color: 'blue' },
  { name: 'Done', category: 'done', color: 'green' },
]

function duplicateName(snap: Snapshot, parentId: ID | null, name: string, exceptId?: ID) {
  const normalized = name.trim().toLowerCase()
  return Object.values(snap.containers).some(
    (c) => c.parentId === parentId && c.id !== exceptId && !c.archivedAt && c.name.trim().toLowerCase() === normalized,
  )
}

function getActive(snap: Snapshot, id: ID): Result<Container> {
  const container = snap.containers[id]
  if (!container) return { error: notFound('Container') }
  if (container.archivedAt) return fail('NOT_FOUND', `“${container.name}” is archived.`)
  return ok(container)
}

/** All descendant container ids (any depth). */
export function descendantsOf(snap: Snapshot, id: ID): Container[] {
  const out: Container[] = []
  const walk = (parentId: ID) => {
    for (const child of childrenOf(snap, parentId)) {
      out.push(child)
      walk(child.id)
    }
  }
  walk(id)
  return out
}

// ---------------------------------------------------------------------------

export interface CreateContainerInput {
  type: Exclude<ContainerType, 'workspace'>
  name: string
  parentId: ID
  visibility?: Visibility
}

export function planCreateContainer(
  snap: Snapshot,
  user: User,
  input: CreateContainerInput,
  ctx: OpContext,
): Result<Planned<Container>> {
  const error = firstError(
    checkManageContainers(user),
    validateName(input.name),
    validateParent(snap, input.type, input.parentId),
  )
  if (error) return { error }
  if (duplicateName(snap, input.parentId, input.name)) {
    return fail('CONFLICT', `A ${input.type} named “${input.name.trim()}” already exists here.`)
  }

  const container: Container = {
    id: ctx.newId(input.type),
    name: input.name.trim(),
    type: input.type,
    parentId: input.parentId,
    position: childrenOf(snap, input.parentId).length,
    visibility: input.visibility ?? 'public',
    archivedAt: null,
  }
  const statuses: Status[] =
    input.type === 'list'
      ? DEFAULT_STATUSES.map((s, position) => ({ ...s, id: ctx.newId('status'), listId: container.id, position }))
      : []
  return ok({ patch: { upsert: { containers: [container], statuses } }, value: container })
}

export function planRenameContainer(snap: Snapshot, user: User, id: ID, name: string): Result<Planned<Container>> {
  const found = getActive(snap, id)
  if (found.error) return found
  const error = firstError(checkManageContainers(user), validateName(name))
  if (error) return { error }
  const container = found.data
  if (duplicateName(snap, container.parentId, name, id)) {
    return fail('CONFLICT', `A ${container.type} named “${name.trim()}” already exists here.`)
  }
  const updated = { ...container, name: name.trim() }
  return ok({ patch: { upsert: { containers: [updated] } }, value: updated })
}

/** Reorder among siblings. Re-parenting is intentionally not supported. */
export function planReorderContainer(
  snap: Snapshot,
  user: User,
  id: ID,
  toIndex: number,
): Result<Planned<Container>> {
  const found = getActive(snap, id)
  if (found.error) return found
  const denied = checkManageContainers(user)
  if (denied) return { error: denied }
  const container = found.data
  if (container.parentId === null) return fail('INVALID_PARENT', 'The workspace cannot be reordered.')

  const siblings = childrenOf(snap, container.parentId).filter((c) => !c.archivedAt)
  const ordered = insertAt(siblings, container, toIndex)
  const changed = reindex(ordered, (c, position) => ({ ...c, position }))
  const value = changed.find((c) => c.id === id) ?? container
  return ok({ patch: { upsert: { containers: changed } }, value })
}

export function planArchiveContainer(snap: Snapshot, user: User, id: ID, ctx: OpContext): Result<Planned<Container>> {
  const found = getActive(snap, id)
  if (found.error) return found
  const denied = checkManageContainers(user)
  if (denied) return { error: denied }
  if (found.data.type === 'workspace') return fail('INVALID_PARENT', 'The workspace cannot be archived.')
  // Only the node itself is stamped; descendants are hidden via the ancestor chain,
  // so restoring brings the whole subtree back exactly as it was.
  const updated = { ...found.data, archivedAt: ctx.now }
  return ok({ patch: { upsert: { containers: [updated] } }, value: updated })
}

export function planRestoreContainer(snap: Snapshot, user: User, id: ID): Result<Planned<Container>> {
  const container = snap.containers[id]
  if (!container) return { error: notFound('Container') }
  const denied = checkManageContainers(user)
  if (denied) return { error: denied }
  const parent = container.parentId ? snap.containers[container.parentId] : undefined
  if (parent?.archivedAt) return fail('INVALID_PARENT', `Restore “${parent.name}” first.`)
  if (duplicateName(snap, container.parentId, container.name, id)) {
    return fail('CONFLICT', `Another ${container.type} named “${container.name}” now exists here. Rename it first.`)
  }
  // Put it back where it was (clamped), shifting the active siblings around it.
  const siblings = container.parentId ? childrenOf(snap, container.parentId).filter((c) => !c.archivedAt && c.id !== id) : []
  const restored = { ...container, archivedAt: null }
  const ordered = insertAt(siblings, restored, Math.min(container.position, siblings.length))
  const changed = reindex(ordered, (c, position) => ({ ...c, position }))
  const value = changed.find((c) => c.id === id) ?? restored
  if (!changed.some((c) => c.id === id)) changed.push(restored)
  return ok({ patch: { upsert: { containers: changed } }, value })
}

export function planSetVisibility(
  snap: Snapshot,
  user: User,
  id: ID,
  visibility: Visibility,
): Result<Planned<Container>> {
  const found = getActive(snap, id)
  if (found.error) return found
  const denied = checkManageContainers(user)
  if (denied) return { error: denied }
  if (found.data.type === 'workspace') return fail('VALIDATION', 'The workspace is always visible to its members.')
  const updated = { ...found.data, visibility }
  return ok({ patch: { upsert: { containers: [updated] } }, value: updated })
}

/** Set (or clear with `null`) a member's grant on a container. */
export function planSetGrant(
  snap: Snapshot,
  user: User,
  resourceId: ID,
  userId: ID,
  mode: GrantMode | null,
  ctx: OpContext,
): Result<Planned<null>> {
  const found = getActive(snap, resourceId)
  if (found.error) return found
  const denied = checkManageContainers(user)
  if (denied) return { error: denied }
  if (found.data.type === 'workspace') return fail('VALIDATION', 'Grants attach to spaces, folders or lists.')
  const target = snap.users[userId]
  if (!target) return fail('NOT_FOUND', 'User was not found.')
  if (target.role === 'admin') return fail('VALIDATION', `${target.name} is an admin and already has full access.`)

  const existing = Object.values(snap.grants).filter((g) => g.resourceId === resourceId && g.userId === userId)
  const remove = existing.map((g) => g.id)
  const upsert = mode ? [{ id: existing[0]?.id ?? ctx.newId('grant'), resourceId, userId, mode }] : []
  return ok({
    patch: { upsert: { grants: upsert }, remove: { grants: remove.filter((id) => !upsert.some((g) => g.id === id)) } },
    value: null,
  })
}
