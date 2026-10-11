import { useCallback, useState } from 'react'
import { CHILD_TYPE } from '../models/validation'
import type { Container, ContainerType, ErrorCode, GrantMode, ID, Visibility } from '../models/types'
import { useAppDispatch, useAppSelector } from '../store'
import {
  selectArchivedContainers,
  selectIsAdmin,
  selectVisibleTree,
  selectWorkspace,
} from '../store/selectors'
import {
  archiveContainer,
  createContainer,
  renameContainer,
  reorderContainer,
  restoreContainer,
  setGrant,
  setVisibility,
} from '../store/services/containerService'
import { openList } from '../store/services/loadService'
import { nodeExpanded, nodeToggled } from '../store/slices/ui'
import { useRun } from './useToast'

/** Errors the create form shows next to the field instead of as a toast. */
export const INLINE_FORM_ERRORS: ErrorCode[] = ['VALIDATION', 'CONFLICT', 'INVALID_PARENT']

export type SidebarDialog =
  | { kind: 'create'; type: Exclude<ContainerType, 'workspace'>; parent: Container }
  | { kind: 'share'; container: Container }
  | { kind: 'archive'; container: Container }
  | null

export function useSidebarController() {
  const dispatch = useAppDispatch()
  const run = useRun()
  const tree = useAppSelector(selectVisibleTree)
  const workspace = useAppSelector(selectWorkspace)
  const archived = useAppSelector(selectArchivedContainers)
  const isAdmin = useAppSelector(selectIsAdmin)
  const ready = useAppSelector((s) => s.session.ready)
  const selectedListId = useAppSelector((s) => s.ui.selectedListId)
  const collapsedIds = useAppSelector((s) => s.ui.collapsedIds)

  const [dialog, setDialog] = useState<SidebarDialog>(null)
  const [renamingId, setRenamingId] = useState<ID | null>(null)
  const [busy, setBusy] = useState(false)

  const selectList = useCallback((listId: ID) => void dispatch(openList(listId)), [dispatch])
  const toggle = useCallback((id: ID) => dispatch(nodeToggled(id)), [dispatch])

  const startCreate = useCallback((parent: Container) => {
    const type = CHILD_TYPE[parent.type]
    if (type && type !== 'workspace') setDialog({ kind: 'create', type, parent })
  }, [])

  const create = useCallback(
    async (name: string, visibility: Visibility) => {
      if (dialog?.kind !== 'create') return
      setBusy(true)
      const result = await run(
        () => createContainer({ type: dialog.type, name, parentId: dialog.parent.id, visibility }),
        { success: (c) => `${capitalize(c.type)} “${c.name}” created`, inlineErrors: INLINE_FORM_ERRORS },
      )
      setBusy(false)
      if (result.data) {
        dispatch(nodeExpanded(dialog.parent.id))
        setDialog(null)
        if (result.data.type === 'list') selectList(result.data.id)
      }
      return result
    },
    [dialog, run, dispatch, selectList],
  )

  const rename = useCallback(
    async (id: ID, name: string) => {
      const result = await run(() => renameContainer(id, name))
      if (result.data) setRenamingId(null)
      return result
    },
    [run],
  )

  const reorder = useCallback((id: ID, toIndex: number) => run(() => reorderContainer(id, toIndex)), [run])

  const archive = useCallback(async () => {
    if (dialog?.kind !== 'archive') return
    setBusy(true)
    const target = dialog.container
    const result = await run(() => archiveContainer(target.id), {
      success: `“${target.name}” archived`,
      successAction: () => ({ label: 'Undo', onClick: () => void run(() => restoreContainer(target.id), { success: `“${target.name}” restored` }) }),
    })
    setBusy(false)
    if (result.data) setDialog(null)
  }, [dialog, run])

  const restore = useCallback(
    (container: Container) => run(() => restoreContainer(container.id), { success: `“${container.name}” restored` }),
    [run],
  )

  const changeVisibility = useCallback(
    (id: ID, visibility: Visibility) =>
      run(() => setVisibility(id, visibility), { success: `Now ${visibility}` }),
    [run],
  )

  const changeGrant = useCallback(
    (resourceId: ID, userId: ID, mode: GrantMode | null) => run(() => setGrant(resourceId, userId, mode), { success: 'Access updated' }),
    [run],
  )

  return {
    tree,
    workspace,
    archived,
    isAdmin,
    ready,
    selectedListId,
    collapsedIds,
    dialog,
    setDialog,
    renamingId,
    setRenamingId,
    busy,
    selectList,
    toggle,
    startCreate,
    create,
    rename,
    reorder,
    archive,
    restore,
    changeVisibility,
    changeGrant,
  }
}

export type SidebarController = ReturnType<typeof useSidebarController>

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
