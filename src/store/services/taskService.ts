import {
  planCreateTask,
  planDeleteTask,
  planMoveTask,
  planRestoreTask,
  planUpdateTask,
  type CreateTaskInput,
  type MoveTaskInput,
  type TaskChanges,
} from '../../models/taskOps'
import type { ID } from '../../models/types'
import { runOp } from './runOp'

export const createTask = (input: CreateTaskInput) =>
  runOp((snap, user, ctx) => planCreateTask(snap, user, input, ctx))

export const updateTask = (taskId: ID, changes: TaskChanges, expectedUpdatedAt?: string) =>
  runOp((snap, user, ctx) => planUpdateTask(snap, user, taskId, changes, ctx, expectedUpdatedAt))

/** Drag-and-drop moves are optimistic and roll back if the request fails. */
export const moveTask = (taskId: ID, input: MoveTaskInput, options: { optimistic?: boolean } = { optimistic: true }) =>
  runOp((snap, user, ctx) => planMoveTask(snap, user, taskId, input, ctx), options)

export const deleteTask = (taskId: ID) => runOp((snap, user, ctx) => planDeleteTask(snap, user, taskId, ctx))

export const restoreTask = (taskId: ID) => runOp((snap, user, ctx) => planRestoreTask(snap, user, taskId, ctx))
