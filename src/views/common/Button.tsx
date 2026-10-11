import type { LucideIcon } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx, FOCUS_RING } from './styles'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-card hover:bg-brand-700 active:bg-brand-700',
  secondary: 'border border-line bg-surface text-ink-soft shadow-card hover:bg-sunken hover:text-ink active:bg-line',
  ghost: 'text-ink-muted hover:bg-sunken hover:text-ink active:bg-line',
  danger: 'bg-danger-600 text-white shadow-card hover:bg-danger-700 active:bg-danger-700',
}

const SIZES: Record<Size, string> = {
  sm: 'h-7 gap-1.5 px-2.5 text-xs',
  md: 'h-8 gap-2 px-3 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, loading, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        FOCUS_RING,
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-3.5" /> : Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />}
      {children}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  /** Used for both aria-label and the native tooltip. */
  label: string
  size?: 'xs' | 'sm' | 'md'
  active?: boolean
  tone?: 'default' | 'danger'
}

const ICON_SIZES = { xs: 'size-6', sm: 'size-7', md: 'size-8' }

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = 'sm', active, tone = 'default', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'danger' ? 'hover:bg-danger-50 hover:text-danger-600 active:bg-danger-100' : 'hover:bg-sunken hover:text-ink active:bg-line',
        FOCUS_RING,
        ICON_SIZES[size],
        active && 'bg-sunken text-ink',
        className,
      )}
      {...rest}
    >
      <Icon className={size === 'xs' ? 'size-3.5' : 'size-4'} aria-hidden />
    </button>
  )
})
