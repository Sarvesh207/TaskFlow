import type { ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { MeContext } from './me-context'
import { useCurrentUser } from './queries'
import { safeNext } from './redirect'

function FullScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">{children}</div>
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending, error, refetch } = useCurrentUser()
  const location = useLocation()

  if (isPending) {
    return (
      <FullScreen>
        <Logo />
        <Spinner />
      </FullScreen>
    )
  }

  if (error) {
    return (
      <FullScreen>
        <Logo />
        <p className="max-w-sm text-sm text-muted">{errorMessage(error)}</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </FullScreen>
    )
  }

  if (!user) {
    const next = location.pathname + location.search
    return <Navigate to={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`} replace />
  }

  return <MeContext value={user}>{children}</MeContext>
}

/**
 * Keeps signed-in users away from /login and /register. Honours `?next=` so it
 * agrees with the login form, which also redirects there once the user is set.
 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser()
  const [params] = useSearchParams()
  if (isPending) return null
  if (user) return <Navigate to={safeNext(params.get('next'))} replace />
  return children
}
