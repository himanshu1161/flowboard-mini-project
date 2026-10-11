import type { AvatarColor, Priority, StatusColor } from '../../models/types'

/** Join class names, skipping falsy values. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Single source of truth for status/priority colors so kanban cards,
 * list rows, the drawer and selects always match.
 * Full class strings are listed so Tailwind can detect them.
 */
export const STATUS_STYLES: Record<StatusColor, { dot: string; pill: string; ring: string }> = {
  gray: { dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-700', ring: 'ring-gray-300' },
  blue: { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700', ring: 'ring-blue-300' },
  violet: { dot: 'bg-violet-500', pill: 'bg-violet-50 text-violet-700', ring: 'ring-violet-300' },
  amber: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700', ring: 'ring-amber-300' },
  green: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-300' },
  red: { dot: 'bg-red-500', pill: 'bg-red-50 text-red-700', ring: 'ring-red-300' },
}

export const PRIORITY_STYLES: Record<Priority, { label: string; icon: string; chip: string }> = {
  urgent: { label: 'Urgent', icon: 'text-priority-urgent', chip: 'bg-danger-50 text-danger-700' },
  high: { label: 'High', icon: 'text-priority-high', chip: 'bg-warning-50 text-warning-700' },
  normal: { label: 'Normal', icon: 'text-priority-normal', chip: 'bg-blue-50 text-blue-700' },
  low: { label: 'Low', icon: 'text-priority-low', chip: 'bg-gray-100 text-gray-600' },
  none: { label: 'No priority', icon: 'text-ink-faint', chip: 'bg-sunken text-ink-muted' },
}

export const AVATAR_STYLES: Record<AvatarColor, string> = {
  indigo: 'bg-indigo-500 text-white',
  amber: 'bg-amber-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  rose: 'bg-rose-500 text-white',
  sky: 'bg-sky-500 text-white',
}

/** Shared focus ring for every interactive element. */
export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1'

/** Trigger styling shared by every property field (status, priority, date…) so the drawer reads as one grid. */
export const FIELD_TRIGGER = cx(
  'group flex h-8 w-full min-w-0 items-center gap-2 rounded-control px-2 text-left text-sm text-ink transition-colors hover:bg-sunken data-open:bg-sunken disabled:cursor-not-allowed disabled:opacity-60',
  FOCUS_RING,
)

/** Styling shared by Headless UI menus / listboxes. */
export const POPOVER_PANEL =
  'z-50 min-w-44 rounded-control border border-line bg-surface p-1 shadow-popover outline-none transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0 [--anchor-gap:4px]'
const POPOVER_ITEM_BASE =
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm data-disabled:cursor-not-allowed data-disabled:opacity-50'
export const POPOVER_ITEM = `${POPOVER_ITEM_BASE} text-ink-soft data-focus:bg-sunken data-focus:text-ink`
/** Destructive menu item (delete / archive). */
export const POPOVER_ITEM_DANGER = `${POPOVER_ITEM_BASE} text-danger-600 data-focus:bg-danger-50 data-focus:text-danger-700`
