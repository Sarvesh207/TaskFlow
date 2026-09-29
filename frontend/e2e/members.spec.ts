import { expect, signIn, test } from './fixtures'

test('the owner adds a member, changes their role, then removes them', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto(`/projects/${team.project.id}/members`)

  await page.getByRole('button', { name: 'Add Member' }).click()
  const add = page.getByRole('dialog', { name: 'Add Project Member' })
  await add.getByLabel('User').selectOption({ label: `${team.outsider.name} (${team.outsider.email})` })
  await add.getByRole('button', { name: 'Add Member' }).click()

  const row = page.getByRole('row').filter({ hasText: team.outsider.name })
  await expect(row).toContainText('Member')

  await row.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Change role' }).click()
  const roleDialog = page.getByRole('dialog', { name: 'Update Member Role' })
  await roleDialog.getByLabel('New Role').selectOption({ label: 'Admin' })
  await roleDialog.getByRole('button', { name: 'Update Role' }).click()
  await expect(row).toContainText('Admin')

  await row.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Remove from project' }).click()
  await page.getByRole('dialog', { name: 'Remove member' }).getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByRole('row').filter({ hasText: team.outsider.name })).toHaveCount(0)
})

test('a plain member sees no management actions and can leave', async ({ page, team }) => {
  await signIn(page, team.member)
  await page.goto(`/projects/${team.project.id}/members`)
  await expect(page.getByRole('row').filter({ hasText: team.owner.name })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Member' })).toHaveCount(0)

  await page.goto(`/projects/${team.project.id}/settings`)
  await expect(page.getByText('Only the project owner can edit project details.')).toBeVisible()
  await expect(page.getByLabel('Name')).toBeDisabled()

  await page.getByRole('button', { name: 'Leave project' }).click()
  await page.getByRole('dialog', { name: 'Leave project' }).getByRole('button', { name: 'Leave project' }).click()

  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.getByText(team.project.name)).toHaveCount(0)
})

test('someone outside the project is told they have no access', async ({ page, team }) => {
  await signIn(page, team.outsider)
  await page.goto(`/projects/${team.project.id}`)
  await expect(page.getByText("You don't have access")).toBeVisible()
})
