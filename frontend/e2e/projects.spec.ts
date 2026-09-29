import { expect, signIn, test } from './fixtures'

test('create a project and land on its overview', async ({ page, team, unique }) => {
  await signIn(page, team.owner)
  await page.goto('/projects')
  await page.getByRole('link', { name: 'New Project' }).click()

  const name = `Launch Plan ${unique}`
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Description').fill('Everything for launch day.')
  await page.getByRole('button', { name: 'Create Project' }).click()

  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  await expect(page.getByText('Everything for launch day.').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
})

test('the owner renames the project in Settings', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto(`/projects/${team.project.id}/settings`)

  const newName = `${team.project.name} v2`
  await page.getByLabel('Name').fill(newName)
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByRole('heading', { level: 1, name: newName })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Name')).toHaveValue(newName)
})

test('deleting a project requires typing its name', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto(`/projects/${team.project.id}`)

  await page.getByRole('button', { name: 'Project actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete project' }).click()

  const dialog = page.getByRole('dialog', { name: 'Delete project' })
  const confirm = dialog.getByRole('button', { name: 'Delete project' })
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('textbox').fill(team.project.name)
  await confirm.click()

  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.getByText(team.project.name)).toHaveCount(0)
})

test('⌘K palette: free text searches projects', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto('/')
  await page.getByRole('button', { name: 'Search or jump to' }).click()
  await page.getByPlaceholder('Search projects, pages and actions…').fill('no-such-project-xyz')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/projects\?q=no-such-project-xyz$/)
  await expect(page.getByText('No matching projects')).toBeVisible()
})

test('⌘K palette: keyboard shortcut jumps straight to a project', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto('/my-tasks')
  await expect(page.getByRole('heading', { name: 'My Tasks' })).toBeVisible()

  await page.keyboard.press('ControlOrMeta+k')
  await page.getByPlaceholder('Search projects, pages and actions…').fill(team.project.name)
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(new RegExp(`/projects/${team.project.id}$`))
  await expect(page.getByRole('heading', { level: 1, name: team.project.name })).toBeVisible()
})
