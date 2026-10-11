import { describe, expect, it } from 'vitest'
import { BOB, CAROL, freshStore, storeAs } from '../test/utils'
import {
  selectBoardColumns,
  selectListRows,
  selectTaskAccess,
  selectVisibleLists,
  selectVisibleTree,
} from './selectors'
import {
  archiveContainer,
  createContainer,
  renameContainer,
  reorderContainer,
  restoreContainer,
  setGrant,
} from './services/containerService'
import { openList } from './services/loadService'
import { createTask, deleteTask, moveTask, restoreTask, updateTask } from './services/taskService'
import { patchApplied } from './slices/entities'
import { userSwitched } from './slices/session'
import { sortChanged } from './slices/ui'

const columnTitles = (store: ReturnType<typeof freshStore>, listId: string) =>
  Object.fromEntries(selectBoardColumns(store.getState(), listId).map((c) => [c.status.name, c.tasks.map((t) => t.id)]))

describe('store isolation', () => {
  it('each store starts from a fresh seed', async () => {
    const a = freshStore()
    await a.dispatch(deleteTask('t_01'))
    const b = freshStore()
    expect(b.getState().tasks.t_01.deletedAt).toBeNull()
  })
})

describe('permissions in selectors', () => {
  it('switching user immediately changes the visible tree', () => {
    const store = freshStore()
    expect(selectVisibleTree(store.getState()).map((n) => n.container.name)).toEqual(['Engineering', 'Marketing'])
    store.dispatch(userSwitched(BOB))
    expect(selectVisibleTree(store.getState()).map((n) => n.container.name)).toEqual(['Engineering'])
    store.dispatch(userSwitched(CAROL))
    expect(selectVisibleTree(store.getState()).map((n) => n.container.name)).toEqual(['Engineering', 'Marketing'])
  })

  it('board selectors return nothing for a denied list', () => {
    const store = storeAs(BOB)
    expect(selectBoardColumns(store.getState(), 'ls_sprint')).toEqual([])
    expect(selectListRows(store.getState(), 'ls_content')).toEqual([])
    expect(selectBoardColumns(store.getState(), 'ls_backlog').length).toBe(3)
  })

  it('task access is 403 for tasks in hidden lists', () => {
    const store = storeAs(BOB)
    expect(selectTaskAccess(store.getState(), 't_10').error?.code).toBe('FORBIDDEN')
    expect(selectTaskAccess(store.getState(), 't_01').data?.id).toBe('t_01')
  })

  it('move-to-list options only include visible lists', () => {
    const store = storeAs(BOB)
    expect(selectVisibleLists(store.getState()).map((l) => l.list.id)).toEqual(['ls_backlog'])
  })

  it('opening a denied list resolves to a 403 error state', async () => {
    const store = storeAs(BOB)
    const result = await store.dispatch(openList('ls_sprint'))
    expect(result.error).toMatchObject({ code: 'FORBIDDEN', status: 403 })
    expect(store.getState().ui.listLoad.status).toBe('error')
  })
})

