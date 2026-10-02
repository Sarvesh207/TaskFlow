import type { Page } from '@playwright/test'
import { expect, localDate, signIn, test } from './fixtures'

/**
 * Layout regressions that unit tests cannot see (jsdom has no layout):
 * on large screens a list page fits the content panel, only the table scrolls,
 * and the tab bars never grow a scrollbar.
 */

test.use({ viewport: { width: 1280, height: 720 } })

/** How far each element can scroll vertically (0 = no scrollbar). */
function overflow(page: Page) {
  return page.evaluate(() => {
    const extra = (el: Element | null) => (el ? el.scrollHeight - el.clientHeight : null)
    return {
      main: extra(document.querySelector('#main')),
      sections: extra(document.querySelector('nav[aria-label="Sections"]')),
      filters: extra(document.querySelector('[role="tablist"]')),
      table: extra(document.querySelector('table')?.parentElement ?? null),
    }
  })
}

test('project tasks: the page fits; few rows means no scrollbars at all', async ({ page, team }) => {
  // Tall enough for the three seeded rows; at 720px they already scroll (see below).
  await page.setViewportSize({ width: 1280, height: 900 })
  await signIn(page, team.owner)
  await page.goto(`/projects/${team.project.id}/tasks`)
  await expect(page.getByRole('link', { name: 'Fix login bug' })).toBeVisible()

  expect(await overflow(page)).toEqual({ main: 0, sections: 0, filters: 0, table: 0 })
  await expect(page.getByText(/^Showing/)).toBeInViewport()
})

test('project tasks: with many rows only the table scrolls', async ({ page, team }) => {
  await signIn(page, team.owner)
  for (let i = 1; i <= 12; i++) {
    const res = await page.request.post(`/api/v1/projects/${team.project.id}/tasks`, {
      data: { title: `Extra task ${i}`, due_date: localDate(i) },
    })
    expect(res.ok()).toBeTruthy()
  }

  await page.goto(`/projects/${team.project.id}/tasks`)
  await expect(page.getByRole('link', { name: 'Fix login bug' })).toBeVisible()

  const result = await overflow(page)
  expect(result.main).toBe(0)
  expect(result.sections).toBe(0)
  expect(result.filters).toBe(0)
  expect(result.table).toBeGreaterThan(0)

  // Header row stays put while the rows scroll under it; pagination stays on screen.
  const header = page.getByRole('columnheader', { name: 'Title' })
  const before = await header.boundingBox()
  await page.locator('table').evaluate((table) => table.parentElement!.scrollBy(0, 200))
  const after = await header.boundingBox()
  // Sticky positioning may round to the device pixel; the header must not scroll away.
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1)
  await expect(page.getByText(/^Showing/)).toBeInViewport()
})

test('members, projects, my tasks and users pages fit the panel too', async ({ page, team }) => {
  await signIn(page, team.owner)
  for (const path of [`/projects/${team.project.id}/members`, '/projects', '/my-tasks', '/users']) {
    await page.goto(path)
    await expect(page.locator('table')).toBeVisible()
    expect((await overflow(page)).main, path).toBe(0)
  }
})

test('pages without a big table still scroll normally', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto(`/projects/${team.project.id}`)
  await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible()
  expect((await overflow(page)).sections).toBe(0)
})

test('dialogs open in the centre and stay there (no jump after the animation)', async ({ page, team }) => {
  await signIn(page, team.owner)
  await page.goto(`/projects/${team.project.id}/members`)
  await expect(page.locator('table')).toBeVisible()

  // Record the dialog's centre on every frame from the moment it mounts.
  await page.evaluate(() => {
    const w = window as unknown as { centres: { x: number; y: number }[] }
    w.centres = []
    const sample = () => {
      const dialog = document.querySelector('[role="dialog"]')
      if (dialog) {
        const r = dialog.getBoundingClientRect()
        w.centres.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
      }
      if (w.centres.length < 30) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await page.getByRole('button', { name: 'Add Member' }).click()
  await expect(page.getByRole('dialog', { name: 'Add Project Member' })).toBeVisible()
  await page.waitForFunction(() => (window as unknown as { centres: unknown[] }).centres.length >= 30)

  const centres = await page.evaluate(() => (window as unknown as { centres: { x: number; y: number }[] }).centres)
  const viewport = page.viewportSize()!
  for (const { x, y } of centres) {
    // A small lift/scale during the animation is fine; a jump across the screen is not.
    expect(Math.abs(x - viewport.width / 2)).toBeLessThan(4)
    expect(Math.abs(y - viewport.height / 2)).toBeLessThan(12)
  }
})
