import { http, HttpResponse } from 'msw'
import type { MemberRole, Project, ProjectMember, Task, User } from '@/types/api'
import { db, inviteToken, makeTask, makeUser, PASSWORD, type FakeInvite } from './db'

/**
 * A small fake of the backend: same envelope, codes and authorization rules as
 * backend/ERRORS.md and projects.service.ts, backed by the in-memory `db`.
 */

const API = '*/api/v1'

function ok<T>(data: T, message = 'OK', status = 200) {
  return HttpResponse.json({ success: true, statusCode: status, message, data }, { status })
}

function fail(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) {
  return HttpResponse.json(
    { success: false, statusCode: status, code, message, data: null, errors: [], fieldErrors, requestId: 'test' },
    { status },
  )
}

const unauthorized = () => fail(401, 'UNAUTHORIZED', 'Unauthorized: no token provided')
const forbidden = (message = 'Forbidden') => fail(403, 'FORBIDDEN', message)
const notFound = (message = 'Not found') => fail(404, 'NOT_FOUND', message)

async function record(request: Request) {
  let body: unknown = undefined
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    body = await request
      .clone()
      .json()
      .catch(() => undefined)
  }
  db.requests.push({ method: request.method, path: new URL(request.url).pathname, body })
  return body as Record<string, unknown>
}

function me(): User | undefined {
  return db.users.find((u) => u.id === db.sessionUserId)
}

function roleIn(project: Project, userId: string): MemberRole | null {
  if (project.owner_id === userId) return 'owner'
  return db.members.find((m) => m.project_id === project.id && m.user_id === userId)?.role ?? null
}

/** The project plus the caller's role, or an error response. */
function access(projectId: string) {
  const user = me()
  if (!user) return { error: unauthorized() }
  const project = db.projects.find((p) => p.id === projectId)
  if (!project) return { error: notFound('Project not found') }
  const role = roleIn(project, user.id)
  if (!role) return { error: forbidden('Forbidden: You do not have access this project') }
  return { user, project, role }
}

