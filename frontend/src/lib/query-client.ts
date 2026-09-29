import { MutationCache, QueryCache, QueryClient, type DefaultOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { removeUserData } from '@/features/auth/queries'
import { ApiRequestError, errorMessage, isSessionError } from './api'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** The caller renders the error itself (e.g. the login form) — skip the toast. */
      silentError?: boolean
    }
  }
}

function handleSessionError(client: QueryClient, error: unknown): boolean {
  if (!isSessionError(error)) return false
  // Dropping the user makes <RequireAuth> redirect to /login; the rest of the cache belongs to them.
  if (client.getQueryData(['me'])) {
    removeUserData(client)
    client.setQueryData(['me'], null)
    if (error.code === 'TOKEN_EXPIRED') toast.error('Your session expired. Please sign in again.')
  }
  return true
}

/** A client wired with the app's global error handling. Tests create a fresh one per render. */
export function createQueryClient(overrides: DefaultOptions = {}): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        handleSessionError(client, error)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (handleSessionError(client, error) || mutation.meta?.silentError) return
        // Field-level validation errors are rendered next to the inputs.
        if (error instanceof ApiRequestError && Object.keys(error.fieldErrors).length > 0) return
        toast.error(errorMessage(error))
      },
    }),
    defaultOptions: {
      ...overrides,
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          // 4xx will not fix themselves.
          if (error instanceof ApiRequestError && error.status >= 400 && error.status < 500) return false
          return failureCount < 2
        },
        ...overrides.queries,
      },
    },
  })
  return client
}

export const queryClient = createQueryClient()
