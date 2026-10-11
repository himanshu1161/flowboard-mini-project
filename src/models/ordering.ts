import type { Priority, Task } from './types'

export const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
  none: 4,
}

export const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position

/** Move `item` to `index` within `items` (item may or may not already be in the array). */
export function insertAt<T extends { id: string }>(items: T[], item: T, index: number): T[] {
  const without = items.filter((i) => i.id !== item.id)
  const clamped = Math.max(0, Math.min(index, without.length))
  return [...without.slice(0, clamped), item, ...without.slice(clamped)]
}

/**
 * Re-number positions 0..n-1 and return only the items whose position changed.
 * Dense reindexing keeps positions predictable and avoids float drift.
 */
export function reindex<T extends { position: number }>(items: T[], apply: (item: T, position: number) => T): T[] {
  const changed: T[] = []
  items.forEach((item, position) => {
    if (item.position !== position) changed.push(apply(item, position))
  })
  return changed
}

export type SortKey = 'manual' | 'dueDate' | 'priority' | 'title'
export type SortDir = 'asc' | 'desc'

/** Tasks without a due date always sink to the bottom, regardless of direction. */
export function compareTasks(key: SortKey, dir: SortDir) {
  const sign = dir === 'asc' ? 1 : -1
  return (a: Task, b: Task): number => {
    switch (key) {
      case 'dueDate': {
        if (!a.dueDate && !b.dueDate) return a.position - b.position
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return sign * (Date.parse(a.dueDate) - Date.parse(b.dueDate))
      }
      case 'priority': {
        if (a.priority === 'none' && b.priority !== 'none') return 1
        if (b.priority === 'none' && a.priority !== 'none') return -1
        const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        return diff !== 0 ? sign * diff : a.position - b.position
      }
      case 'title':
        return sign * a.title.localeCompare(b.title)
      default:
        return a.position - b.position
    }
  }
}
