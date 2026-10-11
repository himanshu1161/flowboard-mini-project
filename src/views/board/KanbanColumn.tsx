import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Inbox, Plus } from 'lucide-react'
import { useState } from 'react'
import type { ID, Status } from '../../models/types'
import { StatusDot } from '../common/Badges'
import { IconButton } from '../common/Button'
import { cx } from '../common/styles'
import { QuickAdd } from './QuickAdd'
import { SortableTaskCard } from './TaskCard'

type CardProps = Parameters<typeof SortableTaskCard>[0]

export function KanbanColumn({
  status,
  droppableId,
  taskIds,
  isDragging,
  searching,
  renderTask,
  onQuickAdd,
}: {
  status: Status
  droppableId: string
  taskIds: ID[]
  isDragging: boolean
  searching: boolean
  renderTask: (id: ID) => CardProps | null
  onQuickAdd: (title: string) => Promise<boolean>
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id: droppableId, data: { type: 'column' } })
  const [adding, setAdding] = useState(false)
  // While dragging, the active card is moved into whichever column it hovers — that column is the drop target.
  const highlighted = isDragging && (isOver || (!!active && taskIds.includes(String(active.id))))

  return (
    <section
      aria-label={`${status.name} column`}
      className={cx(
        'flex max-h-full w-[17.5rem] shrink-0 flex-col rounded-card bg-sunken transition-[box-shadow,background-color] duration-150',
        highlighted && 'bg-brand-50 ring-2 ring-brand-200',
      )}
    >
      <header className="group/col flex h-10 shrink-0 items-center gap-2 px-3">
        <StatusDot status={status} />
        <h2 className="truncate text-xs font-semibold tracking-wide text-ink-soft uppercase">{status.name}</h2>
        <span className="rounded-pill bg-surface px-1.5 text-[11px] font-medium text-ink-muted tabular-nums">{taskIds.length}</span>
        <IconButton
          icon={Plus}
          label={`Add task to ${status.name}`}
          size="xs"
          className="ml-auto opacity-0 group-hover/col:opacity-100 focus-visible:opacity-100"
          onClick={() => setAdding(true)}
        />
      </header>

      <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext id={droppableId} items={taskIds} strategy={verticalListSortingStrategy}>
          {taskIds.map((id) => {
            const props = renderTask(id)
            return props ? <SortableTaskCard key={id} {...props} /> : null
          })}
        </SortableContext>

        {taskIds.length === 0 && !adding && (
          <div
            className={cx(
              'flex flex-col items-center justify-center gap-1 rounded-card border border-dashed py-6 text-center text-xs transition-colors',
              isDragging ? 'border-brand-200 text-brand-600' : 'border-line-strong text-ink-faint',
            )}
          >
            <Inbox className="size-4" aria-hidden />
            {isDragging ? 'Drop here' : searching ? 'No matches' : 'No tasks'}
          </div>
        )}

        {adding ? (
          <QuickAdd
            onSubmit={onQuickAdd}
            onClose={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-8 items-center gap-1.5 rounded-control px-2 text-sm text-ink-muted transition-colors hover:bg-line/60 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          >
            <Plus className="size-4" aria-hidden /> Add task
          </button>
        )}
      </div>
    </section>
  )
}
