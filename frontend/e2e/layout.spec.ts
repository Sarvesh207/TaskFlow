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

test('form dropdowns open as a styled list (screenshots for review)', async ({ page, team }, testInfo) => {
  await signIn(page, team.owner)
  await page.goto(`/projects/${team.project.id}/tasks/new`)
  const form = page.getByRole('dialog', { name: 'Create Task' })

  for (const label of ['Assignee', 'Priority', 'Status']) {
    await form.getByLabel(label).click()
    const list = page.getByRole('listbox')
    await expect(list).toBeVisible()
    await page.waitForTimeout(300) // let the open animation finish
    await page.screenshot({ path: testInfo.outputPath(`${label.toLowerCase()}-dropdown.png`) })
    await page.keyboard.press('Escape')
    await expect(list).toBeHidden()
  }
})

for (const height of [720, 600]) {
  test(`empty task list stays inside its card (${height}px tall)`, async ({ page, team, unique }, testInfo) => {
    await page.setViewportSize({ width: 1280, height })
    await signIn(page, team.owner)
    const res = await page.request.post('/api/v1/projects', { data: { name: `Empty ${unique}` } })
    const project = (await res.json()).data

    await page.goto(`/projects/${project.id}/tasks`)
    await expect(page.getByRole('heading', { name: 'No tasks yet' })).toBeVisible()

    expect((await overflow(page)).main).toBe(0)
    // Nothing hangs off the card's bottom edge: the empty state ends inside the card, and if the
    // space is short it scrolls there (its own "New Task" button is reachable by scrolling).
    const card = page.locator('[role="tablist"]').locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
    const empty = page.getByRole('heading', { name: 'No tasks yet' }).locator('xpath=../..')
    const [cardBox, emptyBox] = [await card.boundingBox(), await empty.boundingBox()]
    expect(emptyBox!.y + emptyBox!.height).toBeLessThanOrEqual(cardBox!.y + cardBox!.height + 0.5)
    const button = page.getByRole('link', { name: 'New Task' }).last()
    if (height === 720) {
      // Enough room: no scrolling, and the button has space below it (not stuck to the card edge).
      const buttonBox = (await button.boundingBox())!
      expect(cardBox!.y + cardBox!.height - (buttonBox.y + buttonBox.height)).toBeGreaterThanOrEqual(16)
      expect(await empty.evaluate((el) => el.scrollHeight - el.clientHeight)).toBe(0)
    }
    await button.scrollIntoViewIfNeeded()
    await expect(button).toBeInViewport()
    await page.screenshot({ path: testInfo.outputPath('empty.png') })
  })
}

test('desktop: no top bar; the content panel starts at the top and search is in the sidebar', async ({ page, team }, testInfo) => {
  await signIn(page, team.owner)
  await page.goto(`/projects/${team.project.id}/tasks`)
  await expect(page.getByRole('link', { name: 'Fix login bug' })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden()
  const main = (await page.locator('#main').boundingBox())!
  expect(main.y).toBeLessThanOrEqual(16)
  await page.screenshot({ path: testInfo.outputPath('desktop.png') })

  // The only visible search control is the sidebar's, and it opens the palette.
  await page.getByRole('button', { name: 'Search or jump to' }).click()
  await expect(page.getByPlaceholder('Search projects, pages and actions…')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect(page.getByRole('button', { name: 'Search or jump to' })).toHaveAttribute('title', /^Search \(/)
  await page.screenshot({ path: testInfo.outputPath('desktop-collapsed.png') })
  await page.getByRole('button', { name: 'Expand sidebar' }).click()
})

test('phone: a slim header opens the drawer and search', async ({ page, team }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, team.owner)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  const header = (await page.getByRole('banner').boundingBox())!
  expect(header.height).toBeLessThanOrEqual(48)
  await page.screenshot({ path: testInfo.outputPath('phone.png') })

  await page.getByRole('button', { name: 'Search or jump to' }).click()
  await expect(page.getByPlaceholder('Search projects, pages and actions…')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Open navigation' }).click()
  const drawer = page.getByRole('dialog', { name: 'Navigation' })
  await expect(drawer.getByRole('button', { name: 'Settings' })).toBeVisible()
  await page.waitForTimeout(350) // let the drawer finish sliding in
  await page.screenshot({ path: testInfo.outputPath('phone-drawer.png') })

  // Search from inside the drawer closes the drawer and opens the palette.
  await drawer.getByRole('button', { name: 'Search or jump to' }).click()
  await expect(drawer).toBeHidden()
  await expect(page.getByPlaceholder('Search projects, pages and actions…')).toBeVisible()
})

test('wide screen: content keeps the same side padding with the sidebar open or collapsed', async ({ page, team }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 900 })
  await signIn(page, team.owner)

  const paths = [
    '/',
    '/projects',
    '/my-tasks',
    '/users',
    `/projects/${team.project.id}`,
    `/projects/${team.project.id}/tasks`,
    `/projects/${team.project.id}/members`,
    `/projects/${team.project.id}/settings`,
  ]

  for (const collapsed of [false, true]) {
    await page.goto('/')
    const toggle = page.getByRole('button', { name: collapsed ? 'Collapse sidebar' : 'Expand sidebar' })
    if (await toggle.isVisible()) await toggle.click()

    for (const path of paths) {
      await page.goto(path)
      await expect(page.locator('#main h1, #main h2').first()).toBeVisible()
      const gaps = await page.evaluate(() => {
        const main = document.querySelector('#main')!.getBoundingClientRect()
        const content = document.querySelector('#main > div')!.getBoundingClientRect()
        return { left: content.left - main.left, right: main.right - content.right }
      })
      // px-8 = 32px, plus the panel's 1px border at most.
      expect(gaps.left, `${path} left (collapsed=${collapsed})`).toBeLessThanOrEqual(34)
      expect(gaps.right, `${path} right (collapsed=${collapsed})`).toBeLessThanOrEqual(34)
    }
    if (collapsed) {
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath('dashboard-collapsed.png') })
      await page.goto(`/projects/${team.project.id}/tasks`)
      await expect(page.getByRole('link', { name: 'Fix login bug' })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath('tasks-collapsed.png') })
    }
  }
})
