import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DropAnimation,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useBoardController } from '../../controllers/useBoardController'
import { useTaskActions } from '../../controllers/useTaskActions'
import type { ID, Status, Task, User } from '../../models/types'
import { TaskCardBody } from './TaskCard'
import { KanbanColumn } from './KanbanColumn'
import { DeleteTaskConfirm } from '../task/DeleteTaskConfirm'

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
}

export function KanbanBoard({
  listId,
  users,
  onQuickAdd,
  searching,
}: {
  listId: ID
  users: User[]
  onQuickAdd: (statusId: ID, title: string) => Promise<boolean>
  searching: boolean
}) {
  const board = useBoardController(listId)
  const { actions, pendingDelete, deleting, confirmDelete, cancelDelete } = useTaskActions()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const statuses = board.columns.map((c) => c.status)
  const statusById = Object.fromEntries(statuses.map((s) => [s.id, s])) as Record<ID, Status>
  const usersFor = (task: Task) => users.filter((u) => task.assigneeIds.includes(u.id))
  const isDone = (task: Task) => statusById[task.statusId]?.category === 'done'

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={board.dnd.onDragStart}
        onDragOver={board.dnd.onDragOver}
        onDragEnd={board.dnd.onDragEnd}
        onDragCancel={board.dnd.onDragCancel}
      >
        <div className="flex h-full items-start gap-3 overflow-x-auto p-4">
          {board.columns.map(({ status }) => {
            const ids = board.layout[status.id] ?? []
            return (
              <KanbanColumn
                key={status.id}
                status={status}
                droppableId={board.columnId(status.id)}
                taskIds={ids}
                isDragging={!!board.activeTask}
                searching={searching}
                onQuickAdd={(title) => onQuickAdd(status.id, title)}
                renderTask={(id) => {
                  const task = board.tasksById[id]
                  return task
                    ? {
                        task,
                        assignees: usersFor(task),
                        isDone: isDone(task),
                        subtasks: board.subtaskStats[task.id],
                        statuses,
                        actions,
                        rejected: board.rejectedId === task.id,
                      }
                    : null
                }}
              />
            )
          })}
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {board.activeTask && (
            <div className="w-[17rem]">
              <TaskCardBody
                task={board.activeTask}
                assignees={usersFor(board.activeTask)}
                isDone={isDone(board.activeTask)}
                subtasks={board.subtaskStats[board.activeTask.id]}
                overlay
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <DeleteTaskConfirm task={pendingDelete} loading={deleting} onConfirm={confirmDelete} onClose={cancelDelete} />
    </>
  )
}
