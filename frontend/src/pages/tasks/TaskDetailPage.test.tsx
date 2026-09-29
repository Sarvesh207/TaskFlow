import { screen, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { db, IDS } from '@/test/msw/db'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

const path = `/projects/${IDS.project}/tasks/${IDS.taskJo}`

describe('TaskDetailPage', () => {
  it('shows the task with its assignee resolved to a name', async () => {
    renderApp(path, { as: IDS.alex })
    expect(await screen.findByRole('heading', { name: 'Fix login bug' })).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jo Park' })).toBeInTheDocument()
  })

  it('updates the status inline, optimistically', async () => {
    server.use(
      http.put('*/api/v1/projects/:id/tasks/:taskId', async () => {
        await delay(300)
        return HttpResponse.json({
          success: true,
          statusCode: 200,
          message: 'Task updated successfully',
          data: { ...db.tasks[0], status: 'completed' },
        })
      }),
    )
    const { user } = renderApp(path, { as: IDS.jo })
    const status = await screen.findByRole('combobox', { name: 'Task status' })
    expect(status).toHaveValue('in_progress')

    await user.selectOptions(status, 'completed')
    // Before the server answers.
    expect(screen.getByRole('combobox', { name: 'Task status' })).toHaveValue('completed')
    expect(await screen.findByText('Task updated successfully')).toBeInTheDocument()
  })

  it('rolls the status back and explains when the server refuses', async () => {
    server.use(
      http.put('*/api/v1/projects/:id/tasks/:taskId', () =>
        HttpResponse.json(
          { success: false, statusCode: 403, code: 'FORBIDDEN', message: 'You do not have permssion to update this task' },
          { status: 403 },
        ),
      ),
    )
    const { user } = renderApp(path, { as: IDS.jo })
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Task status' }), 'completed')

    expect(await screen.findByText('You do not have permssion to update this task')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Task status' })).toHaveValue('in_progress'))
  })

  it("shows a read-only status to members who can't edit the task", async () => {
    renderApp(`/projects/${IDS.project}/tasks/${IDS.taskSam}`, { as: IDS.jo })
    await screen.findByRole('heading', { name: 'Design homepage' })
    expect(screen.queryByRole('combobox', { name: 'Task status' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete task' })).not.toBeInTheDocument()
  })

  it("non-members see an access message instead of the task", async () => {
    renderApp(path, { as: IDS.olivia })
    expect(await screen.findByText("You don't have access")).toBeInTheDocument()
  })
})
