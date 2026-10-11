import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react'
import { Archive, ChevronRight, FolderOpen, Lock, MoreHorizontal, Pencil, Plus, Shield } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useListTaskCount } from '../../../controllers/useContainerInsights'
import type { SidebarController } from '../../../controllers/useSidebarController'
import type { TreeNode } from '../../../models/permissions'
import { CHILD_TYPE, NAME_MAX } from '../../../models/validation'
import { IconButton } from '../../common/Button'
import { TYPE_ICONS } from '../../common/icons'
import { cx, FOCUS_RING, POPOVER_ITEM, POPOVER_ITEM_DANGER, POPOVER_PANEL } from '../../common/styles'
import { TreeGroup } from './TreeGroup'

/** Indentation by depth — class map instead of inline styles. */
const INDENT = ['pl-1', 'pl-5', 'pl-9', 'pl-[3.25rem]']
/** Aligns the "No lists yet" hint with where a child's label would start. */
const EMPTY_INDENT = ['pl-10', 'pl-14', 'pl-18', 'pl-22']

export function TreeItem({ node, depth, ctl }: { node: TreeNode; depth: number; ctl: SidebarController }) {
  const { container, children } = node
  const isList = container.type === 'list'
  const expanded = !ctl.collapsedIds.includes(container.id)
  const selected = isList && ctl.selectedListId === container.id
  const renaming = ctl.renamingId === container.id
  const childType = CHILD_TYPE[container.type]

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: container.id,
    disabled: !ctl.isAdmin || renaming,
  })

  const Icon = container.type === 'folder' && expanded ? FolderOpen : TYPE_ICONS[container.type]
  const activate = () => (isList ? ctl.selectList(container.id) : ctl.toggle(container.id))

  return (
    <li
      ref={setNodeRef}
      // dnd-kit requires the transform as an inline style (documented exception).
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cx('relative', isDragging && 'z-10 opacity-80')}
    >
      {/* Row = main button (activates + drag handle) and, beside it, admin actions — never nested. */}
      <div
        className={cx(
          'group flex h-8 items-center rounded-control pr-1 text-sm transition-colors',
          selected
            ? 'bg-brand-50 font-medium text-brand-700'
            : 'text-ink-soft hover:bg-sunken hover:text-ink has-[[data-open]]:bg-sunken has-[[data-open]]:text-ink',
          isDragging && 'bg-surface shadow-drag',
        )}
      >
        <div
          ref={setActivatorNodeRef}
          // Sortable a11y attributes only when reordering is allowed (members can't drag).
          {...(ctl.isAdmin ? attributes : {})}
          {...listeners}
          role="button"
          tabIndex={0}
          aria-expanded={isList ? undefined : expanded}
          aria-current={selected ? 'page' : undefined}
          aria-roledescription={ctl.isAdmin ? 'Sortable item' : undefined}
          onClick={activate}
          onKeyDown={(e) => {
            if (renaming) return
            if (e.key === 'Enter') activate()
            else if (e.key === 'ArrowRight' && !isList && !expanded) ctl.toggle(container.id)
            else if (e.key === 'ArrowLeft' && !isList && expanded) ctl.toggle(container.id)
            else listeners?.onKeyDown?.(e)
          }}
          className={cx(
            'flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-control select-none',
            INDENT[depth] ?? INDENT[INDENT.length - 1],
            FOCUS_RING,
          )}
        >
          {isList ? (
            <span className="size-4 shrink-0" />
          ) : (
            <ChevronRight
              className={cx('size-4 shrink-0 text-ink-faint transition-transform duration-150', expanded && 'rotate-90')}
              aria-hidden
            />
          )}
          <Icon className={cx('size-4 shrink-0', selected ? 'text-brand-600' : container.type === 'space' ? 'text-brand-500' : 'text-ink-muted')} aria-hidden />

          {renaming ? (
            <RenameInput initial={container.name} onSubmit={(name) => ctl.rename(container.id, name)} onCancel={() => ctl.setRenamingId(null)} />
          ) : (
            <span className={cx('min-w-0 flex-1 truncate', container.type === 'space' && 'font-medium')}>{container.name}</span>
          )}

          {!renaming && container.visibility === 'private' && <Lock className="size-3 shrink-0 text-ink-faint" aria-label="Private" />}
          {!renaming && isList && <ListCount listId={container.id} hideOnHover={ctl.isAdmin} />}
        </div>

        {!renaming && ctl.isAdmin && (
          // Visible on hover/focus — and kept visible while its menu is open (the menu panel is
          // portaled outside the row, so hover/focus alone would hide the button it's anchored to).
          <span className="hidden shrink-0 items-center group-focus-within:flex group-hover:flex has-[[data-open]]:flex">
            {childType && (
              <IconButton icon={Plus} label={`New ${childType} in ${container.name}`} size="xs" onClick={() => ctl.startCreate(container)} />
            )}
            <NodeMenu node={node} ctl={ctl} />
          </span>
        )}
      </div>

      {!isList && expanded && children.length > 0 && <TreeGroup nodes={children} depth={depth + 1} ctl={ctl} />}
      {!isList && expanded && children.length === 0 && (
        <p className={cx('flex h-7 items-center text-xs text-ink-faint italic', EMPTY_INDENT[depth] ?? EMPTY_INDENT[3])}>
          {childType ? `No ${childType}s yet` : 'Empty'}
        </p>
      )}
    </li>
  )
}

