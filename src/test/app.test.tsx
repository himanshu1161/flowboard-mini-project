import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { drawerOpened } from '../store/slices/ui'
import { userSwitched } from '../store/slices/session'
import { dayKey, isoToDayKey } from '../views/common/format'
import { freshStore } from './utils'

/** Render the full app against a fresh, zero-latency store. */
async function renderApp(store = freshStore()) {
  const user = userEvent.setup()
  render(<App store={store} />)
  // Bootstrap opens the first visible list (Backlog) once the "fetch" resolves.
  await screen.findByRole('heading', { name: /Backlog/ })
  return { store, user }
}

const sidebar = () => screen.getByRole('complementary', { name: 'Workspace navigation' })

describe('App (component tests)', () => {
  it('switching user immediately changes the sidebar tree', async () => {
    const { user } = await renderApp()
    expect(within(sidebar()).getByText('Marketing')).toBeInTheDocument()
    expect(within(sidebar()).getByText('Sprint 12')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Viewing as Alice Chen/ }))
    await user.click(await screen.findByRole('menuitem', { name: /Bob Martin/ }))

    expect(within(sidebar()).queryByText('Marketing')).not.toBeInTheDocument()
    expect(within(sidebar()).queryByText('Sprint 12')).not.toBeInTheDocument()
    expect(within(sidebar()).getByText('Backlog')).toBeInTheDocument()
    expect(await screen.findByText('Now viewing as Bob')).toBeInTheDocument()
  })

  it('shows a 403 state when the open list becomes inaccessible', async () => {
    const { store, user } = await renderApp()
    await user.click(within(sidebar()).getByRole('button', { name: /^Sprint 12/ }))
    await screen.findByRole('heading', { name: /Sprint 12/ })

    store.dispatch(userSwitched('u_bob'))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Permission denied')
    expect(alert).toHaveTextContent('403')
    expect(screen.queryByText('Fix timezone bug in due dates')).not.toBeInTheDocument()
  })

  it('renders kanban columns with cards and creates a task via quick add', async () => {
    const { user } = await renderApp()
    const todo = screen.getByRole('region', { name: 'To do column' })
    expect(within(todo).getByRole('button', { name: 'Audit onboarding funnel drop-off' })).toBeInTheDocument()

    await user.click(within(todo).getByRole('button', { name: 'Add task' }))
    await user.type(within(todo).getByRole('textbox', { name: 'New task title' }), 'Write migration guide{Enter}')
    expect(await within(todo).findByRole('button', { name: 'Write migration guide' })).toBeInTheDocument()
    // The composer closes after a successful add, and a success toast confirms it.
    expect(within(todo).queryByRole('textbox', { name: 'New task title' })).not.toBeInTheDocument()
    expect(await screen.findByText('“Write migration guide” created')).toBeInTheDocument()
  })

  it('list view sorts by priority', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('tab', { name: /List/ }))
    await user.click(screen.getByRole('button', { name: /Priority/ }))

    const rows = within(screen.getByRole('table', { name: 'Tasks' })).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Add rate limiting to public endpoints')
    expect(rows[0]).toHaveTextContent('Urgent')
    expect(rows.at(-1)).toHaveTextContent('Write ADR for event bus') // no priority sorts last
  })

  it('task drawer edits a field and closes on Escape', async () => {
    const { store, user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'Audit onboarding funnel drop-off' }))
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).getByRole('textbox', { name: 'Task title' })).toHaveValue('Audit onboarding funnel drop-off')

    await user.click(within(drawer).getByRole('button', { name: 'Priority' }))
    await user.click(await screen.findByRole('option', { name: 'Urgent' }))
    await waitFor(() => expect(store.getState().tasks.t_01.priority).toBe('urgent'))
    expect(await within(drawer).findByText('Saved')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('opens a subtask from its parent and goes back with the Back button', async () => {
    const { store, user } = await renderApp()
    store.dispatch(drawerOpened('t_04'))
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).queryByRole('button', { name: /^Back to/ })).not.toBeInTheDocument() // top-level task: no Back

    await user.click(within(drawer).getByRole('button', { name: 'Add 429 handling in the web client' }))
    expect(within(drawer).getByRole('textbox', { name: 'Task title' })).toHaveValue('Add 429 handling in the web client')

    await user.click(within(drawer).getByRole('button', { name: 'Back to Add rate limiting to public endpoints' }))
    expect(within(drawer).getByRole('textbox', { name: 'Task title' })).toHaveValue('Add rate limiting to public endpoints')
  })

  it('sets a due date with the date picker (quick pick and keyboard) and clears it', async () => {
    const { store, user } = await renderApp()
    store.dispatch(drawerOpened('t_06')) // seed task without a due date
    const drawer = await screen.findByRole('dialog')
    const dueDay = () => isoToDayKey(store.getState().tasks.t_06.dueDate!)
    const inDays = (n: number) => dayKey(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + n))

    await user.click(within(drawer).getByRole('button', { name: 'Due date, none' }))
    await user.click(await screen.findByRole('button', { name: 'Tomorrow' }))
    await waitFor(() => expect(dueDay()).toBe(inDays(1)))
    expect(within(drawer).getByRole('button', { name: 'Due date, Tomorrow' })).toBeInTheDocument()

    // Keyboard: the selected day gets focus on open; → moves one day, Enter picks it.
    await user.click(within(drawer).getByRole('button', { name: 'Due date, Tomorrow' }))
    await screen.findByRole('grid')
    await user.keyboard('{ArrowRight}') // separate presses so focus moves before Enter, as in a browser
    await user.keyboard('{Enter}')
    await waitFor(() => expect(dueDay()).toBe(inDays(2)))

    await user.click(within(drawer).getByRole('button', { name: 'Clear due date' }))
    await waitFor(() => expect(store.getState().tasks.t_06.dueDate).toBeNull())
  })

  it('validates the title in the drawer and does not save an empty title', async () => {
    const { store, user } = await renderApp()
    store.dispatch(drawerOpened('t_01'))
    const title = await screen.findByRole('textbox', { name: 'Task title' })
    await user.clear(title)
    expect(await screen.findByText('Title is required.')).toBeInTheDocument()
    await user.tab()
    expect(store.getState().tasks.t_01.title).toBe('Audit onboarding funnel drop-off')
  })

  it('deleting a task asks for confirmation and can be undone', async () => {
    const { store, user } = await renderApp()
    store.dispatch(drawerOpened('t_02'))
    const drawer = await screen.findByRole('dialog')
    await user.click(within(drawer).getByRole('button', { name: 'Delete task' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(store.getState().tasks.t_02.deletedAt).not.toBeNull())
    expect(screen.queryByRole('button', { name: 'Spike: evaluate edge caching for API' })).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(store.getState().tasks.t_02.deletedAt).toBeNull())
  })
})