describe('permissions on mutations (enforced in the store, not only the UI)', () => {
  it('a member cannot update, move or delete a task in a denied list', async () => {
    const store = storeAs(BOB)
    const before = store.getState().tasks.t_10
    expect((await store.dispatch(updateTask('t_10', { title: 'hack' }))).error?.code).toBe('FORBIDDEN')
    expect((await store.dispatch(moveTask('t_10', { toStatusId: 'st_sp_done' }))).error?.code).toBe('FORBIDDEN')
    expect((await store.dispatch(deleteTask('t_10'))).error?.code).toBe('FORBIDDEN')
    expect(store.getState().tasks.t_10).toEqual(before)
  })

  it('a member cannot move a visible task into a denied list', async () => {
    const store = storeAs(BOB)
    const result = await store.dispatch(moveTask('t_01', { toListId: 'ls_sprint' }))
    expect(result.error?.code).toBe('FORBIDDEN')
    expect(store.getState().tasks.t_01.listId).toBe('ls_backlog')
  })

  it('a member cannot create tasks in a denied list', async () => {
    const store = storeAs(BOB)
    const result = await store.dispatch(createTask({ listId: 'ls_content', title: 'Sneaky' }))
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('members can edit tasks in lists they can see', async () => {
    const store = storeAs(BOB)
    const result = await store.dispatch(updateTask('t_01', { priority: 'urgent' }))
    expect(result.data?.priority).toBe('urgent')
  })

  it('only admins manage containers', async () => {
    const store = storeAs(CAROL)
    expect((await store.dispatch(renameContainer('ls_backlog', 'Mine'))).error?.code).toBe('FORBIDDEN')
    expect((await store.dispatch(archiveContainer('sp_eng'))).error?.code).toBe('FORBIDDEN')
    expect((await store.dispatch(setGrant('ls_sprint', BOB, null))).error?.code).toBe('FORBIDDEN')
  })

  it('an admin grant change takes effect immediately for the member', async () => {
    const store = freshStore()
    await store.dispatch(setGrant('ls_sprint', BOB, null))
    await store.dispatch(setGrant('sp_mkt', BOB, 'allow'))
    store.dispatch(userSwitched(BOB))
    expect(selectVisibleLists(store.getState()).map((l) => l.list.id)).toEqual(['ls_backlog', 'ls_sprint', 'ls_content'])
  })
})

describe('task rules', () => {
  it('creates a task at the end of the default status column', async () => {
    const store = freshStore()
    const result = await store.dispatch(createTask({ listId: 'ls_backlog', title: '  New task  ' }))
    expect(result.data).toMatchObject({ title: 'New task', statusId: 'st_bl_todo', position: 4, priority: 'none' })
  })

  it('validates title length, status and assignees', async () => {
    const store = freshStore()
    expect((await store.dispatch(createTask({ listId: 'ls_backlog', title: '' }))).error?.code).toBe('VALIDATION')
    expect((await store.dispatch(createTask({ listId: 'ls_backlog', title: 'x'.repeat(501) }))).error?.code).toBe('VALIDATION')
    expect((await store.dispatch(createTask({ listId: 'ls_backlog', title: 'x'.repeat(500) }))).data).toBeDefined()
    expect(
      (await store.dispatch(createTask({ listId: 'ls_backlog', title: 'x', statusId: 'st_sp_todo' }))).error?.code,
    ).toBe('INVALID_STATUS')
    expect((await store.dispatch(updateTask('t_01', { assigneeIds: ['ghost'] }))).error?.code).toBe('VALIDATION')
    expect((await store.dispatch(updateTask('t_01', { statusId: 'st_ct_idea' }))).error?.code).toBe('INVALID_STATUS')
  })

  it('rejects stale updates with a CONFLICT', async () => {
    const store = freshStore()
    const opened = store.getState().tasks.t_01.updatedAt
    await new Promise((r) => setTimeout(r, 2))
    await store.dispatch(updateTask('t_01', { title: 'Edited elsewhere' }))
    const result = await store.dispatch(updateTask('t_01', { title: 'Mine' }, opened))
    expect(result.error?.code).toBe('CONFLICT')
    expect(store.getState().tasks.t_01.title).toBe('Edited elsewhere')
  })

  it('reorders within a column and keeps positions dense', async () => {
    const store = freshStore()
    await store.dispatch(moveTask('t_04', { toStatusId: 'st_bl_todo', toIndex: 0 }))
    expect(columnTitles(store, 'ls_backlog')['To do']).toEqual(['t_04', 't_01', 't_02', 't_03'])
    const positions = ['t_04', 't_01', 't_02', 't_03'].map((id) => store.getState().tasks[id].position)
    expect(positions).toEqual([0, 1, 2, 3])
  })

  it('moving across columns updates status and re-indexes both columns', async () => {
    const store = freshStore()
    await store.dispatch(moveTask('t_01', { toStatusId: 'st_bl_done', toIndex: 0 }))
    const cols = columnTitles(store, 'ls_backlog')
    expect(cols['To do']).toEqual(['t_02', 't_03', 't_04'])
    expect(cols.Done).toEqual(['t_01', 't_07'])
    expect(store.getState().tasks.t_02.position).toBe(0)
  })

  it('moving to another list remaps status by category and carries subtasks', async () => {
    const store = freshStore()
    const result = await store.dispatch(moveTask('t_04', { toListId: 'ls_sprint' }))
    expect(result.data).toMatchObject({ listId: 'ls_sprint', statusId: 'st_sp_todo' })
    const { t_04a, t_04b } = store.getState().tasks
    expect(t_04a).toMatchObject({ listId: 'ls_sprint', statusId: 'st_sp_done' })
    expect(t_04b).toMatchObject({ listId: 'ls_sprint', statusId: 'st_sp_todo' })
  })

  it('a subtask cannot be moved to another list on its own', async () => {
    const store = freshStore()
    expect((await store.dispatch(moveTask('t_04a', { toListId: 'ls_sprint' }))).error?.code).toBe('VALIDATION')
  })

  it('enforces one level of subtasks', async () => {
    const store = freshStore()
    const result = await store.dispatch(createTask({ listId: 'ls_backlog', title: 'Nested', parentTaskId: 't_04a' }))
    expect(result.error?.message).toMatch(/one level/)
    const crossList = await store.dispatch(createTask({ listId: 'ls_sprint', title: 'x', parentTaskId: 't_04' }))
    expect(crossList.error?.code).toBe('VALIDATION')
  })

  it('soft-deletes a task with its subtasks and restores both', async () => {
    const store = freshStore()
    await store.dispatch(deleteTask('t_04'))
    expect(store.getState().tasks.t_04.deletedAt).not.toBeNull()
    expect(store.getState().tasks.t_04a.deletedAt).not.toBeNull()
    expect(columnTitles(store, 'ls_backlog')['To do']).toEqual(['t_01', 't_02', 't_03'])
    expect((await store.dispatch(updateTask('t_04', { title: 'x' }))).error?.code).toBe('NOT_FOUND')

    await store.dispatch(restoreTask('t_04'))
    expect(columnTitles(store, 'ls_backlog')['To do']).toEqual(['t_01', 't_02', 't_03', 't_04'])
    expect(store.getState().tasks.t_04a.deletedAt).toBeNull()
  })

  it('list view sorts by priority and due date with empty values last', () => {
    const store = freshStore()
    store.dispatch(sortChanged('priority'))
    const byPriority = selectListRows(store.getState(), 'ls_backlog').map((t) => t.priority)
    expect(byPriority).toEqual(['urgent', 'high', 'high', 'normal', 'normal', 'low', 'none'])
    store.dispatch(sortChanged('dueDate'))
    const due = selectListRows(store.getState(), 'ls_backlog').map((t) => t.dueDate)
    expect(due.slice(-1)).toEqual([null])
    const dated = due.filter(Boolean).map((d) => Date.parse(d!))
    expect(dated).toEqual([...dated].sort((a, b) => a - b))
  })
})

describe('container rules', () => {
  it('enforces valid parent types', async () => {
    const store = freshStore()
    const listInSpace = await store.dispatch(createContainer({ type: 'list', name: 'Bad', parentId: 'sp_eng' }))
    expect(listInSpace.error?.code).toBe('INVALID_PARENT')
    const folderInList = await store.dispatch(createContainer({ type: 'folder', name: 'Bad', parentId: 'ls_backlog' }))
    expect(folderInList.error?.code).toBe('INVALID_PARENT')
    const missing = await store.dispatch(createContainer({ type: 'folder', name: 'Bad', parentId: 'nope' }))
    expect(missing.error?.code).toBe('INVALID_PARENT')
  })

  it('creates a list with the default status set', async () => {
    const store = freshStore()
    const result = await store.dispatch(createContainer({ type: 'list', name: 'Bugs', parentId: 'fd_q2' }))
    const statuses = selectBoardColumns(store.getState(), result.data!.id).map((c) => c.status.category)
    expect(statuses).toEqual(['todo', 'in_progress', 'done'])
  })

  it('rejects duplicate sibling names', async () => {
    const store = freshStore()
    const result = await store.dispatch(createContainer({ type: 'list', name: 'backlog', parentId: 'fd_q2' }))
    expect(result.error?.code).toBe('CONFLICT')
  })

  it('reorders siblings', async () => {
    const store = freshStore()
    await store.dispatch(reorderContainer('sp_mkt', 0))
    expect(selectVisibleTree(store.getState()).map((n) => n.container.id)).toEqual(['sp_mkt', 'sp_eng'])
  })

  it('restoring an archived container puts it back in its original position', async () => {
    const store = freshStore()
    await store.dispatch(archiveContainer('ls_backlog'))
    await store.dispatch(restoreContainer('ls_backlog'))
    const q2 = selectVisibleTree(store.getState())[0].children[0]
    expect(q2.children.map((n) => n.container.id)).toEqual(['ls_backlog', 'ls_sprint'])
  })

  it('archiving hides the subtree and its tasks; restore requires an active parent', async () => {
    const store = freshStore()
    await store.dispatch(archiveContainer('fd_q2'))
    await store.dispatch(archiveContainer('sp_eng'))
    expect(selectVisibleTree(store.getState()).map((n) => n.container.id)).toEqual(['sp_mkt'])
    expect(selectTaskAccess(store.getState(), 't_01').error?.code).toBe('NOT_FOUND')
    expect((await store.dispatch(createTask({ listId: 'ls_backlog', title: 'x' }))).error).toBeDefined()

    expect((await store.dispatch(restoreContainer('fd_q2'))).error?.code).toBe('INVALID_PARENT')
    await store.dispatch(restoreContainer('sp_eng'))
    await store.dispatch(restoreContainer('fd_q2'))
    expect(selectTaskAccess(store.getState(), 't_01').data).toBeDefined()
  })
})

describe('simulated failures', () => {
  it('rolls back an optimistic move when the request fails', async () => {
    const store = freshStore({ simulation: { failuresEnabled: true, failureRate: 1 } })
    const before = columnTitles(store, 'ls_backlog')
    const pending = store.dispatch(moveTask('t_01', { toStatusId: 'st_bl_done', toIndex: 0 }))
    // Optimistic: applied before the request resolves.
    expect(store.getState().tasks.t_01.statusId).toBe('st_bl_done')
    const result = await pending
    expect(result.error?.code).toBe('NETWORK')
    expect(columnTitles(store, 'ls_backlog')).toEqual(before)
  })

  it('does not apply non-optimistic changes when the request fails', async () => {
    const store = freshStore({ simulation: { failuresEnabled: true, failureRate: 1 } })
    const result = await store.dispatch(updateTask('t_01', { title: 'Lost' }))
    expect(result.error?.code).toBe('NETWORK')
    expect(store.getState().tasks.t_01.title).not.toBe('Lost')
  })

  it('re-checks permissions after the request (user lost access mid-flight)', async () => {
    const store = freshStore({ simulation: { latencyMs: 5 } })
    store.dispatch(userSwitched(BOB))
    const pending = store.dispatch(updateTask('t_01', { title: 'Late' }))
    // An admin revokes access while the request is in flight.
    store.dispatch(patchApplied({ upsert: { grants: [{ id: 'g', resourceId: 'ls_backlog', userId: BOB, mode: 'deny' }] } }))
    expect((await pending).error?.code).toBe('FORBIDDEN')
  })
})
