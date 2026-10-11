import { CalendarDays, CircleDashed, Flag, Users } from 'lucide-react'
import { useState } from 'react'
import type { WorkspaceController } from '../../controllers/useWorkspaceController'
import type { ID, Priority } from '../../models/types'
import { TITLE_MAX, validateTitle } from '../../models/validation'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import { InlineError } from '../common/States'
import { cx } from '../common/styles'
import { DueDatePicker } from './DatePicker'
import { AssigneeSelect, PrioritySelect, PropertyRow, StatusSelect } from './Fields'

export function NewTaskDialog({ controller }: { controller: WorkspaceController }) {
  const { newTask, statuses, users, closeNewTask, addTask, access } = controller
  const [title, setTitle] = useState('')
  const [statusId, setStatusId] = useState<ID>('')
  const [priority, setPriority] = useState<Priority>('none')
  const [assigneeIds, setAssigneeIds] = useState<ID[]>([])
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reset the form each time the dialog opens (state adjusted during render, no effect).
  const [wasOpen, setWasOpen] = useState(newTask.open)
  if (newTask.open !== wasOpen) {
    setWasOpen(newTask.open)
    if (newTask.open) {
      setTitle('')
      setStatusId(newTask.statusId ?? statuses[0]?.id ?? '')
      setPriority('none')
      setAssigneeIds([])
      setDueDate(null)
      setTouched(false)
    }
  }

  const error = validateTitle(title)
  const submit = async () => {
    setTouched(true)
    if (error) return
    setSaving(true)
    const result = await addTask({ title, statusId, priority, assigneeIds, dueDate }, { toast: true })
    setSaving(false)
    if (result?.data) closeNewTask()
  }

  return (
    <Modal
      open={newTask.open && !!access.data}
      onClose={closeNewTask}
      title="New task"
      description={access.data ? <>in <span className="font-medium text-ink-soft">{access.data.name}</span></> : undefined}
      footer={
        <>
          <Button onClick={closeNewTask} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} disabled={touched && !!error}>
            Create task
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-3"
      >
        <div className="space-y-1">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title && setTouched(true)}
            placeholder="Task title"
            aria-label="Task title"
            aria-invalid={touched && !!error}
            className={cx(
              'h-10 w-full rounded-control border px-3 text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:ring-2',
              touched && error ? 'border-danger-500 focus:ring-danger-100' : 'border-line focus:border-brand-500 focus:ring-brand-100',
            )}
          />
          <div className="flex justify-between gap-2">
            {touched && error ? <InlineError>{error.message}</InlineError> : <span />}
            <span className={cx('text-xs tabular-nums', title.trim().length > TITLE_MAX ? 'text-danger-600' : 'text-ink-faint')}>
              {title.trim().length}/{TITLE_MAX}
            </span>
          </div>
        </div>
        <div className="space-y-1 rounded-control bg-canvas p-2">
          <PropertyRow icon={CircleDashed} label="Status">
            <StatusSelect value={statusId} statuses={statuses} onChange={setStatusId} />
          </PropertyRow>
          <PropertyRow icon={Flag} label="Priority">
            <PrioritySelect value={priority} onChange={setPriority} />
          </PropertyRow>
          <PropertyRow icon={Users} label="Assignees">
            <AssigneeSelect value={assigneeIds} users={users} onChange={setAssigneeIds} />
          </PropertyRow>
          <PropertyRow icon={CalendarDays} label="Due date">
            <DueDatePicker value={dueDate} onChange={setDueDate} />
          </PropertyRow>
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  )
}
