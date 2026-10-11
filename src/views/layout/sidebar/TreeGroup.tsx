import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { SidebarController } from '../../../controllers/useSidebarController'
import type { TreeNode } from '../../../models/permissions'
import { TreeItem } from './TreeItem'

/**
 * One sibling group = one DndContext, so drag-and-drop can only reorder
 * siblings (re-parenting is not supported — see README).
 */
export function TreeGroup({ nodes, depth, ctl }: { nodes: TreeNode[]; depth: number; ctl: SidebarController }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = nodes.map((n) => n.container.id)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const toIndex = ids.indexOf(String(over.id))
    if (toIndex >= 0) void ctl.reorder(String(active.id), toIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={!ctl.isAdmin}>
        <ul aria-label={depth === 0 ? 'Spaces' : undefined} className="space-y-0.5">
          {nodes.map((node) => (
            <TreeItem key={node.container.id} node={node} depth={depth} ctl={ctl} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
