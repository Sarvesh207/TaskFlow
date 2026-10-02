import { expect, PASSWORD, test } from './fixtures'

test('signed-out visitors go to /login and come back after signing in', async ({ page, team }) => {
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects$/)

  await page.getByLabel('Email').fill(team.owner.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
})

test('wrong password shows a message and stays on /login', async ({ page, team }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(team.owner.email)
  await page.getByLabel('Password', { exact: true }).fill('Wrong1!')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toHaveText('Invalid email or password.')
  await expect(page).toHaveURL(/\/login$/)
})

test('F1/F2: sign out, then sign in as someone else in the same tab', async ({ page, team }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(team.owner.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.goto('/profile')
  // Sign out lives in the sidebar's Settings popover.
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  await page.getByLabel('Email').fill(team.member.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByLabel('Full Name')).toHaveValue(team.member.name)
})

test('a new account can sign up and lands on the dashboard', async ({ page, unique }) => {
  await page.goto('/register')
  await page.getByLabel('Full name').fill('Riley New')
  await page.getByLabel('Email').fill(`riley.${unique}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Welcome back, Riley.')).toBeVisible()
})
