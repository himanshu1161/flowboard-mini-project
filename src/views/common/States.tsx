import type { LucideIcon } from 'lucide-react'
import { CloudOff, Lock, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { errorTitle } from '../../models/errors'
import type { AppError } from '../../models/types'
import { cx } from './styles'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center text-center', compact ? 'gap-2 py-6' : 'gap-3 py-16', className)}>
      <span
        className={cx(
          'flex items-center justify-center rounded-card bg-sunken text-ink-faint',
          compact ? 'size-9' : 'size-12',
        )}
      >
        <Icon className={compact ? 'size-4' : 'size-6'} aria-hidden />
      </span>
      <div className="max-w-sm space-y-1">
        <p className={cx('font-semibold text-ink', compact ? 'text-sm' : 'text-base')}>{title}</p>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="mt-1 flex items-center gap-2">{action}</div>}
    </div>
  )
}

const ERROR_ICONS: Partial<Record<AppError['code'], LucideIcon>> = {
  FORBIDDEN: Lock,
  NETWORK: CloudOff,
  NOT_FOUND: SearchX,
}

export function ErrorState({ error, action, compact }: { error: AppError; action?: ReactNode; compact?: boolean }) {
  const Icon = ERROR_ICONS[error.code] ?? CloudOff
  return (
    <div role="alert" className={cx('flex flex-col items-center justify-center gap-3 text-center', compact ? 'py-8' : 'py-20')}>
      <span
        className={cx(
          'flex size-12 items-center justify-center rounded-card',
          error.code === 'FORBIDDEN' ? 'bg-warning-50 text-warning-700' : 'bg-danger-50 text-danger-600',
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="text-base font-semibold text-ink">
          {errorTitle(error)} <span className="font-normal text-ink-faint">· {error.status}</span>
        </p>
        <p className="text-sm text-ink-muted">{error.message}</p>
      </div>
      {action && <div className="mt-1 flex items-center gap-2">{action}</div>}
    </div>
  )
}

export function InlineError({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} role="alert" className="text-xs font-medium text-danger-600">
      {children}
    </p>
  )
}