const privileged = (role: MemberRole) => role === 'owner' || role === 'admin'
let seq = 1000
const newId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`

// Invites, mirroring backend/src/modules/invites/invites.service.ts.
const isOpen = (i: FakeInvite) => !i.accepted_at && !i.revoked_at
const DAY = 86_400_000

function inviteStatus(i: FakeInvite) {
  if (i.accepted_at) return 'accepted'
  if (i.revoked_at) return 'revoked'
  return new Date(i.expires_at) <= new Date() ? 'expired' : 'pending'
}

function publicInvite(i: FakeInvite) {
  const inviter = db.users.find((u) => u.id === i.invited_by)!
  const { id, project_id, email, role, expires_at, created_at } = i
  return { id, project_id, email, role, expires_at, created_at, inviter: { id: inviter.id, full_name: inviter.full_name } }
}

function emailOnProject(project: Project, email: string) {
  return db.users.some(
    (u) =>
      u.email.toLowerCase() === email &&
      (u.id === project.owner_id || db.members.some((m) => m.project_id === project.id && m.user_id === u.id)),
  )
}

function openInvite(projectId: string, inviteId: unknown) {
  return db.invites.find((i) => i.id === inviteId && i.project_id === projectId && isOpen(i))
}

const cannotManage = () => forbidden('You do not have permission to perform this action')

export const handlers = [
  // ------------------------------------------------------------------ auth
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = await record(request)
    const user = db.users.find((u) => u.email === body.email)
    if (!user || body.password !== PASSWORD) return fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
    db.sessionUserId = user.id
    return ok({ user: { id: user.id, email: user.email, fullname: user.full_name } }, 'User login successfully')
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    const body = await record(request)
    if (db.users.some((u) => u.email === body.email)) {
      return fail(409, 'ALREADY_EXISTS', 'This email is already registered', {
        email: ['This email is already registered'],
      })
    }
    const user = makeUser(newId(), String(body.full_name), String(body.email))
    db.users.push(user)
    return ok(user, 'User registred successfully', 201)
  }),

  http.post(`${API}/auth/logout`, async ({ request }) => {
    await record(request)
    db.sessionUserId = null
    return ok(null, 'Logout successful')
  }),

  http.get(`${API}/auth/me`, () => {
    const user = me()
    return user ? ok(user) : unauthorized()
  }),

  // ------------------------------------------------------------------ users
  http.get(`${API}/users`, () => (me() ? ok(db.users) : unauthorized())),

  http.get(`${API}/users/:id`, ({ params }) => {
    if (!me()) return unauthorized()
    const user = db.users.find((u) => u.id === params.id)
    return user ? ok(user) : notFound('User not found.')
  }),

  http.patch(`${API}/users/:id`, async ({ request, params }) => {
    const body = await record(request)
    if (!me()) return unauthorized()
    const user = db.users.find((u) => u.id === params.id)
    if (!user) return notFound('User not found')
    if (typeof body.phone === 'string' && !/^\+?[0-9 ()-]{7,20}$/.test(body.phone)) {
      return fail(422, 'VALIDATION_ERROR', 'Validation failed for 1 field: phone', {
        phone: ['Phone must be 7-20 digits and may start with +'],
      })
    }
    const { email, full_name, ...profile } = body as Partial<User> & Record<string, string>
    Object.assign(user, email ? { email } : {}, full_name ? { full_name } : {})
    if (Object.keys(profile).length > 0) {
      user.profile = {
        user_id: user.id,
        avatar_url: null,
        bio: null,
        phone: null,
        created_at: null,
        updated_at: null,
        ...user.profile,
        ...profile,
      }
    }
    return ok(user, 'User updated successfully.')
  }),

  // ------------------------------------------------------------------ projects
  http.get(`${API}/projects`, () => {
    const user = me()
    if (!user) return unauthorized()
    return ok(db.projects.filter((p) => roleIn(p, user.id)))
  }),

  http.post(`${API}/projects`, async ({ request }) => {
    const body = await record(request)
    const user = me()
    if (!user) return unauthorized()
    const project: Project = {
      id: newId(),
      name: String(body.name),
      description: (body.description as string) ?? null,
      status: (body.status as Project['status']) ?? 'active',
      owner_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    db.projects.unshift(project)
    return ok(project, 'Project created successfully', 201)
  }),

  http.get(`${API}/projects/:id`, ({ params }) => {
    const a = access(String(params.id))
    return a.error ?? ok(a.project)
  }),

  http.patch(`${API}/projects/:id`, async ({ request, params }) => {
    const body = await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    if (a.role !== 'owner') return forbidden('Forbidden: you do not have permission to update this project')
    Object.assign(a.project, body)
    return ok(a.project, 'project details updated successfully')
  }),

  http.delete(`${API}/projects/:id`, async ({ request, params }) => {
    await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    if (a.role !== 'owner') return forbidden()
    db.projects = db.projects.filter((p) => p.id !== a.project.id)
    return ok(null, 'Project deleted successfully')
  }),

  // ------------------------------------------------------------------ members
  http.get(`${API}/projects/:id/members`, ({ params }) => {
    const a = access(String(params.id))
    return a.error ?? ok(db.members.filter((m) => m.project_id === a.project.id))
  }),

  http.post(`${API}/projects/:id/members`, async ({ request, params }) => {
    const body = await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    if (!privileged(a.role)) return forbidden('Forbidden : only owner & admins can add members')
    const user = db.users.find((u) => u.id === body.user_id)
    if (!user) return notFound('User not found')
    if (db.members.some((m) => m.project_id === a.project.id && m.user_id === user.id)) {
      return fail(409, 'CONFLICT', 'User is already member of project')
    }
    const row: ProjectMember = {
      project_id: a.project.id,
      user_id: user.id,
      role: (body.role as MemberRole) ?? 'member',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      users: { id: user.id, email: user.email, full_name: user.full_name },
    }
    db.members.push(row)
    return ok(row, 'Project member added successfully', 201)
  }),

  http.put(`${API}/projects/:id/members/:userId`, async ({ request, params }) => {
    const body = await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    if (!privileged(a.role)) return forbidden('Forbidden: Only owners and admins can update member roles')
    const row = db.members.find((m) => m.project_id === a.project.id && m.user_id === params.userId)
    if (!row) return notFound('Member not found in this project')
    row.role = body.role as MemberRole
    return ok(row, 'Project member role updated successfully')
  }),

  http.delete(`${API}/projects/:id/members/:userId`, async ({ request, params }) => {
    await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    if (!privileged(a.role) && a.user.id !== params.userId) return forbidden()
    db.members = db.members.filter((m) => !(m.project_id === a.project.id && m.user_id === params.userId))
    return ok(null, 'Project member removed successfully')
  }),

  // ------------------------------------------------------------------ invites
  http.get(`${API}/projects/:id/invites`, ({ params }) => {
    const a = access(String(params.id))
    if (a.error) return a.error
    if (!privileged(a.role)) return cannotManage()
    const live = db.invites.filter(
      (i) => i.project_id === a.project.id && isOpen(i) && new Date(i.expires_at) > new Date(),
    )
    return ok(live.map(publicInvite))
  }),

  http.post(`${API}/projects/:id/invites`, async ({ request, params }) => {
    const body = await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    if (!privileged(a.role)) return cannotManage()
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    if (emailOnProject(a.project, email)) {
      const message = 'This person is already on the project'
      return fail(409, 'ALREADY_MEMBER', message, { email: [message] })
    }
    if (db.invites.some((i) => i.project_id === a.project.id && i.email === email && isOpen(i))) {
      const message = 'This email already has a pending invite. Resend it from the pending invites list.'
      return fail(409, 'ALREADY_EXISTS', message, { email: [message] })
    }
    const id = newId()
    const invite: FakeInvite = {
      id,
      project_id: a.project.id,
      email,
      role: (body.role as FakeInvite['role']) ?? 'member',
      token: inviteToken(id.replaceAll('-', '')),
      invited_by: a.user.id,
      expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
      created_at: new Date().toISOString(),
      accepted_at: null,
      accepted_by: null,
      revoked_at: null,
    }
    db.invites.push(invite)
    return ok(publicInvite(invite), 'Invite sent', 201)
  }),

  http.post(`${API}/projects/:id/invites/:inviteId/resend`, async ({ request, params }) => {
    await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    if (!privileged(a.role)) return cannotManage()
    const invite = openInvite(a.project.id, params.inviteId)
    if (!invite) return notFound('Invite not found')
    invite.token = inviteToken(`r${invite.token}`)
    invite.expires_at = new Date(Date.now() + 7 * DAY).toISOString()
    return ok(publicInvite(invite), 'Invite resent')
  }),

  http.delete(`${API}/projects/:id/invites/:inviteId`, async ({ request, params }) => {
    await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    if (!privileged(a.role)) return cannotManage()
    const invite = openInvite(a.project.id, params.inviteId)
    if (!invite) return notFound('Invite not found')
    invite.revoked_at = new Date().toISOString()
    return ok(null, 'Invite cancelled')
  }),

  http.get(`${API}/invites/:token`, ({ params }) => {
    const invite = db.invites.find((i) => i.token === params.token)
    if (!invite) return notFound('This invite link is not valid')
    const project = db.projects.find((p) => p.id === invite.project_id)!
    const inviter = db.users.find((u) => u.id === invite.invited_by)!
    return ok({
      project: { id: project.id, name: project.name },
      inviter: { full_name: inviter.full_name },
      email: invite.email,
      role: invite.role,
      status: inviteStatus(invite),
      expires_at: invite.expires_at,
    })
  }),

  http.post(`${API}/invites/:token/accept`, async ({ request, params }) => {
    await record(request)
    const user = me()
    if (!user) return unauthorized()
    const invite = db.invites.find((i) => i.token === params.token)
    if (!invite) return notFound('This invite link is not valid')
    const status = inviteStatus(invite)
    if (status === 'accepted' && invite.accepted_by === user.id) {
      return ok({ project_id: invite.project_id }, 'Invite accepted')
    }
    if (status === 'accepted' || status === 'revoked') {
      return fail(410, 'INVITE_INVALID', 'This invite has already been used or was cancelled')
    }
    if (status === 'expired') return fail(410, 'INVITE_EXPIRED', 'This invite has expired. Ask for a new one.')
    if (user.email.toLowerCase() !== invite.email) {
      const message = `This invite was sent to ${invite.email}. Sign in with that email to accept it.`
      return fail(403, 'INVITE_EMAIL_MISMATCH', message)
    }
    const now = new Date().toISOString()
    invite.accepted_at = now
    invite.accepted_by = user.id
    const project = db.projects.find((p) => p.id === invite.project_id)!
    if (!roleIn(project, user.id)) {
      db.members.push({
        project_id: project.id,
        user_id: user.id,
        role: invite.role,
        created_at: now,
        updated_at: now,
        users: { id: user.id, email: user.email, full_name: user.full_name },
      })
    }
    return ok({ project_id: invite.project_id }, 'Invite accepted')
  }),

  // ------------------------------------------------------------------ tasks
  http.get(`${API}/projects/:id/tasks`, ({ params }) => {
    const a = access(String(params.id))
    return a.error ?? ok(db.tasks.filter((t) => t.project_id === a.project.id))
  }),

  http.get(`${API}/projects/:id/tasks/:taskId`, ({ params }) => {
    const a = access(String(params.id))
    if (a.error) return a.error
    const task = db.tasks.find((t) => t.id === params.taskId && t.project_id === a.project.id)
    return task ? ok(task) : notFound('Task not found')
  }),

  http.post(`${API}/projects/:id/tasks`, async ({ request, params }) => {
    const body = await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    if (!privileged(a.role)) {
      if ('priority' in body) return forbidden('Only admins and owners can change task priority')
      if (body.assigned_to && body.assigned_to !== a.user.id) {
        return forbidden('Members can only assign tasks to themselves')
      }
    }
    const task = makeTask({
      id: newId(),
      project_id: a.project.id,
      title: String(body.title),
      ...(body as Partial<Task>),
      due_date: body.due_date ? `${body.due_date}T00:00:00.000Z` : null,
    })
    db.tasks.push(task)
    return ok(task, 'Task created successfully', 201)
  }),

  http.put(`${API}/projects/:id/tasks/:taskId`, async ({ request, params }) => {
    const body = await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    const task = db.tasks.find((t) => t.id === params.taskId && t.project_id === a.project.id)
    if (!task) return notFound('Task not found')
    if (!privileged(a.role)) {
      if (task.assigned_to !== a.user.id) return forbidden('You do not have permssion to update this task')
      if ('assigned_to' in body) return forbidden('Only admins and owners can assign tasks')
      if ('priority' in body) return forbidden('Only admins and owners can change task priority')
    }
    Object.assign(task, body, {
      ...('due_date' in body ? { due_date: body.due_date ? `${body.due_date}T00:00:00.000Z` : null } : {}),
      updated_at: new Date().toISOString(),
    } satisfies Partial<Task>)
    return ok(task, 'Task updated successfully')
  }),

  http.delete(`${API}/projects/:id/tasks/:taskId`, async ({ request, params }) => {
    await record(request)
    const a = access(String(params.id))
    if (a.error) return a.error
    if (!privileged(a.role)) return forbidden('You do not have permission to perform this action')
    db.tasks = db.tasks.filter((t) => t.id !== params.taskId)
    return ok(null, 'Task deleted successfully')
  }),
]
