import { ChevronRight, PanelLeft, Search, X } from 'lucide-react'
import { forwardRef } from 'react'
import type { WorkspaceController } from '../../controllers/useWorkspaceController'
import { Kbd } from '../common/Badges'
import { IconButton } from '../common/Button'
import { cx } from '../common/styles'
import { TYPE_ICONS } from '../common/icons'
import { SimulationControl } from './SimulationControl'
import { UserSwitcher } from './UserSwitcher'

export const TopBar = forwardRef<HTMLInputElement, { ctl: WorkspaceController; onShowShortcuts: () => void }>(function TopBar(
  { ctl, onShowShortcuts },
  searchRef,
) {
  const crumbs = ctl.access.data ? ctl.breadcrumb : []
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
      <IconButton icon={PanelLeft} label="Toggle sidebar ( [ )" onClick={ctl.toggleSidebar} />

      <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-1 text-sm md:flex">
        {crumbs.map((c, i) => {
          const Icon = TYPE_ICONS[c.type]
          const last = i === crumbs.length - 1
          return (
            <span key={c.id} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-ink-faint" aria-hidden />}
              <span className={cx('flex min-w-0 items-center gap-1.5', last ? 'font-medium text-ink' : 'text-ink-muted')} aria-current={last ? 'page' : undefined}>
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{c.name}</span>
              </span>
            </span>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <label className="group relative flex h-8 w-56 items-center rounded-control border border-line bg-canvas transition-colors focus-within:border-brand-500 focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-100 hover:border-line-strong lg:w-72">
          <Search className="pointer-events-none absolute left-2.5 size-4 text-ink-faint" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={ctl.search}
            onChange={(e) => ctl.setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                ctl.setSearch('')
                e.currentTarget.blur()
              }
            }}
            placeholder="Search tasks…"
            aria-label="Search tasks by title or description"
            className="h-full w-full bg-transparent pr-8 pl-8 text-sm text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {ctl.search ? (
            <button
              type="button"
              onClick={() => ctl.setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 rounded p-0.5 text-ink-faint hover:bg-line hover:text-ink"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : (
            <span className="pointer-events-none absolute right-2 group-focus-within:hidden">
              <Kbd>/</Kbd>
            </span>
          )}
        </label>
        <SimulationControl />
        <span className="h-6 w-px bg-line" aria-hidden />
        <UserSwitcher onShowShortcuts={onShowShortcuts} />
      </div>
    </header>
  )
})
