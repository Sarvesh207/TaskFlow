/** Where to go after signing in: `?next=` when it is a same-app path, else the dashboard. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}
