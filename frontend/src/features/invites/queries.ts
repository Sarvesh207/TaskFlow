import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { membersKey } from '@/features/members/queries'
import { projectsKey } from '@/features/projects/queries'
import type { InviteInput, InvitePreview, ProjectInvite } from '@/types/api'

export const invitesKey = (projectId: string) => ['projects', projectId, 'invites'] as const
const previewKey = (token: string) => ['invite', token] as const

// ------------------------------------------------- owners and admins (Members page)

export function useProjectInvites(projectId: string, enabled = true) {
  return useQuery({
    queryKey: invitesKey(projectId),
    queryFn: () => api.get<ProjectInvite[]>(`/projects/${projectId}/invites`),
    enabled,
  })
}

function useInvalidateInvites(projectId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: invitesKey(projectId) })
}

export function useCreateInvite(projectId: string) {
  const invalidate = useInvalidateInvites(projectId)
  return useMutation({
    mutationFn: (input: InviteInput) => api.post<ProjectInvite>(`/projects/${projectId}/invites`, input),
    // The form shows field errors (already a member, already invited) itself.
    meta: { silentError: true },
    onSuccess: ({ data }) => {
      invalidate()
      toast.success(`Invite sent to ${data.email}`)
    },
  })
}

export function useResendInvite(projectId: string) {
  const invalidate = useInvalidateInvites(projectId)
  return useMutation({
    mutationFn: (inviteId: string) => api.post<ProjectInvite>(`/projects/${projectId}/invites/${inviteId}/resend`),
    onSuccess: ({ data }) => {
      invalidate()
      toast.success(`Invite resent to ${data.email}`)
    },
  })
}

export function useRevokeInvite(projectId: string) {
  const invalidate = useInvalidateInvites(projectId)
  return useMutation({
    mutationFn: (inviteId: string) => api.delete(`/projects/${projectId}/invites/${inviteId}`),
    onSuccess: ({ message }) => {
      invalidate()
      toast.success(message)
    },
  })
}

// -------------------------------------------------------- the recipient (/invite/:token)

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: previewKey(token),
    queryFn: () => api.get<InvitePreview>(`/invites/${token}`),
    staleTime: 0,
  })
}

export function useAcceptInvite(token: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ project_id: string }>(`/invites/${token}/accept`),
    // The invite page explains failures (wrong account, expired) in place.
    meta: { silentError: true },
    onSuccess: ({ data }) => {
      // The user can now see a new project and its members.
      qc.invalidateQueries({ queryKey: projectsKey })
      qc.invalidateQueries({ queryKey: membersKey(data.project_id) })
      qc.invalidateQueries({ queryKey: previewKey(token) })
    },
  })
}
