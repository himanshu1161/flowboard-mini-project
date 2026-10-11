import { cx } from './styles'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-line/70', className)} />
}

export function TreeSkeleton() {
  return (
    <div className="space-y-2 px-3 py-2" aria-busy="true" aria-label="Loading workspace">
      {[0, 1].map((space) => (
        <div key={space} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="ml-4 h-4 w-28" />
          <Skeleton className="ml-8 h-4 w-24" />
          <Skeleton className="ml-8 h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-3 p-4" aria-busy="true" aria-label="Loading board">
      {[4, 2, 3].map((cards, col) => (
        <div key={col} className="w-72 shrink-0 space-y-2 rounded-card bg-sunken p-2">
          <Skeleton className="m-1 h-4 w-24" />
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="space-y-3 rounded-card border border-line bg-surface p-3">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="size-5 rounded-pill" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="p-4" aria-busy="true" aria-label="Loading tasks">
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <Skeleton className="h-9 rounded-none" />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-line px-4 py-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-24 rounded-pill" />
            <Skeleton className="size-5 rounded-pill" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
