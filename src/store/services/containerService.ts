import {
  planArchiveContainer,
  planCreateContainer,
  planRenameContainer,
  planReorderContainer,
  planRestoreContainer,
  planSetGrant,
  planSetVisibility,
  type CreateContainerInput,
} from '../../models/containerOps'
import type { GrantMode, ID, Visibility } from '../../models/types'
import { runOp } from './runOp'

export const createContainer = (input: CreateContainerInput) =>
  runOp((snap, user, ctx) => planCreateContainer(snap, user, input, ctx))

export const renameContainer = (id: ID, name: string) => runOp((snap, user) => planRenameContainer(snap, user, id, name))

/** Sidebar drag-reorder is optimistic. */
export const reorderContainer = (id: ID, toIndex: number) =>
  runOp((snap, user) => planReorderContainer(snap, user, id, toIndex), { optimistic: true })

export const archiveContainer = (id: ID) => runOp((snap, user, ctx) => planArchiveContainer(snap, user, id, ctx))

export const restoreContainer = (id: ID) => runOp((snap, user) => planRestoreContainer(snap, user, id))

export const setVisibility = (id: ID, visibility: Visibility) =>
  runOp((snap, user) => planSetVisibility(snap, user, id, visibility))

export const setGrant = (resourceId: ID, userId: ID, mode: GrantMode | null) =>
  runOp((snap, user, ctx) => planSetGrant(snap, user, resourceId, userId, mode, ctx))
