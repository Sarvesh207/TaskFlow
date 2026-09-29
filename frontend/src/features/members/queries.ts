import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { AssignableRole, ProjectMember } from '@/types/api'
import { projectsKey } from '@/features/projects/queries'

export const membersKey = (projectId: string) => ['projects', projectId, 'members'] as const

const fetchMembers = (projectId: string) => api.get<ProjectMember[]>(`/projects/${projectId}/members`)

export function useMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: membersKey(projectId ?? ''),
    queryFn: () => fetchMembers(projectId!),
    enabled: !!projectId,
  })
}

/** Members of many projects in parallel (projects list avatars, shared-project lookups). */
export function useMembersOf(projectIds: string[]) {
  return useQueries({
    queries: projectIds.map((id) => ({ queryKey: membersKey(id), queryFn: () => fetchMembers(id) })),
    combine: (results) => ({
      byProject: new Map(projectIds.map((id, i) => [id, results[i]?.data])),
      isPending: results.some((r) => r.isPending),
    }),
  })
}

function useInvalidateMembers(projectId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: membersKey(projectId) })
    // Membership changes which projects a user can see.
    qc.invalidateQueries({ queryKey: projectsKey, exact: true })
  }
}

export function useAddMember(projectId: string) {
  const invalidate = useInvalidateMembers(projectId)
  return useMutation({
    mutationFn: (input: { user_id: string; role: AssignableRole }) =>
      api.post<ProjectMember>(`/projects/${projectId}/members`, input),
    onSuccess: ({ message }) => {
      invalidate()
      toast.success(message)
    },
  })
}

export function useUpdateMemberRole(projectId: string) {
  const invalidate = useInvalidateMembers(projectId)
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AssignableRole }) =>
      api.put<ProjectMember>(`/projects/${projectId}/members/${userId}`, { role }),
    onSuccess: ({ message }) => {
      invalidate()
      toast.success(message)
    },
  })
}

export function useRemoveMember(projectId: string) {
  const invalidate = useInvalidateMembers(projectId)
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: ({ message }) => {
      invalidate()
      toast.success(message)
    },
  })
}
