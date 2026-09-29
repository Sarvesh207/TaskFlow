import { expect, signIn, test } from './fixtures'

test('phone format is checked before saving', async ({ page, team }) => {
  await signIn(page, team.member)
  await page.goto('/profile')
  await page.getByLabel('Phone').fill('12')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('Phone must be 7-20 digits and may start with +')).toBeVisible()
})

test('bio and phone are saved and survive a reload', async ({ page, team }) => {
  await signIn(page, team.member)
  await page.goto('/profile')
  await page.getByLabel('Bio').fill('Front-end developer.')
  await page.getByLabel('Phone').fill('+91 98765 43210')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('User updated successfully.')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Bio')).toHaveValue('Front-end developer.')
  await expect(page.getByLabel('Phone')).toHaveValue('+91 98765 43210')
})

test('another member sees the saved bio on the public profile', async ({ page, team, browser }) => {
  await signIn(page, team.member)
  await page.goto('/profile')
  await page.getByLabel('Bio').fill('Ask me about the API.')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('User updated successfully.')).toBeVisible()

  const ownerContext = await browser.newContext()
  const ownerPage = await ownerContext.newPage()
  await signIn(ownerPage, team.owner)
  await ownerPage.goto(`/users/${team.member.id}`)
  await expect(ownerPage.getByText('Ask me about the API.')).toBeVisible()
  await expect(ownerPage.getByText('Shared Projects')).toBeVisible()
  await ownerContext.close()
})

test('changing the photo URL updates the avatar', async ({ page, team }) => {
  await signIn(page, team.member)
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Change Photo' }).click()

  const dialog = page.getByRole('dialog', { name: 'Change Photo' })
  await dialog.getByLabel('Image URL').fill('not a url')
  await dialog.getByRole('button', { name: 'Save Photo' }).click()
  await expect(dialog.getByText('Avatar URL must be a valid URL')).toBeVisible()

  const url = `${new URL(page.url()).origin}/favicon.svg`
  await dialog.getByLabel('Image URL').fill(url)
  await dialog.getByRole('button', { name: 'Save Photo' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator(`img[src="${url}"]`).first()).toBeVisible()
})
