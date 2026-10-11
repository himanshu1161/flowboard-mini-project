import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator, MenuSection, MenuHeading } from '@headlessui/react'
import { AlignLeft, ListChecks, MoreHorizontal, PanelRightOpen, Trash2 } from 'lucide-react'
import { memo } from 'react'
import type { ID, Priority, Status, Task, User } from '../../models/types'
import { PRIORITIES } from '../../models/types'
import { AvatarStack } from '../common/Avatar'
import { DueDate, PriorityBadge, PriorityIcon, StatusDot } from '../common/Badges'
import { cx, FOCUS_RING, POPOVER_ITEM, POPOVER_ITEM_DANGER, POPOVER_PANEL, PRIORITY_STYLES } from '../common/styles'

export interface CardActions {
  open: (id: ID) => void
  setPriority: (id: ID, priority: Priority) => void
  setStatus: (id: ID, statusId: ID) => void
  remove: (task: Task) => void
}

interface CardProps {
  task: Task
  assignees: User[]
  isDone: boolean
  subtasks?: { done: number; total: number }
  statuses: Status[]
  actions?: CardActions
  /** Rendered inside the DragOverlay. */
  overlay?: boolean
  /** The placeholder left in the column while dragging. */
  ghost?: boolean
  /** Briefly shake + outline after a failed (rolled back) move. */
  rejected?: boolean
}

/** Presentational card — scannable: title, priority, due date, subtasks, assignees. */
export const TaskCardBody = memo(function TaskCardBody({
  task,
  assignees,
  isDone,
  subtasks,
  actions,
  overlay,
  ghost,
  rejected,
}: Omit<CardProps, 'statuses'>) {
  return (
    <div
      className={cx(
        'relative rounded-card border bg-surface p-3 text-left transition-[box-shadow,transform,border-color] duration-150',
        overlay
          ? 'rotate-2 cursor-grabbing border-brand-200 shadow-drag'
          : 'border-line shadow-card group-hover:-translate-y-px group-hover:border-line-strong group-hover:shadow-card-hover',
        ghost && 'border-dashed border-brand-200 bg-brand-50/60 shadow-none [&>*]:opacity-0',
        rejected && 'animate-shake border-danger-500 ring-2 ring-danger-100',
      )}
    >
      <p
        className={cx(
          'text-sm leading-snug font-medium break-words line-clamp-3',
          isDone ? 'text-ink-muted' : 'text-ink',
          actions && !overlay && 'pr-5',
        )}
      >
        {task.title}
      </p>

      {(task.priority !== 'none' || task.dueDate || subtasks || task.description || assignees.length > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <PriorityBadge priority={task.priority} />
          <DueDate iso={task.dueDate} done={isDone} />
          {subtasks && (
            <span
              className={cx('inline-flex items-center gap-1 text-xs', subtasks.done === subtasks.total ? 'text-success-700' : 'text-ink-muted')}
              title={`${subtasks.done} of ${subtasks.total} subtasks done`}
            >
              <ListChecks className="size-3.5" aria-hidden />
              {subtasks.done}/{subtasks.total}
            </span>
          )}
          {task.description && <AlignLeft className="size-3.5 text-ink-faint" aria-label="Has description" />}
          <span className="ml-auto">
            <AvatarStack users={assignees} size="xs" />
          </span>
        </div>
      )}
    </div>
  )
})

function CardMenu({ task, statuses, actions }: { task: Task; statuses: Status[]; actions: CardActions }) {
  return (
    <Menu>
      <MenuButton
        aria-label={`Actions for “${task.title}”`}
        title="Actions"
        className={cx(
          'rounded-md bg-surface p-1 text-ink-faint opacity-0 transition hover:bg-sunken hover:text-ink group-hover:opacity-100 focus-visible:opacity-100 data-open:bg-sunken data-open:opacity-100',
          FOCUS_RING,
        )}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </MenuButton>
      <MenuItems anchor="bottom end" transition className={cx(POPOVER_PANEL, 'w-52')}>
        <MenuItem>
          <button type="button" className={POPOVER_ITEM} onClick={() => actions.open(task.id)}>
            <PanelRightOpen className="size-4 text-ink-muted" aria-hidden /> Open details
          </button>
        </MenuItem>
        <MenuSeparator className="my-1 h-px bg-line" />
        <MenuSection>
          <MenuHeading className="px-2 py-1 text-[11px] font-semibold tracking-wide text-ink-faint uppercase">Move to</MenuHeading>
          {statuses.map((s) => (
            <MenuItem key={s.id} disabled={s.id === task.statusId}>
              <button type="button" className={POPOVER_ITEM} onClick={() => actions.setStatus(task.id, s.id)}>
                <StatusDot status={s} /> {s.name}
              </button>
            </MenuItem>
          ))}
        </MenuSection>
        <MenuSeparator className="my-1 h-px bg-line" />
        <MenuSection>
          <MenuHeading className="px-2 py-1 text-[11px] font-semibold tracking-wide text-ink-faint uppercase">Priority</MenuHeading>
          <div className="flex gap-0.5 px-1 pb-1">
            {PRIORITIES.map((p) => (
              <MenuItem key={p}>
                <button
                  type="button"
                  title={PRIORITY_STYLES[p].label}
                  aria-label={`Priority ${PRIORITY_STYLES[p].label}`}
                  onClick={() => actions.setPriority(task.id, p)}
                  className={cx(
                    'flex flex-1 items-center justify-center rounded-md py-1.5 data-focus:bg-sunken',
                    task.priority === p && 'bg-brand-50 ring-1 ring-brand-200',
                  )}
                >
                  <PriorityIcon priority={p} />
                </button>
              </MenuItem>
            ))}
          </div>
        </MenuSection>
        <MenuSeparator className="my-1 h-px bg-line" />
        <MenuItem>
          <button type="button" className={POPOVER_ITEM_DANGER} onClick={() => actions.remove(task)}>
            <Trash2 className="size-4" aria-hidden /> Delete
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  )
}

/**
 * Sortable wrapper. The outer node moves (transform = the one documented inline-style
 * exception required by dnd-kit); the card itself is the drag activator; the quick-action
 * menu sits beside it so interactive elements are never nested.
 */
export function SortableTaskCard(props: Omit<CardProps, 'overlay' | 'ghost'>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
    data: { type: 'task' },
  })
  const { task, actions, statuses } = props
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className="group relative">
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        role="button"
        aria-roledescription="Draggable task"
        aria-label={task.title}
        onClick={() => actions?.open(task.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') actions?.open(task.id)
          else listeners?.onKeyDown?.(e)
        }}
        className="cursor-grab touch-none rounded-card outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:cursor-grabbing"
      >
        <TaskCardBody {...props} ghost={isDragging} />
      </div>
      {actions && !isDragging && (
        <div className="absolute top-2 right-2">
          <CardMenu task={task} statuses={statuses} actions={actions} />
        </div>
      )}
    </div>
  )
}
