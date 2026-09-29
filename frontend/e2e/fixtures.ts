import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test'

export const PASSWORD = 'Passw0rd!'

export interface Person {
  id: string
  name: string
  email: string
}

export interface Team {
  owner: Person
  admin: Person
  member: Person
  outsider: Person
  project: { id: string; name: string }
  tasks: { overdue: string; today: string; done: string }
}

/** `YYYY-MM-DD` in the browser's (and this machine's) local calendar. */
export function localDate(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function call<T = any>(request: APIRequestContext, method: string, path: string, data?: unknown): Promise<T> {
  const res = await request.fetch(`/api/v1${path}`, { method, data })
  expect(res.ok(), `${method} ${path} -> ${res.status()} ${await res.text()}`).toBeTruthy()
  return (await res.json()).data as T
}

/** Sign the page in through the API; the cookie lands in the page's browser context. */
export async function signIn(page: Page, person: Person) {
  await call(page.request, 'POST', '/auth/login', { email: person.email, password: PASSWORD })
}

export const test = base.extend<{ team: Team; unique: string }>({
  // Playwright requires the `{}` pattern, and its `use` callback is not React's hook (see .oxlintrc.json).
  unique: async ({}, use, testInfo) => {
    await use(`${testInfo.workerIndex}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`)
  },

  /** A fresh owner/admin/member/outsider and a project with three tasks. */
  team: async ({ playwright, baseURL, unique }, use) => {
    const contexts: APIRequestContext[] = []
    const person = async (role: string, first: string) => {
      const request = await playwright.request.newContext({ baseURL })
      contexts.push(request)
      const email = `${role}.${unique}@example.com`
      const name = `${first} ${unique.slice(-4).toUpperCase()}`
      const user = await call(request, 'POST', '/auth/register', { email, full_name: name, password: PASSWORD })
      await call(request, 'POST', '/auth/login', { email, password: PASSWORD })
      return { request, person: { id: user.id as string, name, email } }
    }

    const owner = await person('owner', 'Alex')
    const admin = await person('admin', 'Sam')
    const member = await person('member', 'Jo')
    const outsider = await person('outsider', 'Olivia')

    const projectName = `Website Redesign ${unique.slice(-4).toUpperCase()}`
    const project = await call(owner.request, 'POST', '/projects', {
      name: projectName,
      description: 'Modern and responsive website.',
    })
    await call(owner.request, 'POST', `/projects/${project.id}/members`, { user_id: admin.person.id, role: 'admin' })
    await call(owner.request, 'POST', `/projects/${project.id}/members`, { user_id: member.person.id, role: 'member' })

    const task = (body: object) => call(owner.request, 'POST', `/projects/${project.id}/tasks`, body)
    const overdue = await task({ title: 'Fix login bug', priority: 5, due_date: localDate(-3), assigned_to: member.person.id })
    const today = await task({ title: 'Prepare demo', priority: 3, due_date: localDate(0), assigned_to: owner.person.id })
    const done = await task({ title: 'Design homepage', priority: 1, status: 'completed', assigned_to: admin.person.id })

    await use({
      owner: owner.person,
      admin: admin.person,
      member: member.person,
      outsider: outsider.person,
      project: { id: project.id, name: projectName },
      tasks: { overdue: overdue.id, today: today.id, done: done.id },
    })

    await Promise.all(contexts.map((c) => c.dispose()))
  },
})

export { expect }
