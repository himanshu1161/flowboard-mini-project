import { CalendarDays, Flag } from 'lucide-react'
import type { Priority, Status } from '../../models/types'
import { DUE_TONE_STYLES, dueTone, formatDue } from './format'
import { cx, PRIORITY_STYLES, STATUS_STYLES } from './styles'

export function StatusDot({ status, className }: { status: Pick<Status, 'color'>; className?: string }) {
  return <span className={cx('inline-block size-2 shrink-0 rounded-pill', STATUS_STYLES[status.color].dot, className)} />
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={cx(
        'inline-flex h-6 max-w-full items-center gap-1.5 rounded-pill px-2 text-xs font-medium',
        STATUS_STYLES[status.color].pill,
      )}
    >
      <StatusDot status={status} />
      <span className="truncate">{status.name}</span>
    </span>
  )
}

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Flag
      className={cx('shrink-0', PRIORITY_STYLES[priority].icon, priority !== 'none' && 'fill-current', className ?? 'size-3.5')}
      aria-hidden
    />
  )
}

/** Compact chip — used on kanban cards and list rows so colors always match. */
export function PriorityBadge({ priority, showNone = false }: { priority: Priority; showNone?: boolean }) {
  if (priority === 'none' && !showNone) return null
  const style = PRIORITY_STYLES[priority]
  return (
    <span className={cx('inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold', style.chip)}>
      <PriorityIcon priority={priority} className="size-3" />
      {style.label}
    </span>
  )
}

export function DueDate({ iso, done, className }: { iso: string | null; done: boolean; className?: string }) {
  if (!iso) return null
  const tone = dueTone(iso, done)
  return (
    <span
      className={cx('inline-flex items-center gap-1 text-xs font-medium', DUE_TONE_STYLES[tone], className)}
      title={`Due ${new Date(iso).toLocaleString()}${tone === 'overdue' ? ' — overdue' : ''}`}
    >
      <CalendarDays className="size-3.5" aria-hidden />
      {formatDue(iso)}
    </span>
  )
}

export function RoleBadge({ role }: { role: 'admin' | 'member' }) {
  return (
    <span
      className={cx(
        'inline-flex h-5 min-w-14 items-center justify-center rounded-md px-1.5 text-[10px] font-semibold tracking-wide uppercase',
        role === 'admin' ? 'bg-brand-50 text-brand-700' : 'bg-sunken text-ink-muted',
      )}
    >
      {role}
    </span>
  )
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface px-1 font-sans text-[11px] font-medium text-ink-muted shadow-card">
      {children}
    </kbd>
  )
}
