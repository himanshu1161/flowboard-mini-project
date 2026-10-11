import { Archive, ChevronRight, FolderTree, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '../../../controllers/useSession'
import { useSidebarController } from '../../../controllers/useSidebarController'
import { Avatar } from '../../common/Avatar'
import { RoleBadge } from '../../common/Badges'
import { IconButton } from '../../common/Button'
import { pluralize } from '../../common/format'
import { TreeSkeleton } from '../../common/Skeletons'
import { EmptyState } from '../../common/States'
import { cx, FOCUS_RING } from '../../common/styles'
import { ArchiveConfirm, CreateContainerDialog, ShareDialog } from './ContainerDialogs'
import { TreeGroup } from './TreeGroup'
import { TYPE_ICONS } from '../../common/icons'

export function Sidebar() {
  const ctl = useSidebarController()
  const { user, visibleListCount } = useSession()

  return (
    <aside aria-label="Workspace navigation" className="flex h-full w-64 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-3">
        <span className="flex size-7 items-center justify-center rounded-control bg-brand-600 text-sm font-bold text-white shadow-card">F</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-semibold text-ink">Flowboard</p>
          <p className="truncate text-xs text-ink-muted">{ctl.workspace?.name ?? 'Workspace'}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-1 flex h-6 items-center justify-between pr-1 pl-2">
          <span className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">Spaces</span>
          {ctl.isAdmin && ctl.workspace && (
            <IconButton icon={Plus} label="New space" size="xs" onClick={() => ctl.startCreate(ctl.workspace!)} />
          )}
        </div>

        {!ctl.ready ? (
          <TreeSkeleton />
        ) : ctl.tree.length === 0 ? (
          <EmptyState compact icon={FolderTree} title="Nothing shared with you" description="Ask an admin to grant you access to a space or list." />
        ) : (
          <TreeGroup nodes={ctl.tree} depth={0} ctl={ctl} />
        )}

        {ctl.isAdmin && ctl.archived.length > 0 && <ArchivedSection ctl={ctl} />}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-control bg-canvas p-2">
          <Avatar user={user} size="md" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
              {user.name.split(' ')[0]} <RoleBadge role={user.role} />
            </p>
            <p className="truncate text-xs text-ink-muted">
              {user.role === 'admin' ? 'Full access' : `Can see ${pluralize(visibleListCount, 'list')}`}
            </p>
          </div>
        </div>
      </div>

      <CreateContainerDialog ctl={ctl} />
      <ShareDialog ctl={ctl} />
      <ArchiveConfirm ctl={ctl} />
    </aside>
  )
}

function ArchivedSection({ ctl }: { ctl: ReturnType<typeof useSidebarController> }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cx('flex h-7 w-full items-center gap-1.5 rounded-control px-2 text-xs font-medium text-ink-muted hover:bg-sunken hover:text-ink', FOCUS_RING)}
      >
        <ChevronRight className={cx('size-3.5 transition-transform', open && 'rotate-90')} aria-hidden />
        <Archive className="size-3.5" aria-hidden />
        Archived
        <span className="ml-auto rounded-pill bg-sunken px-1.5 tabular-nums">{ctl.archived.length}</span>
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5">
          {ctl.archived.map((c) => {
            const Icon = TYPE_ICONS[c.type]
            return (
              <li key={c.id} className="group flex h-8 items-center gap-2 rounded-control pr-1 pl-7 text-sm text-ink-muted hover:bg-sunken">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate line-through decoration-ink-faint">{c.name}</span>
                <IconButton
                  icon={RotateCcw}
                  label={`Restore ${c.name}`}
                  size="xs"
                  className="ml-auto opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => void ctl.restore(c)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
