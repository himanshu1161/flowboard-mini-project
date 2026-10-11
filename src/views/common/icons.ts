import { Boxes, Folder, ListTodo, type LucideIcon } from 'lucide-react'
import type { ContainerType } from '../../models/types'

/** One icon per hierarchy level — shared by the sidebar, breadcrumb and archive list. */
export const TYPE_ICONS: Record<ContainerType, LucideIcon> = {
  workspace: Boxes,
  space: Boxes,
  folder: Folder,
  list: ListTodo,
}
