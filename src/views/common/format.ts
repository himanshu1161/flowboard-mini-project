const DAY = 24 * 60 * 60 * 1000

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function dayDiff(iso: string, now = new Date()): number {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / DAY)
}

export function formatDue(iso: string, now = new Date()): string {
  const diff = dayDiff(iso, now)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  const date = new Date(iso)
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

export type DueTone = 'overdue' | 'soon' | 'normal' | 'done'

export function dueTone(iso: string, isDone: boolean, now = new Date()): DueTone {
  if (isDone) return 'done'
  const diff = dayDiff(iso, now)
  if (diff < 0) return 'overdue'
  if (diff <= 1) return 'soon'
  return 'normal'
}

export const DUE_TONE_STYLES: Record<DueTone, string> = {
  overdue: 'text-danger-600',
  soon: 'text-warning-700',
  normal: 'text-ink-muted',
  done: 'text-ink-faint line-through',
}

export function relativeTime(iso: string, now = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/** Local calendar day as `yyyy-mm-dd` — the identity of a day in the date picker. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The local calendar day of an ISO datetime. */
export function isoToDayKey(iso: string): string {
  return dayKey(new Date(iso))
}

/** A calendar day → ISO datetime at 17:00 local (end of the working day). */
export function dayKeyToIso(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 17, 0, 0, 0).toISOString()
}

/** Due-date field label: "Today" / "Tomorrow" / "Yesterday", otherwise e.g. "Wed, 16 Oct". */
export function formatDateLabel(iso: string, now = new Date()): string {
  const diff = dayDiff(iso, now)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  const date = new Date(iso)
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

export function pluralize(count: number, word: string, plural = `${word}s`) {
  return `${count} ${count === 1 ? word : plural}`
}
