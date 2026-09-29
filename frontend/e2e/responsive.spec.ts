import { expect, signIn, test } from './fixtures'

// Runs only in the "mobile" project (390x844) — see playwright.config.ts.

test('F3: no page scrolls sideways on a phone', async ({ page, team }) => {
  await signIn(page, team.owner)
  const pages = [
    '/',
    '/projects',
    '/my-tasks',
    '/users',
    '/profile',
    `/projects/${team.project.id}`,
    `/projects/${team.project.id}/tasks`,
    `/projects/${team.project.id}/members`,
    `/projects/${team.project.id}/settings`,
    `/projects/${team.project.id}/tasks/${team.tasks.overdue}`,
    `/projects/${team.project.id}/tasks/new`,
  ]

  for (const path of pages) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0)
  }
})

test('navigation works from the drawer', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden()

  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('dialog').getByRole('link', { name: 'My Tasks' }).click()

  await expect(page).toHaveURL(/\/my-tasks$/)
  await expect(page.getByRole('heading', { name: 'My Tasks' })).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
})
