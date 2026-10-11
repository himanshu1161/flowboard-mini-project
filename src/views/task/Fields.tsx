import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { Check, ChevronDown, ListTodo, UserPlus } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Container, ID, Priority, Status, User } from '../../models/types'
import { PRIORITIES } from '../../models/types'
import { Avatar, AvatarStack } from '../common/Avatar'
import { PriorityIcon, StatusDot, StatusPill } from '../common/Badges'
import { cx, FIELD_TRIGGER, POPOVER_ITEM, POPOVER_PANEL, PRIORITY_STYLES } from '../common/styles'

export function Chevron() {
  return <ChevronDown className="ml-auto size-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 group-data-open:opacity-100" aria-hidden />
}

function OptionCheck({ selected }: { selected: boolean }) {
  return <Check className={cx('ml-auto size-3.5 text-brand-600', !selected && 'invisible')} aria-hidden />
}

export function StatusSelect({
  value,
  statuses,
  onChange,
  disabled,
}: {
  value: ID
  statuses: Status[]
  onChange: (id: ID) => void
  disabled?: boolean
}) {
  const current = statuses.find((s) => s.id === value)
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <ListboxButton aria-label="Status" className={FIELD_TRIGGER}>
        {current ? <StatusPill status={current} /> : <span className="text-ink-faint">Unknown status</span>}
        <Chevron />
      </ListboxButton>
      <ListboxOptions anchor="bottom start" transition className={POPOVER_PANEL}>
        {statuses.map((s) => (
          <ListboxOption key={s.id} value={s.id} className={POPOVER_ITEM}>
            {({ selected }) => (
              <>
                <StatusDot status={s} />
                {s.name}
                <OptionCheck selected={selected} />
              </>
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  )
}

export function PrioritySelect({
  value,
  onChange,
  disabled,
}: {
  value: Priority
  onChange: (p: Priority) => void
  disabled?: boolean
}) {
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <ListboxButton aria-label="Priority" className={FIELD_TRIGGER}>
        <PriorityIcon priority={value} />
        <span className={value === 'none' ? 'text-ink-faint' : ''}>{PRIORITY_STYLES[value].label}</span>
        <Chevron />
      </ListboxButton>
      <ListboxOptions anchor="bottom start" transition className={POPOVER_PANEL}>
        {PRIORITIES.map((p) => (
          <ListboxOption key={p} value={p} className={POPOVER_ITEM}>
            {({ selected }) => (
              <>
                <PriorityIcon priority={p} />
                {PRIORITY_STYLES[p].label}
                <OptionCheck selected={selected} />
              </>
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  )
}

export function AssigneeSelect({
  value,
  users,
  onChange,
  disabled,
}: {
  value: ID[]
  users: User[]
  onChange: (ids: ID[]) => void
  disabled?: boolean
}) {
  const selected = users.filter((u) => value.includes(u.id))
  return (
    <Listbox value={value} onChange={onChange} multiple disabled={disabled}>
      <ListboxButton aria-label="Assignees" className={FIELD_TRIGGER}>
        {selected.length ? (
          <>
            <AvatarStack users={selected} size="xs" max={4} />
            <span className="truncate text-ink-soft">
              {selected.length === 1 ? selected[0].name : `${selected.length} people`}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-2 text-ink-faint">
            <UserPlus className="size-3.5" aria-hidden /> Unassigned
          </span>
        )}
        <Chevron />
      </ListboxButton>
      <ListboxOptions anchor="bottom start" transition className={POPOVER_PANEL}>
        {users.map((u) => (
          <ListboxOption key={u.id} value={u.id} className={POPOVER_ITEM}>
            {({ selected: isSelected }) => (
              <>
                <Avatar user={u} size="xs" />
                {u.name}
                <OptionCheck selected={isSelected} />
              </>
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  )
}

export function ListSelect({
  value,
  lists,
  onChange,
  disabled,
}: {
  value: ID
  lists: Array<{ list: Container; path: string[] }>
  onChange: (id: ID) => void
  disabled?: boolean
}) {
  const current = lists.find((l) => l.list.id === value)
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <ListboxButton aria-label="List" className={FIELD_TRIGGER}>
        <ListTodo className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span className="truncate">{current?.list.name ?? 'Unknown list'}</span>
        {current && <span className="truncate text-xs text-ink-faint">{current.path.join(' / ')}</span>}
        <Chevron />
      </ListboxButton>
      <ListboxOptions anchor="bottom start" transition className={POPOVER_PANEL}>
        {lists.map(({ list, path }) => (
          <ListboxOption key={list.id} value={list.id} className={POPOVER_ITEM}>
            {({ selected }) => (
              <>
                <ListTodo className="size-3.5 text-ink-muted" aria-hidden />
                <span>{list.name}</span>
                <span className="text-xs text-ink-faint">{path.join(' / ')}</span>
                <OptionCheck selected={selected} />
              </>
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  )
}

/** Label + value row for the drawer's property grid. */
export function PropertyRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-2">
      <span className="flex items-center gap-2 text-sm text-ink-muted">
        <Icon className="size-4 text-ink-faint" aria-hidden />
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
