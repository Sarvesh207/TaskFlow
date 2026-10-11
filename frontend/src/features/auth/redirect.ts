/**
 * The `?email=` and `?next=` an invite link passes to /login and /register,
 * carried across when switching between the two pages.
 */
export function authCarryOver(params: URLSearchParams): string {
  const carried = new URLSearchParams()
  for (const key of ['email', 'next']) {
    const value = params.get(key)
    if (value) carried.set(key, value)
  }
  const query = carried.toString()
  return query ? `?${query}` : ''
}

/** Where to go after signing in: `?next=` when it is a same-app path, else the dashboard. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}