function ListCount({ listId, hideOnHover }: { listId: string; hideOnHover: boolean }) {
  const count = useListTaskCount(listId)
  return (
    <span className={cx('shrink-0 px-1 text-xs text-ink-faint tabular-nums', hideOnHover && 'group-focus-within:hidden group-hover:hidden group-has-[[data-open]]:hidden')}>
      {count}
    </span>
  )
}

function NodeMenu({ node, ctl }: { node: TreeNode; ctl: SidebarController }) {
  const { container } = node
  const childType = CHILD_TYPE[container.type]
  return (
    <Menu>
      <MenuButton className={cx('rounded-md p-1 text-ink-muted hover:bg-line hover:text-ink data-open:bg-line', FOCUS_RING)} aria-label={`More actions for ${container.name}`} title="More actions">
        <MoreHorizontal className="size-3.5" aria-hidden />
      </MenuButton>
      <MenuItems anchor="bottom start" transition className={cx(POPOVER_PANEL, 'w-48')}>
        <MenuItem>
          <button type="button" className={POPOVER_ITEM} onClick={() => ctl.setRenamingId(container.id)}>
            <Pencil className="size-4 text-ink-muted" aria-hidden /> Rename
          </button>
        </MenuItem>
        {childType && (
          <MenuItem>
            <button type="button" className={POPOVER_ITEM} onClick={() => ctl.startCreate(container)}>
              <Plus className="size-4 text-ink-muted" aria-hidden /> New {childType}
            </button>
          </MenuItem>
        )}
        <MenuItem>
          <button type="button" className={POPOVER_ITEM} onClick={() => ctl.setDialog({ kind: 'share', container })}>
            <Shield className="size-4 text-ink-muted" aria-hidden /> Sharing & access
          </button>
        </MenuItem>
        <MenuSeparator className="my-1 h-px bg-line" />
        <MenuItem>
          <button
            type="button"
            className={POPOVER_ITEM_DANGER}
            onClick={() => ctl.setDialog({ kind: 'archive', container })}
          >
            <Archive className="size-4" aria-hidden /> Archive
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  )
}

function RenameInput({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string
  onSubmit: (name: string) => Promise<unknown>
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)

  useEffect(() => {
    ref.current?.select()
  }, [])

  const submit = async () => {
    if (submitting.current) return
    if (!value.trim() || value.trim() === initial) return onCancel()
    submitting.current = true
    await onSubmit(value)
    submitting.current = false
  }

  return (
    <input
      ref={ref}
      value={value}
      maxLength={NAME_MAX}
      aria-label="Rename"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') void submit()
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => void submit()}
      className="h-6 min-w-0 flex-1 rounded border border-brand-500 bg-surface px-1.5 text-sm text-ink ring-2 ring-brand-100 outline-none"
    />
  )
}
