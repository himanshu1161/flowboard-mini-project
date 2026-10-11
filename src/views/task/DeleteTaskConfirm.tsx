import type { Task } from '../../models/types'
import { ConfirmDialog } from '../common/Modal'

export function DeleteTaskConfirm({
  task,
  loading,
  onConfirm,
  onClose,
}: {
  task: Task | null
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <ConfirmDialog
      open={!!task}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      title="Delete task?"
      description={<>“{task?.title}” and its subtasks will be removed. You can undo this from the notification.</>}
      confirmLabel="Delete"
    />
  )
}
