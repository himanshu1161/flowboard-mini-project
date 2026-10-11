import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { forgetToastAction, runToastAction } from '../../controllers/useToast'
import { useAppDispatch, useAppSelector } from '../../store'
import { toastDismissed, type Toast } from '../../store/slices/ui'
import { cx, FOCUS_RING } from './styles'

const ICONS = {
  success: <CheckCircle2 className="size-5 text-success-500" aria-hidden />,
  error: <XCircle className="size-5 text-danger-500" aria-hidden />,
  info: <Info className="size-5 text-brand-500" aria-hidden />,
}

export function Toaster() {
  const toasts = useAppSelector((s) => s.ui.toasts)
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch()
  const [paused, setPaused] = useState(false)
  const dismiss = () => {
    forgetToastAction(toast.id)
    dispatch(toastDismissed(toast.id))
  }

  useEffect(() => {
    if (paused) return
    const timeout = setTimeout(dismiss, toast.kind === 'error' || toast.actionLabel ? 6000 : 3500)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, toast.id])

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cx(
        'pointer-events-auto flex animate-toast-in gap-3 rounded-card border bg-surface px-3 py-2.5 shadow-popover',
        // Title-only toasts center everything (even when the title wraps); with a message, align to the title row.
        toast.message ? 'items-start' : 'items-center',
        toast.kind === 'error' ? 'border-danger-100' : 'border-line',
      )}
    >
      {/* Icon, title and buttons share one 28px row so a title-only toast is vertically centered. */}
      <span className="flex h-7 shrink-0 items-center">{ICONS[toast.kind]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex min-h-7 items-center gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{toast.title}</p>
          {toast.actionLabel && (
            <button
              type="button"
              onClick={() => {
                runToastAction(toast.id)
                dispatch(toastDismissed(toast.id))
              }}
              className={cx('h-7 shrink-0 rounded-md px-2 text-sm font-semibold text-brand-600 hover:bg-brand-50', FOCUS_RING)}
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss notification"
            className={cx('flex size-7 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-sunken hover:text-ink', FOCUS_RING)}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {toast.message && <p className="pr-1 pb-0.5 text-sm text-ink-muted">{toast.message}</p>}
      </div>
    </div>
  )
}
