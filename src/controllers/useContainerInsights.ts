import { useMemo } from 'react'
import { descendantsOf } from '../models/containerOps'
import { canViewContainer, findGrant } from '../models/permissions'
import type { Container, GrantMode, ID, User } from '../models/types'
import { useAppSelector } from '../store'
import { selectListTaskCount, selectSnapshot, selectUsers } from '../store/selectors'

/** What archiving a container will hide — shown in the confirmation dialog. */
export function useArchiveSummary(container: Container | null) {
  const snap = useAppSelector(selectSnapshot)
  return useMemo(() => {
    if (!container) return { lists: 0, tasks: 0 }
    const lists = [container, ...descendantsOf(snap, container.id)].filter((c) => c.type === 'list')
    const listIds = new Set(lists.map((l) => l.id))
    const tasks = Object.values(snap.tasks).filter((t) => listIds.has(t.listId) && !t.deletedAt && !t.parentTaskId).length
    return { lists: lists.length, tasks }
  }, [snap, container])
}

export interface MemberAccess {
  user: User
  grant: GrantMode | null
  canView: boolean
}

/** Per-member grant + effective visibility, for the sharing dialog. */
export function useMemberAccess(containerId: ID | null): MemberAccess[] {
  const snap = useAppSelector(selectSnapshot)
  const users = useAppSelector(selectUsers)
  return useMemo(() => {
    if (!containerId) return []
    return users
      .filter((u) => u.role !== 'admin')
      .map((user) => ({
        user,
        grant: findGrant(snap, containerId, user.id)?.mode ?? null,
        canView: canViewContainer(snap, user, containerId),
      }))
  }, [snap, users, containerId])
}

export function useListTaskCount(listId: ID) {
  return useAppSelector((s) => selectListTaskCount(s, listId))
}

export function useContainer(id: ID | null) {
  return useAppSelector((s) => (id ? s.containers[id] ?? null : null))
}
