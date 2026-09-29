import { createContext, use } from 'react'
import type { User } from '@/types/api'

/**
 * The signed-in user, provided by <RequireAuth>.
 *
 * Components read the user from here rather than from the `me` query directly:
 * when the session ends, the query flips to `null` before <RequireAuth> has
 * re-rendered to redirect, and any component that re-renders in between would
 * otherwise see no user. The context only changes when the guard renders, so
 * everything below it always has one.
 */
export const MeContext = createContext<User | null>(null)

/** The signed-in user. Only call below <RequireAuth>. */
export function useMe(): User {
  const me = use(MeContext)
  if (!me) throw new Error('useMe() called outside an authenticated route')
  return me
}
