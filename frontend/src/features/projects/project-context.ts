import { useOutletContext } from 'react-router'
import type { MemberRole, Project, ProjectMember } from '@/types/api'

/** Owner + members in one list. The owner is not a `project_members` row, so it is synthesized. */
export interface ProjectPerson {
  id: string
  name: string
  email: string
  role: MemberRole
  joinedAt: string | null
  avatarUrl: string | null
}

export interface ProjectContext {
  project: Project
  members: ProjectMember[]
  people: ProjectPerson[]
  peopleById: Map<string, ProjectPerson>
  role: MemberRole | null
  owner: ProjectPerson
  /** Opens the shared delete-project confirmation (owner only). */
  requestDelete: () => void
}

export function useProjectContext() {
  return useOutletContext<ProjectContext>()
}
