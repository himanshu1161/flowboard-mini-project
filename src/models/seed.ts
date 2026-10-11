import type { Container, Grant, Priority, Snapshot, Status, StatusCategory, StatusColor, Task, User } from './types'

export const WORKSPACE_ID = 'ws_acme'

export const USERS: User[] = [
  { id: 'u_alice', name: 'Alice Chen', email: 'alice@acme.dev', role: 'admin', color: 'indigo' },
  { id: 'u_bob', name: 'Bob Martin', email: 'bob@acme.dev', role: 'member', color: 'amber' },
  { id: 'u_carol', name: 'Carol Diaz', email: 'carol@acme.dev', role: 'member', color: 'emerald' },
]

const containers: Container[] = [
  { id: WORKSPACE_ID, name: 'Acme Inc.', type: 'workspace', parentId: null, position: 0, visibility: 'public', archivedAt: null },
  // Spaces
  { id: 'sp_eng', name: 'Engineering', type: 'space', parentId: WORKSPACE_ID, position: 0, visibility: 'public', archivedAt: null },
  { id: 'sp_mkt', name: 'Marketing', type: 'space', parentId: WORKSPACE_ID, position: 1, visibility: 'private', archivedAt: null },
  // Folders
  { id: 'fd_q2', name: 'Q2 Launch', type: 'folder', parentId: 'sp_eng', position: 0, visibility: 'public', archivedAt: null },
  { id: 'fd_campaigns', name: 'Campaigns', type: 'folder', parentId: 'sp_mkt', position: 0, visibility: 'public', archivedAt: null },
  // Lists
  { id: 'ls_backlog', name: 'Backlog', type: 'list', parentId: 'fd_q2', position: 0, visibility: 'public', archivedAt: null },
  { id: 'ls_sprint', name: 'Sprint 12', type: 'list', parentId: 'fd_q2', position: 1, visibility: 'public', archivedAt: null },
  { id: 'ls_content', name: 'Content Calendar', type: 'list', parentId: 'fd_campaigns', position: 0, visibility: 'public', archivedAt: null },
]

type StatusSeed = [id: string, name: string, category: StatusCategory, color: StatusColor]

const statusSets: Record<string, StatusSeed[]> = {
  ls_backlog: [
    ['st_bl_todo', 'To do', 'todo', 'gray'],
    ['st_bl_prog', 'In progress', 'in_progress', 'blue'],
    ['st_bl_done', 'Done', 'done', 'green'],
  ],
  ls_sprint: [
    ['st_sp_todo', 'To do', 'todo', 'gray'],
    ['st_sp_prog', 'In progress', 'in_progress', 'blue'],
    ['st_sp_review', 'In review', 'in_progress', 'violet'],
    ['st_sp_done', 'Done', 'done', 'green'],
  ],
  ls_content: [
    ['st_ct_idea', 'Idea', 'todo', 'gray'],
    ['st_ct_draft', 'Drafting', 'in_progress', 'amber'],
    ['st_ct_pub', 'Published', 'done', 'green'],
  ],
}

/**
 * Sample grants — designed so the Alice/Bob/Carol difference is obvious:
 * - Alice (admin) sees everything.
 * - Bob: Engineering only, and is explicitly denied “Sprint 12”.
 * - Carol: Engineering (public) + the private Marketing space via an allow grant.
 */
const grants: Grant[] = [
  { id: 'gr_bob_sprint', resourceId: 'ls_sprint', userId: 'u_bob', mode: 'deny' },
  { id: 'gr_carol_mkt', resourceId: 'sp_mkt', userId: 'u_carol', mode: 'allow' },
]

type TaskSeed = {
  id: string
  list: string
  status: string
  title: string
  priority?: Priority
  assignees?: string[]
  /** Days from "now"; negative = overdue. */
  due?: number
  description?: string
  parent?: string
}

