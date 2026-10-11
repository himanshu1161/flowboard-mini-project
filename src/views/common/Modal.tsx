import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { AlertTriangle, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, IconButton } from './Button'
import { cx } from './styles'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md'
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-ink/30 backdrop-blur-[1px] transition duration-150 ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 pt-[12vh]">
        <DialogPanel
          transition
          className={cx(
            'w-full rounded-card border border-line bg-surface shadow-popover transition duration-150 ease-out data-closed:translate-y-2 data-closed:scale-[0.98] data-closed:opacity-0',
            size === 'sm' ? 'max-w-sm' : 'max-w-md',
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-4">
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold text-ink">{title}</DialogTitle>
              {description && <div className="text-sm text-ink-muted">{description}</div>}
            </div>
            <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2" />
          </div>
          {children && <div className="px-5 pt-4">{children}</div>}
          {footer && <div className="mt-5 flex justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">{footer}</div>}
          {!footer && <div className="h-5" />}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  loading,
  tone = 'danger',
}: {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
  tone?: 'danger' | 'primary'
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          {tone === 'danger' && <AlertTriangle className="size-4 text-danger-600" aria-hidden />}
          {title}
        </span>
      }
      description={description}
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading} autoFocus>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
