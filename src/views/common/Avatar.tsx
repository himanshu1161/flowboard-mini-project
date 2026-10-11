import type { User } from '../../models/types'
import { initials } from './format'
import { AVATAR_STYLES, cx } from './styles'

const SIZES = {
  xs: 'size-5 text-[10px]',
  sm: 'size-6 text-[11px]',
  md: 'size-8 text-xs',
}

export function Avatar({ user, size = 'sm', className }: { user: User; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      title={user.name}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-pill font-semibold select-none',
        AVATAR_STYLES[user.color],
        SIZES[size],
        className,
      )}
    >
      {initials(user.name)}
    </span>
  )
}

export function AvatarStack({ users, max = 3, size = 'sm' }: { users: User[]; max?: number; size?: keyof typeof SIZES }) {
  if (users.length === 0) return null
  const shown = users.slice(0, max)
  const extra = users.length - shown.length
  return (
    <span className="flex items-center -space-x-1.5" aria-label={`Assigned to ${users.map((u) => u.name).join(', ')}`}>
      {shown.map((u) => (
        <Avatar key={u.id} user={u} size={size} className="ring-2 ring-surface" />
      ))}
      {extra > 0 && (
        <span
          className={cx(
            'inline-flex items-center justify-center rounded-pill bg-sunken font-semibold text-ink-muted ring-2 ring-surface',
            SIZES[size],
          )}
        >
          +{extra}
        </span>
      )}
    </span>
  )
}
