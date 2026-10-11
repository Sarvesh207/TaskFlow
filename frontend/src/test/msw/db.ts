import type { AssignableRole, MemberRole, Project, ProjectMember, Task, User } from '@/types/api'

/**
 * In-memory backend used by the MSW handlers. Reset before every test, then
 * seeded with a small team so each test starts from the same world.
 */

export const PASSWORD = 'Passw0rd!'

export const IDS = {
  alex: '00000000-0000-4000-8000-00000000000a', // owner
  sam: '00000000-0000-4000-8000-00000000000b', // admin
  jo: '00000000-0000-4000-8000-00000000000c', // member
  olivia: '00000000-0000-4000-8000-00000000000d', // not on the project
  project: '00000000-0000-4000-8000-000000000001',
  otherProject: '00000000-0000-4000-8000-000000000002',
  taskJo: '00000000-0000-4000-8000-000000000101',
  taskSam: '00000000-0000-4000-8000-000000000102',
} as const

/** An invite as the backend stores it, plus the raw token its email would carry. */
export interface FakeInvite {
  id: string
  project_id: string
  email: string
  role: AssignableRole
  token: string
  invited_by: string
  expires_at: string
  created_at: string
  accepted_at: string | null
  accepted_by: string | null
  revoked_at: string | null
}

/** A syntactically valid invite token (43 base64url characters). */
export const inviteToken = (seed: string) => seed.padEnd(43, 'x').slice(0, 43)

export function makeInvite(overrides: Partial<FakeInvite> & Pick<FakeInvite, 'id' | 'email'>): FakeInvite {
  return {
    project_id: IDS.project,
    role: 'member',
    token: inviteToken(overrides.id.replaceAll('-', '')),
    invited_by: IDS.alex,
    expires_at: new Date(Date.now() + 6 * 86_400_000).toISOString(),
    created_at: '2026-09-01T10:00:00.000Z',
    accepted_at: null,
    accepted_by: null,
    revoked_at: null,
    ...overrides,
  }
}

export interface RecordedRequest {
  method: string
  path: string
  body: unknown
}

export const db = {
  users: [] as User[],
  projects: [] as Project[],
  members: [] as ProjectMember[],
  tasks: [] as Task[],
  invites: [] as FakeInvite[],
  sessionUserId: null as string | null,
  requests: [] as RecordedRequest[],
}

const NOW = '2026-09-01T10:00:00.000Z'

export function makeUser(id: string, full_name: string, email: string): User {
  return { id, email, full_name, created_at: NOW, updated_at: NOW, profile: null }
}

export function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    project_id: IDS.project,
    description: null,
    status: 'pending',
    priority: 3,
    due_date: null,
    assigned_to: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

function member(userId: string, role: MemberRole, user: User, projectId: string = IDS.project): ProjectMember {
  return {
    project_id: projectId,
    user_id: userId,
    role,
    created_at: NOW,
    updated_at: NOW,
    users: { id: user.id, email: user.email, full_name: user.full_name },
  }
}

export function resetDb() {
  const alex = makeUser(IDS.alex, 'Alex Morgan', 'alex@example.com')
  const sam = makeUser(IDS.sam, 'Sam Rivera', 'sam@example.com')
  const jo = makeUser(IDS.jo, 'Jo Park', 'jo@example.com')
  const olivia = makeUser(IDS.olivia, 'Olivia Chen', 'olivia@example.com')

  db.users = [alex, sam, jo, olivia]
  db.projects = [
    {
      id: IDS.project,
      name: 'Website Redesign',
      description: 'Modern and responsive website.',
      status: 'active',
      owner_id: IDS.alex,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: IDS.otherProject,
      name: 'Mobile App',
      description: 'iOS and Android.',
      status: 'archived',
      owner_id: IDS.olivia,
      created_at: NOW,
      updated_at: NOW,
    },
  ]
  db.members = [member(IDS.sam, 'admin', sam), member(IDS.jo, 'member', jo)]
  db.tasks = [
    makeTask({ id: IDS.taskJo, title: 'Fix login bug', assigned_to: IDS.jo, priority: 5, status: 'in_progress' }),
    makeTask({ id: IDS.taskSam, title: 'Design homepage', assigned_to: IDS.sam, priority: 1 }),
  ]
  db.invites = []
  db.sessionUserId = null
  db.requests = []
}

export function signInAs(userId: string | null) {
  db.sessionUserId = userId
}

/** Requests the app sent with a body, for asserting payloads. */
export function sent(method: string, pathEndsWith: string): unknown[] {
  return db.requests.filter((r) => r.method === method && r.path.endsWith(pathEndsWith)).map((r) => r.body)
}
