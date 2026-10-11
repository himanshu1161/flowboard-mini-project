import type { DragEndEvent, DragOverEvent, DragStartEvent, UniqueIdentifier } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useCallback, useMemo, useState } from 'react'
import type { ID, Task } from '../models/types'
import { useAppSelector } from '../store'
import { selectBoardColumns, selectSubtaskStats, selectSnapshot } from '../store/selectors'
import { columnTasks } from '../models/taskOps'
import { moveTask } from '../store/services/taskService'
import { useRun } from './useToast'

export const COLUMN_PREFIX = 'column:'
const columnId = (statusId: ID) => `${COLUMN_PREFIX}${statusId}`

/** statusId → ordered task ids, as currently rendered. */
type Layout = Record<ID, ID[]>

/**
 * Kanban controller: owns the transient drag layout (so cards move between
 * columns while dragging), then commits a single optimistic `moveTask`.
 */
export function useBoardController(listId: ID) {
  const run = useRun()
  const columns = useAppSelector((s) => selectBoardColumns(s, listId))
  const subtaskStats = useAppSelector(selectSubtaskStats)
  const snap = useAppSelector(selectSnapshot)

  const [activeId, setActiveId] = useState<ID | null>(null)
  const [dragLayout, setDragLayout] = useState<Layout | null>(null)
  /** Card that just snapped back after a failed optimistic move (drives a brief shake). */
  const [rejectedId, setRejectedId] = useState<ID | null>(null)

  const commitMove = useCallback(
    async (taskId: ID, input: { toStatusId: ID; toIndex?: number }) => {
      const result = await run(() => moveTask(taskId, input))
      if (result.error) {
        setRejectedId(taskId)
        setTimeout(() => setRejectedId((id) => (id === taskId ? null : id)), 700)
      }
      return result
    },
    [run],
  )

  const tasksById = useMemo(() => {
    const map: Record<ID, Task> = {}
    for (const col of columns) for (const t of col.tasks) map[t.id] = t
    return map
  }, [columns])

  const baseLayout = useMemo<Layout>(
    () => Object.fromEntries(columns.map((c) => [c.status.id, c.tasks.map((t) => t.id)])),
    [columns],
  )
  const layout = dragLayout ?? baseLayout

  const findColumn = useCallback(
    (id: UniqueIdentifier, from: Layout): ID | undefined => {
      const key = String(id)
      if (key.startsWith(COLUMN_PREFIX)) return key.slice(COLUMN_PREFIX.length)
      return Object.keys(from).find((statusId) => from[statusId].includes(key))
    },
    [],
  )

  const onDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setActiveId(String(active.id))
      setDragLayout(baseLayout)
    },
    [baseLayout],
  )

  const onDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      if (!over) return
      setDragLayout((current) => {
        const from = current ?? baseLayout
        const source = findColumn(active.id, from)
        const target = findColumn(over.id, from)
        if (!source || !target || source === target) return current
        const activeKey = String(active.id)
        const targetItems = from[target]
        const overIndex = targetItems.indexOf(String(over.id))
        const index = overIndex >= 0 ? overIndex : targetItems.length
        return {
          ...from,
          [source]: from[source].filter((id) => id !== activeKey),
          [target]: [...targetItems.slice(0, index), activeKey, ...targetItems.slice(index)],
        }
      })
    },
    [baseLayout, findColumn],
  )

  const onDragCancel = useCallback(() => {
    setActiveId(null)
    setDragLayout(null)
  }, [])

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const from = dragLayout ?? baseLayout
      setActiveId(null)
      setDragLayout(null)
      if (!over) return

      const taskId = String(active.id)
      const statusId = findColumn(over.id, from) ?? findColumn(active.id, from)
      if (!statusId) return

      // Final order of the visible column after the drop (same semantics as dnd-kit's arrayMove).
      const items = from[statusId]
      const activeIndex = items.indexOf(taskId)
      const overIndex = items.indexOf(String(over.id))
      let visible = activeIndex >= 0 && overIndex >= 0 ? arrayMove(items, activeIndex, overIndex) : items
      if (!visible.includes(taskId)) visible = [...visible, taskId]

      // Translate to an index in the *full* column (search may hide some tasks).
      const full = columnTasks(snap, listId, statusId, taskId).map((t) => t.id)
      const after = visible[visible.indexOf(taskId) + 1]
      const before = visible[visible.indexOf(taskId) - 1]
      const toIndex = after ? full.indexOf(after) : before ? full.indexOf(before) + 1 : full.length

      const task = snap.tasks[taskId]
      const unchanged = task && task.statusId === statusId && columnTasks(snap, listId, statusId).findIndex((t) => t.id === taskId) === toIndex
      if (unchanged) return

      void commitMove(taskId, { toStatusId: statusId, toIndex: Math.max(0, toIndex) })
    },
    [dragLayout, baseLayout, findColumn, snap, listId, commitMove],
  )

  return {
    columns,
    layout,
    tasksById,
    subtaskStats,
    activeTask: activeId ? tasksById[activeId] : null,
    columnId,
    dnd: { onDragStart, onDragOver, onDragEnd, onDragCancel },
    rejectedId,
  }
}