const taskSeeds: TaskSeed[] = [
  // Backlog
  { id: 't_01', list: 'ls_backlog', status: 'st_bl_todo', title: 'Audit onboarding funnel drop-off', priority: 'high', assignees: ['u_bob'], due: 6, description: 'Pull last 30 days of funnel data and flag steps with >20% drop-off.' },
  { id: 't_02', list: 'ls_backlog', status: 'st_bl_todo', title: 'Spike: evaluate edge caching for API', priority: 'normal', assignees: ['u_carol'], due: 12 },
  { id: 't_03', list: 'ls_backlog', status: 'st_bl_todo', title: 'Design empty states for dashboard', priority: 'low', due: 20 },
  { id: 't_04', list: 'ls_backlog', status: 'st_bl_todo', title: 'Add rate limiting to public endpoints', priority: 'urgent', assignees: ['u_alice', 'u_bob'], due: -2, description: 'Abuse spike last week. Start with 100 req/min per token.' },
  { id: 't_05', list: 'ls_backlog', status: 'st_bl_prog', title: 'Migrate settings page to new form library', priority: 'normal', assignees: ['u_bob'], due: 3 },
  { id: 't_06', list: 'ls_backlog', status: 'st_bl_prog', title: 'Write ADR for event bus', priority: 'none', assignees: ['u_alice'] },
  { id: 't_07', list: 'ls_backlog', status: 'st_bl_done', title: 'Set up error tracking', priority: 'high', assignees: ['u_carol'], due: -5 },
  { id: 't_04a', list: 'ls_backlog', status: 'st_bl_done', title: 'Pick rate limiting strategy', parent: 't_04', assignees: ['u_alice'] },
  { id: 't_04b', list: 'ls_backlog', status: 'st_bl_todo', title: 'Add 429 handling in the web client', parent: 't_04', assignees: ['u_bob'] },
  // Sprint 12
  { id: 't_08', list: 'ls_sprint', status: 'st_sp_todo', title: 'Kanban drag-and-drop polish', priority: 'high', assignees: ['u_carol'], due: 2 },
  { id: 't_09', list: 'ls_sprint', status: 'st_sp_todo', title: 'Fix timezone bug in due dates', priority: 'urgent', assignees: ['u_alice'], due: -1, description: 'Due dates render a day early for users west of UTC.' },
  { id: 't_10', list: 'ls_sprint', status: 'st_sp_prog', title: 'Permission checks in task API', priority: 'high', assignees: ['u_alice', 'u_carol'], due: 1 },
  { id: 't_11', list: 'ls_sprint', status: 'st_sp_prog', title: 'Release notes for v2.4', priority: 'low', assignees: ['u_carol'], due: 4 },
  { id: 't_12', list: 'ls_sprint', status: 'st_sp_review', title: 'Sidebar tree keyboard navigation', priority: 'normal', assignees: ['u_alice'], due: 0 },
  { id: 't_13', list: 'ls_sprint', status: 'st_sp_done', title: 'Upgrade to React 19', priority: 'normal', assignees: ['u_alice'], due: -7 },
  // Content calendar
  { id: 't_14', list: 'ls_content', status: 'st_ct_idea', title: 'Customer story: Northwind', priority: 'normal', assignees: ['u_carol'], due: 14 },
  { id: 't_15', list: 'ls_content', status: 'st_ct_idea', title: 'Webinar: planning Q3 roadmaps', priority: 'low', due: 25 },
  { id: 't_16', list: 'ls_content', status: 'st_ct_draft', title: 'Launch blog post for v2.4', priority: 'urgent', assignees: ['u_carol', 'u_alice'], due: 3, description: '## Outline\n- What changed\n- Why it matters\n- How to try it' },
  { id: 't_17', list: 'ls_content', status: 'st_ct_draft', title: 'Newsletter — June edition', priority: 'high', assignees: ['u_carol'], due: -3 },
  { id: 't_18', list: 'ls_content', status: 'st_ct_pub', title: 'Pricing page refresh announcement', priority: 'normal', assignees: ['u_alice'], due: -10 },
]

const DAY = 24 * 60 * 60 * 1000

/** Build a fresh, fully-populated snapshot. Due dates are relative to `now`. */
export function createSeed(now: Date = new Date()): Snapshot {
  const nowIso = now.toISOString()
  const dueIn = (offsetDays: number) => {
    const d = new Date(now.getTime() + offsetDays * DAY)
    d.setHours(17, 0, 0, 0)
    return d.toISOString()
  }

  const statuses: Status[] = Object.entries(statusSets).flatMap(([listId, set]) =>
    set.map(([id, name, category, color], position) => ({ id, listId, name, category, color, position })),
  )

  const positions = new Map<string, number>()
  const tasks: Task[] = taskSeeds.map((seed) => {
    const key = seed.parent ?? `${seed.list}:${seed.status}`
    const position = positions.get(key) ?? 0
    positions.set(key, position + 1)
    return {
      id: seed.id,
      listId: seed.list,
      parentTaskId: seed.parent ?? null,
      title: seed.title,
      description: seed.description ?? '',
      statusId: seed.status,
      priority: seed.priority ?? 'none',
      assigneeIds: seed.assignees ?? [],
      dueDate: seed.due === undefined ? null : dueIn(seed.due),
      position,
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
    }
  })

  const byId = <T extends { id: string }>(items: T[]) => Object.fromEntries(items.map((i) => [i.id, i]))
  return {
    users: byId(USERS),
    containers: byId(containers),
    statuses: byId(statuses),
    tasks: byId(tasks),
    grants: byId(grants),
  }
}
