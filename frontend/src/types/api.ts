// DTOs as returned by the backend (see backend/src/modules/*/*.repository.ts).
// Dates arrive as ISO strings.

export type ProjectStatus = 'active' | 'completed' | 'archived'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type MemberRole = 'owner' | 'admin' | 'member'
/** Roles that can be assigned through the API — ownership is fixed. */
export type AssignableRole = Exclude<MemberRole, 'owner'>

export interface UserProfile {
  user_id: string
  avatar_url: string | null
  bio: string | null
  phone: string | null
  created_at: string | null
  updated_at: string | null
}

export interface User {
  id: string
  email: string
  full_name: string
  created_at: string | null
  updated_at: string | null
  profile: UserProfile | null
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  owner_id: string
  created_at: string | null
  updated_at: string | null
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: MemberRole
  created_at: string | null
  updated_at: string | null
  users: Pick<User, 'id' | 'email' | 'full_name'>
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: number
  /** SQL DATE serialized as `YYYY-MM-DDT00:00:00.000Z`. */
  due_date: string | null
  assigned_to: string | null
  created_at: string | null
  updated_at: string | null
}

// ------------------------------------------------------------------ inputs

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  full_name: string
  password: string
}

export interface ProjectInput {
  name: string
  description?: string
  status?: ProjectStatus
}

export interface TaskInput {
  title?: string
  description?: string | null
  status?: Exclude<TaskStatus, 'cancelled'>
  priority?: number
  /** `YYYY-MM-DD` */
  due_date?: string | null
  assigned_to?: string | null
}

export interface UpdateUserInput {
  email?: string
  full_name?: string
  avatar_url?: string
  bio?: string
  phone?: string
}
