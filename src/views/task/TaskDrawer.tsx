import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDashed,
  Flag,
  ListTodo,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTaskController, type SaveState } from '../../controllers/useTaskController'
import { TITLE_MAX } from '../../models/validation'
import type { ID } from '../../models/types'
import { useAppSelector } from '../../store'
import { Button, IconButton } from '../common/Button'
import { relativeTime } from '../common/format'
import { ConfirmDialog } from '../common/Modal'
import { Spinner } from '../common/Spinner'
import { ErrorState } from '../common/States'
import { cx, FOCUS_RING } from '../common/styles'
import { DueDatePicker } from './DatePicker'
import { AssigneeSelect, ListSelect, PrioritySelect, PropertyRow, StatusSelect } from './Fields'
import { DescriptionEditor, TitleEditor } from './Editors'
import { SubtaskSection } from './SubtaskSection'

export function TaskDrawer() {
  const taskId = useAppSelector((s) => s.ui.drawerTaskId)
  // Keep rendering the last task while the panel animates out.
  const [shownId, setShownId] = useState<ID | null>(taskId)
  if (taskId && taskId !== shownId) setShownId(taskId)
  const controller = useTaskController(taskId ?? shownId)

  return (
    <Dialog open={!!taskId} onClose={controller.close} className="relative z-40">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-ink/20 transition-opacity duration-200 ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <DialogPanel
          transition
          className="flex h-full w-screen max-w-xl flex-col border-l border-line bg-surface shadow-drawer transition duration-200 ease-out data-closed:translate-x-full"
        >
          {controller.access.error ? (
            <>
              <DrawerHeader onClose={controller.close} />
              <ErrorState error={controller.access.error} />
            </>
          ) : (
            controller.task && <DrawerContent controller={controller} />
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

type Controller = ReturnType<typeof useTaskController>

function DrawerHeader({ onClose, children }: { onClose: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-ink-muted">{children}</div>
      <IconButton icon={X} label="Close (Esc)" onClick={onClose} />
    </div>
  )
}

function DrawerContent({ controller }: { controller: Controller }) {
  const { task, statuses, users, lists, parent, update, saveState } = controller
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  if (!task) return null

  const listName = lists.find((l) => l.list.id === task.listId)?.list.name ?? 'List'
  const isSubtask = task.parentTaskId !== null

  const onDelete = async () => {
    setDeleting(true)
    const result = await controller.remove()
    setDeleting(false)
    if (result?.data || result?.error) setConfirmDelete(false)
  }

  return (
    <>
      <DrawerHeader onClose={controller.close}>
        {parent && (
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onClick={() => controller.open(parent.id)}
              aria-label={`Back to ${parent.title}`}
              title={`Back to “${parent.title}”`}
              className="-ml-1.5"
            >
              Back
            </Button>
            <span className="mr-1 h-4 w-px shrink-0 bg-line" aria-hidden />
          </>
        )}
        <ListTodo className="size-4 shrink-0 text-ink-faint" aria-hidden />
        <span className="truncate">{listName}</span>
        {parent && (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
            <button
              type="button"
              onClick={() => controller.open(parent.id)}
              className={cx('truncate rounded px-1 hover:bg-sunken hover:text-ink', FOCUS_RING)}
              title="Open parent task"
            >
              {parent.title}
            </button>
          </>
        )}
        <span className="ml-auto pl-2">
          <SaveIndicator state={saveState} />
        </span>
        <IconButton icon={Trash2} label={isSubtask ? 'Delete subtask' : 'Delete task'} onClick={() => setConfirmDelete(true)} tone="danger" />
      </DrawerHeader>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 px-6 py-5">
          <div>
            {isSubtask && <p className="mb-1 text-xs font-medium tracking-wide text-ink-faint uppercase">Subtask</p>}
            <DialogTitle as="div">
              <TitleEditor key={task.id} value={task.title} max={TITLE_MAX} onCommit={(title) => update({ title })} />
            </DialogTitle>
          </div>

          <section aria-label="Properties" className="space-y-1">
            <PropertyRow icon={CircleDashed} label="Status">
              <StatusSelect value={task.statusId} statuses={statuses} onChange={(statusId) => update({ statusId })} />
            </PropertyRow>
            <PropertyRow icon={Flag} label="Priority">
              <PrioritySelect value={task.priority} onChange={(priority) => update({ priority })} />
            </PropertyRow>
            <PropertyRow icon={Users} label="Assignees">
              <AssigneeSelect value={task.assigneeIds} users={users} onChange={(assigneeIds) => update({ assigneeIds })} />
            </PropertyRow>
            <PropertyRow icon={CalendarDays} label="Due date">
              <DueDatePicker value={task.dueDate} onChange={(dueDate) => update({ dueDate })} />
            </PropertyRow>
            {!isSubtask && (
              <PropertyRow icon={ListTodo} label="List">
                <ListSelect value={task.listId} lists={lists} onChange={(listId) => listId !== task.listId && controller.moveToList(listId)} />
              </PropertyRow>
            )}
          </section>

          <DescriptionEditor key={`d-${task.id}`} value={task.description} onCommit={(description) => update({ description })} />

          {!isSubtask && <SubtaskSection controller={controller} />}
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-line px-6 py-2.5 text-xs text-ink-faint">
        <span>
          Created {relativeTime(task.createdAt)} · Updated {relativeTime(task.updatedAt)}
        </span>
        <span className="font-mono">{task.id}</span>
      </footer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        loading={deleting}
        title={isSubtask ? 'Delete subtask?' : 'Delete task?'}
        description={
          <>
            “{task.title}”{controller.subtasks.length > 0 && ` and its ${controller.subtasks.length} subtask(s)`} will be removed.
            You can undo this from the notification.
          </>
        }
        confirmLabel="Delete"
      />
    </>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null
  const content = {
    saving: (
      <>
        <Spinner className="size-3.5" /> Saving…
      </>
    ),
    saved: (
      <>
        <Check className="size-3.5 text-success-500" aria-hidden /> Saved
      </>
    ),
    error: (
      <>
        <AlertCircle className="size-3.5 text-danger-500" aria-hidden /> Not saved
      </>
    ),
  }[state]
  return (
    <span role="status" className="flex items-center gap-1 text-xs whitespace-nowrap text-ink-faint">
      {content}
    </span>
  )
}
