import { describe, expect, it } from 'vitest'
import { checkViewList, checkViewTask, visibleTree, type TreeNode } from './permissions'
import { createSeed, WORKSPACE_ID } from './seed'
import type { Snapshot } from './types'

const names = (nodes: TreeNode[]): string[] =>
  nodes.flatMap((n) => [n.container.name, ...names(n.children)])

const seed = () => createSeed(new Date('2026-06-01T09:00:00Z'))
const user = (snap: Snapshot, id: string) => snap.users[id]

describe('visibleTree', () => {
  it('shows everything to the admin, including private spaces', () => {
    const snap = seed()
    expect(names(visibleTree(snap, user(snap, 'u_alice'), WORKSPACE_ID))).toEqual([
      'Engineering', 'Q2 Launch', 'Backlog', 'Sprint 12', 'Marketing', 'Campaigns', 'Content Calendar',
    ])
  })

  it('hides private spaces without an allow grant and lists with a deny grant (Bob)', () => {
    const snap = seed()
    expect(names(visibleTree(snap, user(snap, 'u_bob'), WORKSPACE_ID))).toEqual(['Engineering', 'Q2 Launch', 'Backlog'])
  })

  it('shows a private space to a member with an allow grant, inherited by descendants (Carol)', () => {
    const snap = seed()
    expect(names(visibleTree(snap, user(snap, 'u_carol'), WORKSPACE_ID))).toEqual([
      'Engineering', 'Q2 Launch', 'Backlog', 'Sprint 12', 'Marketing', 'Campaigns', 'Content Calendar',
    ])
  })

  it('a deny on an ancestor hides the whole subtree even if a descendant is allowed', () => {
    const snap = seed()
    snap.grants.g1 = { id: 'g1', resourceId: 'sp_eng', userId: 'u_carol', mode: 'deny' }
    snap.grants.g2 = { id: 'g2', resourceId: 'ls_backlog', userId: 'u_carol', mode: 'allow' }
    expect(names(visibleTree(snap, user(snap, 'u_carol'), WORKSPACE_ID))).not.toContain('Backlog')
  })

  it('a private list inside a public folder needs its own allow', () => {
    const snap = seed()
    snap.containers.ls_backlog = { ...snap.containers.ls_backlog, visibility: 'private' }
    expect(names(visibleTree(snap, user(snap, 'u_bob'), WORKSPACE_ID))).not.toContain('Backlog')
    snap.grants.g = { id: 'g', resourceId: 'ls_backlog', userId: 'u_bob', mode: 'allow' }
    expect(names(visibleTree(snap, user(snap, 'u_bob'), WORKSPACE_ID))).toContain('Backlog')
  })

  it('prunes archived containers and their descendants', () => {
    const snap = seed()
    snap.containers.fd_q2 = { ...snap.containers.fd_q2, archivedAt: '2026-06-01T00:00:00Z' }
    const visible = names(visibleTree(snap, user(snap, 'u_alice'), WORKSPACE_ID))
    expect(visible).not.toContain('Q2 Launch')
    expect(visible).not.toContain('Backlog')
  })
})

describe('list & task access', () => {
  it('returns 403 for a denied list and 404 for an unknown one', () => {
    const snap = seed()
    expect(checkViewList(snap, user(snap, 'u_bob'), 'ls_sprint')).toMatchObject({ code: 'FORBIDDEN', status: 403 })
    expect(checkViewList(snap, user(snap, 'u_bob'), 'nope')).toMatchObject({ code: 'NOT_FOUND' })
    expect(checkViewList(snap, user(snap, 'u_alice'), 'ls_sprint')).toBeNull()
  })

  it('denies tasks that live in a hidden list', () => {
    const snap = seed()
    expect(checkViewTask(snap, user(snap, 'u_bob'), 't_10')).toMatchObject({ code: 'FORBIDDEN' })
    expect(checkViewTask(snap, user(snap, 'u_bob'), 't_14')).toMatchObject({ code: 'FORBIDDEN' })
    expect(checkViewTask(snap, user(snap, 'u_bob'), 't_01')).toBeNull()
    expect(checkViewTask(snap, user(snap, 'u_carol'), 't_14')).toBeNull()
  })
})
