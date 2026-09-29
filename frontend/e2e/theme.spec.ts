import { expect, signIn, test } from './fixtures'

test('theme picked in sidebar Settings persists across reloads', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/dark/) // default

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: 'Light' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  await page.reload()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('the saved theme is applied before the app renders (no flash)', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('taskflow.theme', 'light'))

  // Capture the <html> class at the very first script opportunity, before React mounts.
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      ;(window as unknown as { __themeAtLoad: string }).__themeAtLoad = document.documentElement.className
    })
  })
  await page.reload()
  const atLoad = await page.evaluate(() => (window as unknown as { __themeAtLoad: string }).__themeAtLoad)
  expect(atLoad).not.toContain('dark')
})

test('System follows the operating system colour scheme', async ({ page, team }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await signIn(page, team.owner)
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: 'System' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveClass(/dark/)
})
