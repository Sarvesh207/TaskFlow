import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IDS, sent } from '@/test/msw/db'
import { renderApp } from '@/test/render'
import { chooseOption, optionNames } from '@/test/select-menu'

const base = `/projects/${IDS.project}/tasks`

describe('task form modal', () => {
  it('creates a task, sending only filled-in fields and the numeric priority', async () => {
    const { user, router } = renderApp(`${base}/new`, { as: IDS.alex })

    await user.type(await screen.findByLabelText('Title'), 'Write API docs')
    await chooseOption(user, 'Assignee', /Sam Rivera/)
    await chooseOption(user, 'Priority', 'High')
    await user.click(screen.getByRole('button', { name: 'Create Task' }))

    // Back on the task list (it was underneath the whole time), with the new task in it.
    await waitFor(() => expect(router.state.location.pathname).toBe(base))
    expect(sent('POST', '/tasks')).toEqual([
      { title: 'Write API docs', status: 'pending', priority: 5, assigned_to: IDS.sam },
    ])
    expect(await screen.findByRole('link', { name: 'Write API docs' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens over the task list, and Cancel closes it without saving', async () => {
    const { user, router } = renderApp(`${base}/new`, { as: IDS.alex })

    expect(await screen.findByRole('dialog', { name: 'Create Task' })).toBeInTheDocument()
    // The list is rendered underneath (hidden from assistive tech while the modal is open).
    expect(screen.getByRole('heading', { name: 'Tasks', hidden: true })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // The route is left once the exit animation has had time to play.
    await waitFor(() => expect(router.state.location.pathname).toBe(base))
    expect(sent('POST', '/tasks')).toEqual([])
  })

  it('"New Task" on the list opens the modal; closing goes back to the list', async () => {
    const { user, router } = renderApp(base, { as: IDS.alex })
    await user.click(await screen.findByRole('link', { name: 'New Task' }))

    expect(await screen.findByRole('dialog', { name: 'Create Task' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`${base}/new`)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(router.state.location.pathname).toBe(base))
  })

  it('Edit in a row menu opens the form over the list, without leaving it', async () => {
    const { user, router } = renderApp(base, { as: IDS.alex })
    const menus = await screen.findAllByRole('button', { name: 'Actions' })
    await user.click(menus[0]!)
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }))

    const dialog = await screen.findByRole('dialog', { name: 'Edit Task' })
    expect(router.state.location.pathname).toBe(base)

    const title = within(dialog).getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Renamed from the list')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe(base)
    // Every PUT the app sent (whichever row was first).
    expect(sent('PUT', '')).toEqual([{ title: 'Renamed from the list' }])
  })

  it('validates the title', async () => {
    const { user } = renderApp(`${base}/new`, { as: IDS.alex })
    await user.type(await screen.findByLabelText('Title'), 'x')
    await user.click(screen.getByRole('button', { name: 'Create Task' }))
    expect(await screen.findByText('Title must be at least 2 characters')).toBeInTheDocument()
    expect(sent('POST', '/tasks')).toEqual([])
  })

  it('edit sends only the fields that changed', async () => {
    const { user, router } = renderApp(`${base}/${IDS.taskSam}/edit`, { as: IDS.alex })
    const title = await screen.findByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Design landing page')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`${base}/${IDS.taskSam}`))
    expect(sent('PUT', `/tasks/${IDS.taskSam}`)).toEqual([{ title: 'Design landing page' }])
  })

  it('a member editing their own task cannot change assignee or priority, and never sends them', async () => {
    const { user } = renderApp(`${base}/${IDS.taskJo}/edit`, { as: IDS.jo })

    expect(await screen.findByLabelText('Assignee')).toBeDisabled()
    expect(screen.getByLabelText('Priority')).toBeDisabled()
    expect(screen.getByText('Only owners and admins can change the assignee or priority.')).toBeInTheDocument()

    await chooseOption(user, 'Status', 'Completed')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(sent('PUT', `/tasks/${IDS.taskJo}`)).toEqual([{ status: 'completed' }]))
  })

  it("a member opening the edit form for someone else's task is sent to the task page", async () => {
    const { router } = renderApp(`${base}/${IDS.taskSam}/edit`, { as: IDS.jo })
    await waitFor(() => expect(router.state.location.pathname).toBe(`${base}/${IDS.taskSam}`))
  })

  it('a member creating a task can only pick themselves, and priority is left to admins', async () => {
    const { user, router } = renderApp(`${base}/new`, { as: IDS.jo })

    const assignee = await screen.findByLabelText('Assignee')
    // Preselected: a member can only assign a new task to themselves.
    expect(assignee).toHaveTextContent('Jo Park (you)')
    expect(await optionNames(user, 'Assignee')).toEqual(['Unassigned', 'Jo Park (you)'])
    expect(screen.getByLabelText('Priority')).toBeDisabled()

    await user.type(screen.getByLabelText('Title'), 'Update README')
    await user.click(screen.getByRole('button', { name: 'Create Task' }))

    await waitFor(() => expect(router.state.location.pathname).not.toBe(`${base}/new`))
    expect(sent('POST', '/tasks')).toEqual([{ title: 'Update README', status: 'pending', assigned_to: IDS.jo }])
  })
})
