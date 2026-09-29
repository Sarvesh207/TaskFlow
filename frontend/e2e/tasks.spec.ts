import { expect, signIn, test } from './fixtures'

test('create a task with an assignee and priority', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto(`/projects/${team.project.id}/tasks`)
  await page.getByRole('link', { name: 'New Task' }).click()

  await page.getByLabel('Title').fill('Write API docs')
  await page.getByLabel('Description').fill('Every endpoint, with examples.')
  await page.getByLabel('Assignee').selectOption({ label: team.admin.name })
  await page.getByLabel('Priority').selectOption({ label: 'High' })
  await page.getByRole('button', { name: 'Create Task' }).click()

  await expect(page.getByRole('heading', { name: 'Write API docs' })).toBeVisible()
  await expect(page.getByRole('link', { name: team.admin.name })).toBeVisible()
  await expect(page.getByText('High').first()).toBeVisible()
})

test('inline status change persists after a reload', async ({ page, team }) => {
  await signIn(page, team.member)
  await page.goto(`/projects/${team.project.id}/tasks/${team.tasks.overdue}`)

  const status = page.getByRole('combobox', { name: 'Task status' })
  await status.selectOption({ label: 'In Progress' })
  await expect(page.getByText('Task updated successfully')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Task status' })).toHaveValue('in_progress')
})

test('edit and delete a task', async ({ page, team }) => {
  await signIn(page, team.admin)
  await page.goto(`/projects/${team.project.id}/tasks/${team.tasks.today}`)

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Title').fill('Prepare the launch demo')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByRole('heading', { name: 'Prepare the launch demo' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete task' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete task' }).click()

  await expect(page).toHaveURL(new RegExp(`/projects/${team.project.id}/tasks$`))
  await expect(page.getByText('Prepare the launch demo')).toHaveCount(0)
})

test('the task list flags overdue and due-today work', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto(`/projects/${team.project.id}/tasks`)

  const overdueRow = page.getByRole('row').filter({ hasText: 'Fix login bug' })
  await expect(overdueRow.getByTitle('Overdue')).toBeVisible()
  const todayRow = page.getByRole('row').filter({ hasText: 'Prepare demo' })
  await expect(todayRow.getByText('Today')).toBeVisible()

  await page.getByRole('tab', { name: /Completed/ }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Design homepage' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Fix login bug' })).toHaveCount(0)
})

test('My Tasks shows only tasks assigned to me, across projects', async ({ page, team }) => {
  await signIn(page, team.member)
  await page.goto('/my-tasks')
  await expect(page.getByRole('row').filter({ hasText: 'Fix login bug' })).toBeVisible()
  await expect(page.getByText('Prepare demo')).toHaveCount(0)
})

test('a member creates a task for themselves; priority is left to admins', async ({ page, team }) => {
  await signIn(page, team.member)
  await page.goto(`/projects/${team.project.id}/tasks/new`)

  await expect(page.getByLabel('Priority')).toBeDisabled()
  await expect(page.getByLabel('Assignee').locator('option')).toHaveText(['Unassigned', `${team.member.name} (you)`])

  await page.getByLabel('Title').fill('Update README')
  await page.getByRole('button', { name: 'Create Task' }).click()

  await expect(page.getByRole('heading', { name: 'Update README' })).toBeVisible()
  // Exact: the sidebar's profile link also contains the member's name.
  await expect(page.getByRole('link', { name: team.member.name, exact: true })).toBeVisible()
})
