import { ArrowDown, ArrowUp, ArrowUpDown, ListChecks, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTaskActions } from '../../controllers/useTaskActions'
import type { SortDir, SortKey } from '../../models/ordering'
import type { ID, Status, Task, User } from '../../models/types'
import { AvatarStack } from '../common/Avatar'
import { DueDate, PriorityBadge, StatusPill } from '../common/Badges'
import { cx, FOCUS_RING } from '../common/styles'
import { QuickAdd } from '../board/QuickAdd'
import { DeleteTaskConfirm } from '../task/DeleteTaskConfirm'

const GRID = 'grid grid-cols-[minmax(0,1fr)_9.5rem_6.5rem_7rem_7rem] items-center gap-3'

export function TaskTable({
  rows,
  statuses,
  users,
  subtaskStats,
  sort,
  onSort,
  onQuickAdd,
}: {
  rows: Task[]
  statuses: Status[]
  users: User[]
  subtaskStats: Record<ID, { done: number; total: number }>
  sort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
  onQuickAdd: (title: string) => Promise<boolean>
}) {
  const { actions, pendingDelete, deleting, confirmDelete, cancelDelete } = useTaskActions()
  const [adding, setAdding] = useState(false)
  const statusById = Object.fromEntries(statuses.map((s) => [s.id, s])) as Record<ID, Status>

  return (
    <div className="p-4">
      <div role="table" aria-label="Tasks" className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <div role="rowgroup" className="sticky top-0 z-10">
          <div role="row" className={cx(GRID, 'h-9 border-b border-line bg-canvas px-4 text-xs font-medium text-ink-muted')}>
            <SortHeader label="Title" sortKey="title" sort={sort} onSort={onSort} />
            <span role="columnheader">Status</span>
            <span role="columnheader">Assignees</span>
            <SortHeader label="Priority" sortKey="priority" sort={sort} onSort={onSort} />
            <SortHeader label="Due date" sortKey="dueDate" sort={sort} onSort={onSort} />
          </div>
        </div>

        <div role="rowgroup">
          {rows.map((task) => {
            const status = statusById[task.statusId]
            const done = status?.category === 'done'
            const stats = subtaskStats[task.id]
            return (
              <div
                key={task.id}
                role="row"
                tabIndex={0}
                onClick={() => actions.open(task.id)}
                onKeyDown={(e) => e.key === 'Enter' && actions.open(task.id)}
                className={cx(
                  GRID,
                  'h-11 cursor-pointer border-b border-line px-4 text-sm transition-colors last:border-b-0 hover:bg-canvas focus-visible:relative focus-visible:bg-brand-50/50 active:bg-sunken',
                  FOCUS_RING,
                  'focus-visible:ring-inset focus-visible:ring-offset-0',
                )}
              >
                <span role="cell" className="flex min-w-0 items-center gap-2">
                  <span className={cx('truncate font-medium', done ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>{task.title}</span>
                  {stats && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-faint">
                      <ListChecks className="size-3.5" aria-hidden /> {stats.done}/{stats.total}
                    </span>
                  )}
                </span>
                <span role="cell" className="min-w-0">{status && <StatusPill status={status} />}</span>
                <span role="cell">
                  <AvatarStack users={users.filter((u) => task.assigneeIds.includes(u.id))} size="xs" />
                </span>
                <span role="cell">
                  {task.priority === 'none' ? <span className="text-ink-faint">—</span> : <PriorityBadge priority={task.priority} />}
                </span>
                <span role="cell">
                  {task.dueDate ? <DueDate iso={task.dueDate} done={done} /> : <span className="text-ink-faint">—</span>}
                </span>
              </div>
            )
          })}
        </div>

        <div className="border-t border-line p-2">
          {adding ? (
            <QuickAdd onSubmit={onQuickAdd} onClose={() => setAdding(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className={cx('flex h-8 w-full items-center gap-1.5 rounded-control px-2 text-sm text-ink-muted transition-colors hover:bg-sunken hover:text-ink', FOCUS_RING)}
            >
              <Plus className="size-4" aria-hidden /> Add task
            </button>
          )}
        </div>
      </div>
      <DeleteTaskConfirm task={pendingDelete} loading={deleting} onConfirm={confirmDelete} onClose={cancelDelete} />
    </div>
  )
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
}) {
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <span role="columnheader" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cx(
          '-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-sunken hover:text-ink',
          active && 'text-brand-700',
          FOCUS_RING,
        )}
        title={`Sort by ${label.toLowerCase()}`}
      >
        {label}
        <Icon className={cx('size-3', !active && 'opacity-50')} aria-hidden />
      </button>
    </span>
  )
}
