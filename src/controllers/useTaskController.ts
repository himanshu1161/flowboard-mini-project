import { useCallback, useMemo, useRef, useState } from 'react'
import { useStore } from 'react-redux'
import type { TaskChanges } from '../models/taskOps'
import type { ID, Result, Task } from '../models/types'
import { useAppDispatch, useAppSelector, type RootState } from '../store'
import {
  selectListStatuses,
  selectSubtasks,
  selectTaskAccess,
  selectUsers,
  selectVisibleLists,
} from '../store/selectors'
import { openList } from '../store/services/loadService'
import { createTask, deleteTask, moveTask, restoreTask, updateTask } from '../store/services/taskService'
import { drawerClosed, drawerOpened } from '../store/slices/ui'
import { useRun, useToast } from './useToast'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Task drawer controller. Field edits are queued so rapid changes never race:
 * each request is sent with the version (`updatedAt`) current at send time,
 * and the store rejects it with CONFLICT if the task changed in between.
 */
export function useTaskController(taskId: ID | null) {
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()
  const run = useRun()
  const toast = useToast()

  const access = useAppSelector((s) => selectTaskAccess(s, taskId))
  const task = access.data ?? null
  const statuses = useAppSelector((s) => selectListStatuses(s, task?.listId ?? null))
  const subtasks = useAppSelector((s) => selectSubtasks(s, task?.id ?? null))
  const parent = useAppSelector((s) => (task?.parentTaskId ? s.tasks[task.parentTaskId] ?? null : null))
  const users = useAppSelector(selectUsers)
  const lists = useAppSelector(selectVisibleLists)

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  const enqueue = useCallback(<T,>(work: () => Promise<Result<T>>): Promise<Result<T>> => {
    const next = queue.current.then(work)
    queue.current = next.catch(() => undefined)
    return next
  }, [])

  const update = useCallback(
    (changes: TaskChanges) => {
      if (!taskId) return Promise.resolve(undefined)
      setSaveState('saving')
      return enqueue(async () => {
        const expected = store.getState().tasks[taskId]?.updatedAt
        const result = await run(() => updateTask(taskId, changes, expected))
        setSaveState(result.error ? 'error' : 'saved')
        return result
      })
    },
    [taskId, enqueue, store, run],
  )

  const moveToList = useCallback(
    async (listId: ID) => {
      if (!task) return
      const target = lists.find((l) => l.list.id === listId)?.list
      setSaveState('saving')
      const result = await enqueue(() =>
        run(() => moveTask(task.id, { toListId: listId }, { optimistic: false }), {
          success: `Moved to ${target?.name ?? 'list'}`,
          successAction: () => ({ label: 'Open list', onClick: () => void dispatch(openList(listId)) }),
        }),
      )
      setSaveState(result.error ? 'error' : 'saved')
    },
    [task, lists, enqueue, run, dispatch],
  )

  const remove = useCallback(async () => {
    if (!task) return
    const result = await run(() => deleteTask(task.id), {
      success: task.parentTaskId ? 'Subtask deleted' : 'Task deleted',
      successAction: (deleted) => ({
        label: 'Undo',
        onClick: () =>
          void run(() => restoreTask(deleted.id), { success: 'Task restored' }).then((r) => {
            if (r.data && !r.data.parentTaskId) dispatch(drawerOpened(r.data.id))
          }),
      }),
    })
    if (result.data) {
      if (task.parentTaskId) dispatch(drawerOpened(task.parentTaskId))
      else dispatch(drawerClosed())
    }
    return result
  }, [task, run, dispatch])

  const addSubtask = useCallback(
    (title: string) => {
      if (!task) return Promise.resolve(undefined)
      return run(() => createTask({ listId: task.listId, title, parentTaskId: task.id }))
    },
    [task, run],
  )

  const doneStatus = useMemo(() => statuses.find((s) => s.category === 'done'), [statuses])
  const todoStatus = useMemo(() => statuses.find((s) => s.category === 'todo') ?? statuses[0], [statuses])
  const isDone = useCallback(
    (t: Task) => statuses.find((s) => s.id === t.statusId)?.category === 'done',
    [statuses],
  )

  const toggleSubtask = useCallback(
    (sub: Task) => {
      const target = isDone(sub) ? todoStatus : doneStatus
      if (!target) return
      void run(() => updateTask(sub.id, { statusId: target.id }))
    },
    [isDone, todoStatus, doneStatus, run],
  )

  const open = useCallback((id: ID) => dispatch(drawerOpened(id)), [dispatch])
  const close = useCallback(() => dispatch(drawerClosed()), [dispatch])

  return {
    access,
    task,
    statuses,
    subtasks,
    parent,
    users,
    lists,
    saveState,
    update,
    moveToList,
    remove,
    addSubtask,
    toggleSubtask,
    isDone,
    open,
    close,
    notify: toast,
  }
}
