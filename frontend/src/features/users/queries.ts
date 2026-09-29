import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { UpdateUserInput, User } from '@/types/api'
import { meKey } from '@/features/auth/queries'

export const usersKey = ['users'] as const

export function useUsers() {
  return useQuery({ queryKey: usersKey, queryFn: () => api.get<User[]>('/users'), staleTime: 60_000 })
}

export function useUser(id: string | undefined) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => api.get<User>(`/users/${id}`),
    enabled: !!id,
    // Seed from the directory so profile pages render instantly.
    placeholderData: () => qc.getQueryData<User[]>(usersKey)?.find((u) => u.id === id),
  })
}

/**
 * Every user keyed by id. Tasks only carry `assigned_to` and project owners are
 * not in `project_members`, so this is how ids become names and avatars.
 */
export function useUserDirectory() {
  const query = useUsers()
  const map = useMemo(() => new Map((query.data ?? []).map((u) => [u.id, u])), [query.data])
  return { ...query, map }
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateUserInput) => api.patch<User>(`/users/${id}`, input),
    onSuccess: ({ data, message }) => {
      qc.setQueryData(['users', id], data)
      qc.setQueryData<User | null>(meKey, (me) => (me && me.id === id ? { ...me, ...data } : me))
      qc.invalidateQueries({ queryKey: usersKey, exact: true })
      toast.success(message)
    },
  })
}
