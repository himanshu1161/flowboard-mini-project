import { KanbanSquare, LayoutList, ListTodo, Plus, RotateCw, SearchX } from 'lucide-react'
import type { WorkspaceController } from '../../controllers/useWorkspaceController'
import type { ViewMode } from '../../store/slices/ui'
import { KanbanBoard } from '../board/KanbanBoard'
import { Kbd } from '../common/Badges'
import { Button } from '../common/Button'
import { pluralize } from '../common/format'
import { BoardSkeleton, Skeleton, TableSkeleton } from '../common/Skeletons'
import { EmptyState, ErrorState } from '../common/States'
import { cx, FOCUS_RING } from '../common/styles'
import { TaskTable } from '../list/TaskTable'

const VIEWS: Array<{ id: ViewMode; label: string; icon: typeof KanbanSquare; key: string }> = [
  { id: 'board', label: 'Board', icon: KanbanSquare, key: 'B' },
  { id: 'list', label: 'List', icon: LayoutList, key: 'L' },
]

export function MainContent({ ctl }: { ctl: WorkspaceController }) {
  const list = ctl.access.data

  const quickAdd = async (statusId: string | undefined, title: string) => {
    const result = await ctl.addTask({ title, statusId }, { toast: true })
    return !!result?.data
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-canvas">
      {/* List header */}
      <div className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
        {ctl.loading && !list ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <h1 className="flex min-w-0 items-center gap-2 text-base font-semibold text-ink">
            <ListTodo className="size-4 shrink-0 text-ink-muted" aria-hidden />
            <span className="truncate">{list?.name ?? headerFallback(ctl)}</span>
            {list && !ctl.loading && (
              <span className="shrink-0 text-sm font-normal text-ink-faint">{pluralize(ctl.taskCount, 'task')}</span>
            )}
          </h1>
        )}

        {list && (
          <div role="tablist" aria-label="View" className="flex items-center gap-0.5 rounded-control bg-sunken p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={ctl.view === v.id}
                onClick={() => ctl.setView(v.id)}
                title={`${v.label} view (${v.key})`}
                className={cx(
                  'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                  ctl.view === v.id ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
                  FOCUS_RING,
                )}
              >
                <v.icon className="size-3.5" aria-hidden /> {v.label}
              </button>
            ))}
          </div>
        )}

        {list && (
          <Button variant="primary" icon={Plus} className="ml-auto" onClick={() => ctl.openNewTask()} title="New task (N)">
            New task
            <span className="ml-1 hidden rounded bg-white/20 px-1 text-[10px] lg:inline">N</span>
          </Button>
        )}
      </div>

      {list && ctl.search && !ctl.loading && (
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-brand-50/60 px-4 text-sm text-ink-soft">
          Showing {pluralize(ctl.rows.length, 'match', 'matches')} for <span className="font-medium text-ink">“{ctl.search}”</span>
          <button type="button" onClick={() => ctl.setSearch('')} className={cx('ml-1 rounded px-1 font-medium text-brand-700 hover:underline', FOCUS_RING)}>
            Clear
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <Body ctl={ctl} onQuickAdd={quickAdd} />
      </div>
    </main>
  )
}

function headerFallback(ctl: WorkspaceController) {
  if (!ctl.selectedListId) return 'Welcome'
  if (ctl.access.error?.code === 'FORBIDDEN') return 'No access'
  return 'Unavailable'
}

function Body({ ctl, onQuickAdd }: { ctl: WorkspaceController; onQuickAdd: (statusId: string | undefined, title: string) => Promise<boolean> }) {
  if (ctl.loading) return ctl.view === 'board' ? <BoardSkeleton /> : <TableSkeleton />

  if (!ctl.selectedListId) {
    return (
      <EmptyState
        icon={ListTodo}
        title={ctl.firstVisibleList ? 'Pick a list to get started' : 'No lists available'}
        description={ctl.firstVisibleList ? 'Choose a list in the sidebar to see its board.' : 'You don’t have access to any lists yet. Switch user or ask an admin for access.'}
        action={ctl.firstVisibleList && <Button onClick={() => ctl.goTo(ctl.firstVisibleList!.id)}>Open {ctl.firstVisibleList.name}</Button>}
      />
    )
  }

  if (ctl.loadError?.code === 'NETWORK') {
    return <ErrorState error={ctl.loadError} action={<Button icon={RotateCw} onClick={ctl.retry}>Try again</Button>} />
  }

  // Access is checked live, so switching user immediately shows a 403 here.
  if (ctl.access.error) {
    return (
      <ErrorState
        error={ctl.access.error}
        action={
          ctl.firstVisibleList ? (
            <Button onClick={() => ctl.goTo(ctl.firstVisibleList!.id)}>Go to {ctl.firstVisibleList.name}</Button>
          ) : (
            <Button onClick={ctl.clearSelection}>Back</Button>
          )
        }
      />
    )
  }

  const listId = ctl.selectedListId

  if (ctl.taskCount === 0 && !ctl.search) {
    return (
      <EmptyState
        icon={KanbanSquare}
        title="This list is empty"
        description={
          <>
            Create the first task to get things moving. Tip: press <Kbd>N</Kbd> anywhere.
          </>
        }
        action={<Button variant="primary" icon={Plus} onClick={() => ctl.openNewTask()}>New task</Button>}
      />
    )
  }

  if (ctl.view === 'board') {
    return <KanbanBoard listId={listId} users={ctl.users} searching={!!ctl.search} onQuickAdd={(statusId, title) => onQuickAdd(statusId, title)} />
  }

  if (ctl.rows.length === 0 && ctl.search) {
    return (
      <EmptyState
        icon={SearchX}
        title="No matching tasks"
        description={<>Nothing in this list matches “{ctl.search}”.</>}
        action={<Button onClick={() => ctl.setSearch('')}>Clear search</Button>}
      />
    )
  }

  return (
    <TaskTable
      rows={ctl.rows}
      statuses={ctl.statuses}
      users={ctl.users}
      subtaskStats={ctl.subtaskStats}
      sort={ctl.sort}
      onSort={ctl.setSort}
      onQuickAdd={(title) => onQuickAdd(undefined, title)}
    />
  )
}
