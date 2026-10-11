import { useMemo, useRef, useState } from 'react'
import { useShortcuts } from '../../controllers/useShortcuts'
import { useBootstrap, useWorkspaceController } from '../../controllers/useWorkspaceController'
import { useAppSelector } from '../../store'
import { Toaster } from '../common/Toaster'
import { cx } from '../common/styles'
import { NewTaskDialog } from '../task/NewTaskDialog'
import { TaskDrawer } from '../task/TaskDrawer'
import { MainContent } from './MainContent'
import { ShortcutsDialog } from './ShortcutsDialog'
import { Sidebar } from './sidebar/Sidebar'
import { TopBar } from './TopBar'

/** App chrome: sidebar + top bar + main content, plus global overlays. */
export function AppShell() {
  useBootstrap()
  const ctl = useWorkspaceController()
  const sidebarCollapsed = useAppSelector((s) => s.ui.sidebarCollapsed)
  const searchRef = useRef<HTMLInputElement>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  const handlers = useMemo(
    () => ({
      focusSearch: () => searchRef.current?.focus(),
      newTask: () => ctl.access.data && ctl.openNewTask(),
      boardView: () => ctl.setView('board'),
      listView: () => ctl.setView('list'),
      toggleSidebar: ctl.toggleSidebar,
      showHelp: () => setShowShortcuts(true),
    }),
    [ctl],
  )
  useShortcuts(handlers)

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink">
      <div className={cx('shrink-0 overflow-hidden transition-[width] duration-200', sidebarCollapsed ? 'w-0' : 'w-64')}>
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar ref={searchRef} ctl={ctl} onShowShortcuts={() => setShowShortcuts(true)} />
        <MainContent ctl={ctl} />
      </div>
      <TaskDrawer />
      <NewTaskDialog controller={ctl} />
      <ShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <Toaster />
    </div>
  )
}
