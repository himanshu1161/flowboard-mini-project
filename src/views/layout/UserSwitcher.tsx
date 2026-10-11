import { Menu, MenuButton, MenuHeading, MenuItem, MenuItems, MenuSection, MenuSeparator } from '@headlessui/react'
import { Check, ChevronsUpDown, Keyboard, RotateCcw } from 'lucide-react'
import { useSession } from '../../controllers/useSession'
import { Avatar } from '../common/Avatar'
import { RoleBadge } from '../common/Badges'
import { cx, FOCUS_RING, POPOVER_ITEM, POPOVER_PANEL } from '../common/styles'

export function UserSwitcher({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const { user, users, switchUser, resetData } = useSession()
  return (
    <Menu>
      <MenuButton
        className={cx(
          'flex h-9 items-center gap-2 rounded-control border border-line bg-surface py-1 pr-2 pl-1 shadow-card transition-colors hover:border-line-strong hover:bg-canvas data-open:border-brand-200 data-open:ring-2 data-open:ring-brand-100',
          FOCUS_RING,
        )}
        aria-label={`Viewing as ${user.name}. Switch user`}
      >
        <Avatar user={user} size="sm" />
        <span className="hidden w-16 flex-col items-start leading-none sm:flex">
          <span className="text-[10px] font-medium tracking-wide whitespace-nowrap text-ink-faint uppercase">Viewing as</span>
          <span className="max-w-full truncate text-sm font-semibold text-ink">{user.name.split(' ')[0]}</span>
        </span>
        <RoleBadge role={user.role} />
        <ChevronsUpDown className="size-3.5 text-ink-faint" aria-hidden />
      </MenuButton>
      <MenuItems anchor="bottom end" transition className={cx(POPOVER_PANEL, 'w-72')}>
        <MenuSection>
          <MenuHeading className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
            Switch user
          </MenuHeading>
          {users.map((u) => (
            <MenuItem key={u.id}>
              <button type="button" className={cx(POPOVER_ITEM, 'py-2')} onClick={() => switchUser(u.id)}>
                <Avatar user={u} size="md" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    {u.name} <RoleBadge role={u.role} />
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {u.role === 'admin' ? 'Sees & edits everything' : 'Sees granted spaces & lists'}
                  </span>
                </span>
                <Check className={cx('size-4 text-brand-600', u.id !== user.id && 'invisible')} aria-hidden />
              </button>
            </MenuItem>
          ))}
        </MenuSection>
        <MenuSeparator className="my-1 h-px bg-line" />
        <MenuItem>
          <button type="button" className={POPOVER_ITEM} onClick={onShowShortcuts}>
            <Keyboard className="size-4 text-ink-muted" aria-hidden /> Keyboard shortcuts
            <span className="ml-auto text-xs text-ink-faint">?</span>
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={POPOVER_ITEM} onClick={resetData}>
            <RotateCcw className="size-4 text-ink-muted" aria-hidden /> Reset demo data
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  )
}
