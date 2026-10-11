import { useCallback, useMemo, useState } from 'react'
import type { ID, Priority, Task } from '../models/types'
import { useAppDispatch } from '../store'
import { deleteTask, moveTask, restoreTask, updateTask } from '../store/services/taskService'
import { drawerOpened } from '../store/slices/ui'
import { useRun } from './useToast'

/** Quick actions shared by kanban cards and list rows (same behavior in both views). */
export function useTaskActions() {
  const dispatch = useAppDispatch()
  const run = useRun()
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)

  const open = useCallback((id: ID) => dispatch(drawerOpened(id)), [dispatch])
  const setPriority = useCallback(
    (id: ID, priority: Priority) => void run(() => updateTask(id, { priority })),
    [run],
  )
  const setStatus = useCallback((id: ID, statusId: ID) => void run(() => moveTask(id, { toStatusId: statusId })), [run])
  const remove = useCallback((task: Task) => setPendingDelete(task), [])

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    setDeleting(true)
    await run(() => deleteTask(pendingDelete.id), {
      success: 'Task deleted',
      successAction: (t) => ({ label: 'Undo', onClick: () => void run(() => restoreTask(t.id), { success: 'Task restored' }) }),
    })
    setDeleting(false)
    setPendingDelete(null)
  }, [pendingDelete, run])

  const actions = useMemo(() => ({ open, setPriority, setStatus, remove }), [open, setPriority, setStatus, remove])

  return {
    actions,
    pendingDelete,
    deleting,
    confirmDelete,
    cancelDelete: () => setPendingDelete(null),
  }
}
