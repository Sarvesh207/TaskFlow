import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api, ApiRequestError } from '@/lib/api'
import type { LoginInput, RegisterInput, User } from '@/types/api'

export const meKey = ['me'] as const

async function fetchMe(): Promise<User | null> {
  try {
    return await api.get<User>('/auth/me')
  } catch (error) {
    // No session is a normal state, not an error.
    if (error instanceof ApiRequestError && error.status === 401) return null
    throw error
  }
}

export function useCurrentUser() {
  return useQuery({ queryKey: meKey, queryFn: fetchMe, staleTime: 5 * 60_000 })
}

export { useMe } from './me-context'

/**
 * Drops everything cached for the previous user. The `me` query is updated in
 * place rather than removed: <RequireAuth> is subscribed to it, and a removed
 * query would leave that subscriber showing the old user.
 */
export function removeUserData(qc: QueryClient) {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== meKey[0] })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => api.post('/auth/login', input),
    meta: { silentError: true },
    onSuccess: async () => {
      removeUserData(qc)
      // staleTime 0: after a sign-out the cache holds a fresh `null` that must not be reused.
      await qc.fetchQuery({ queryKey: meKey, queryFn: fetchMe, staleTime: 0 })
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => api.post<User>('/auth/register', input),
    meta: { silentError: true },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      removeUserData(qc)
      qc.setQueryData(meKey, null)
    },
  })
}
