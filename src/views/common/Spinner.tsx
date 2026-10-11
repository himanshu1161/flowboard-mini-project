import { LoaderCircle } from 'lucide-react'
import { cx } from './styles'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cx('animate-spin', className ?? 'size-4')} aria-hidden />
}
