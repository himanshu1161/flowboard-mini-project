import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { IconButton } from '../common/Button'
import { dayKey, dayKeyToIso, formatDateLabel, isoToDayKey } from '../common/format'
import { cx, FIELD_TRIGGER, FOCUS_RING, POPOVER_PANEL } from '../common/styles'
import { Chevron } from './Fields'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const QUICK_PICKS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
]

// Calendar math on local dates at midnight.
const addDays = (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
const keyToDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Same day of the month, clamped (31 Jan + 1 month → 28/29 Feb). */
function addMonths(date: Date, n: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + n, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay))
}

/** Always 6 weeks, starting on the Sunday on or before the 1st, so the popover never changes height. */
function monthWeeks(month: Date): Date[][] {
  const first = startOfMonth(month)
  const start = addDays(first, -first.getDay())
  return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)))
}

/**
 * Due-date field: a Tailwind-styled calendar popover (replaces the unstyleable native
 * `<input type="date">`). Selecting a day stores it as 17:00 local time, as before.
 */
export function DueDatePicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null
  onChange: (iso: string | null) => void
  disabled?: boolean
}) {
  const label = value ? formatDateLabel(value) : null
  return (
    <div className="group/date relative">
      <Popover>
        <PopoverButton
          disabled={disabled}
          aria-label={`Due date, ${label ?? 'none'}`}
          title={value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'full' }) : undefined}
          className={cx(FIELD_TRIGGER, value && 'pr-8')}
        >
          <CalendarDays className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
          <span className={cx('truncate', !label && 'text-ink-faint')}>{label ?? 'No due date'}</span>
          {!value && <Chevron />}
        </PopoverButton>
        <PopoverPanel anchor="bottom start" transition className={cx(POPOVER_PANEL, 'w-72 p-3')}>
          {({ open, close }) => (
            <Calendar
              open={open}
              value={value}
              onSelect={(iso) => {
                onChange(iso)
                close()
              }}
            />
          )}
        </PopoverPanel>
      </Popover>
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Clear due date"
          title="Clear due date"
          className={cx(
            'absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 text-ink-faint opacity-0 transition hover:bg-line hover:text-ink group-hover/date:opacity-100 focus-visible:opacity-100',
            FOCUS_RING,
          )}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

function Calendar({
  open,
  value,
  onSelect,
}: {
  open: boolean
  value: string | null
  onSelect: (iso: string | null) => void
}) {
  const selectedKey = value ? isoToDayKey(value) : null
  const today = startOfToday()
  const todayKey = dayKey(today)
  const initialDay = () => (selectedKey ? keyToDate(selectedKey) : today)

  // Roving focus: one active day; arrow keys move it, and the month follows.
  const [focused, setFocused] = useState(initialDay)
  const [month, setMonth] = useState(() => startOfMonth(focused))
  const gridRef = useRef<HTMLDivElement>(null)
  const focusedKey = dayKey(focused)

  // Every time the popover opens, start from the current value — even if the panel is
  // still mounted from a close animation (state adjusted during render, no effect).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const start = initialDay()
      setFocused(start)
      setMonth(startOfMonth(start))
    }
  }

  // Keep DOM focus on the active day while open — on open and during keyboard navigation.
  useEffect(() => {
    if (!open) return
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusedKey}"]`)?.focus({ preventScroll: true })
  }, [open, focusedKey])

  const moveTo = (next: Date) => {
    setFocused(next)
    if (!sameMonth(next, month)) setMonth(startOfMonth(next))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
      Home: () => addDays(focused, -focused.getDay()),
      End: () => addDays(focused, 6 - focused.getDay()),
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    moveTo(move())
  }

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  // If the active day isn't in the visible month (after paging with the arrows), Tab lands on the 1st.
  const tabbableKey = sameMonth(focused, month) ? focusedKey : dayKey(month)

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-line pb-2.5">
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick.label}
            type="button"
            onClick={() => onSelect(dayKeyToIso(dayKey(addDays(today, pick.days))))}
            className={cx('h-7 rounded-md bg-sunken px-2 text-xs font-medium text-ink-soft transition-colors hover:bg-line hover:text-ink', FOCUS_RING)}
          >
            {pick.label}
          </button>
        ))}
        {value && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cx('ml-auto h-7 rounded-md px-2 text-xs font-medium text-ink-muted transition-colors hover:bg-danger-50 hover:text-danger-600', FOCUS_RING)}
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-2.5 mb-1 flex items-center justify-between">
        <span className="pl-1 text-sm font-semibold text-ink" aria-live="polite">
          {monthLabel}
        </span>
        <div className="flex items-center">
          <IconButton icon={ChevronLeft} label="Previous month" size="xs" onClick={() => setMonth(addMonths(month, -1))} />
          <IconButton icon={ChevronRight} label="Next month" size="xs" onClick={() => setMonth(addMonths(month, 1))} />
        </div>
      </div>

      <div ref={gridRef} role="grid" aria-label={monthLabel} onKeyDown={onKeyDown}>
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} role="columnheader" className="flex h-7 items-center justify-center text-[11px] font-medium text-ink-faint">
              {weekday}
            </span>
          ))}
        </div>
        {monthWeeks(month).map((week) => (
          <div key={dayKey(week[0])} role="row" className="grid grid-cols-7 gap-y-0.5">
            {week.map((day) => {
              const key = dayKey(day)
              const selected = key === selectedKey
              const isToday = key === todayKey
              return (
                <span key={key} role="gridcell" aria-selected={selected} className="flex justify-center">
                  <button
                    type="button"
                    data-day={key}
                    tabIndex={key === tabbableKey ? 0 : -1}
                    aria-label={day.toLocaleDateString(undefined, { dateStyle: 'full' })}
                    aria-current={isToday ? 'date' : undefined}
                    onFocus={() => setFocused(day)}
                    onClick={() => onSelect(dayKeyToIso(key))}
                    className={cx(
                      'flex size-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors',
                      FOCUS_RING,
                      selected
                        ? 'bg-brand-600 font-semibold text-white hover:bg-brand-700'
                        : isToday
                          ? 'font-semibold text-brand-700 ring-1 ring-brand-200 ring-inset hover:bg-brand-50'
                          : sameMonth(day, month)
                            ? 'text-ink-soft hover:bg-sunken hover:text-ink'
                            : 'text-ink-faint hover:bg-sunken',
                    )}
                  >
                    {day.getDate()}
                  </button>
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
