import type { MemberRole, Project, ProjectMember, Task } from '@/types/api'

// Mirrors the checks in backend/src/modules/projects/projects.service.ts.
// The UI hides what a role cannot do; the API still has the final say.

export function getProjectRole(
  project: Pick<Project, 'owner_id'> | undefined,
  members: ProjectMember[] | undefined,
  userId: string | undefined,
): MemberRole | null {
  if (!project || !userId) return null
  if (project.owner_id === userId) return 'owner'
  return members?.find((m) => m.user_id === userId)?.role ?? null
}

const isPrivileged = (role: MemberRole | null) => role === 'owner' || role === 'admin'

export const can = {
  editProject: (role: MemberRole | null) => role === 'owner',
  deleteProject: (role: MemberRole | null) => role === 'owner',
  manageMembers: isPrivileged,
  removeMember: (role: MemberRole | null, targetUserId: string, userId: string, ownerId: string) =>
    targetUserId !== ownerId && (isPrivileged(role) || targetUserId === userId),
  createTask: (role: MemberRole | null) => role !== null,
  editTask: (role: MemberRole | null, task: Pick<Task, 'assigned_to'>, userId: string | undefined) =>
    isPrivileged(role) || (role !== null && !!userId && task.assigned_to === userId),
  assignTask: isPrivileged,
  deleteTask: isPrivileged,
}

export const PERMISSION_MATRIX: { label: string; owner: boolean; admin: boolean; member: boolean }[] = [
  { label: 'View project & tasks', owner: true, admin: true, member: true },
  { label: 'Edit project details', owner: true, admin: false, member: false },
  { label: 'Delete project', owner: true, admin: false, member: false },
  { label: 'Manage members', owner: true, admin: true, member: false },
  { label: 'Create tasks', owner: true, admin: true, member: true },
  { label: 'Edit own assigned tasks', owner: true, admin: true, member: true },
  { label: 'Edit any task', owner: true, admin: true, member: false },
  { label: 'Assign tasks & set priority', owner: true, admin: true, member: false },
  { label: 'Delete tasks', owner: true, admin: true, member: false },
]
