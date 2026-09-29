import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IDS, sent } from '@/test/msw/db'
import { renderApp } from '@/test/render'

const base = `/projects/${IDS.project}/tasks`

describe('TaskFormPage', () => {
  it('creates a task, sending only filled-in fields and the numeric priority', async () => {
    const { user, router } = renderApp(`${base}/new`, { as: IDS.alex })

    await user.type(await screen.findByLabelText('Title'), 'Write API docs')
    await user.selectOptions(screen.getByLabelText('Assignee'), 'Sam Rivera')
    await user.selectOptions(screen.getByLabelText('Priority'), 'High')
    await user.click(screen.getByRole('button', { name: 'Create Task' }))

    await waitFor(() => expect(router.state.location.pathname).not.toBe(`${base}/new`))
    expect(sent('POST', '/tasks')).toEqual([
      { title: 'Write API docs', status: 'pending', priority: 5, assigned_to: IDS.sam },
    ])
    expect(await screen.findByRole('heading', { name: 'Write API docs' })).toBeInTheDocument()
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

    await user.selectOptions(screen.getByLabelText('Status'), 'Completed')
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
    const options = Array.from((assignee as HTMLSelectElement).options).map((o) => o.textContent)
    expect(options).toEqual(['Unassigned', 'Jo Park (you)'])
    expect(assignee).toHaveValue(IDS.jo)
    expect(screen.getByLabelText('Priority')).toBeDisabled()

    await user.type(screen.getByLabelText('Title'), 'Update README')
    await user.click(screen.getByRole('button', { name: 'Create Task' }))

    await waitFor(() => expect(router.state.location.pathname).not.toBe(`${base}/new`))
    expect(sent('POST', '/tasks')).toEqual([{ title: 'Update README', status: 'pending', assigned_to: IDS.jo }])
  })
})
