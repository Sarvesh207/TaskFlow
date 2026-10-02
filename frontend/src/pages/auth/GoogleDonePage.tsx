import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { GOOGLE_AUTH_CHANNEL, type GoogleAuthResult } from '@/features/auth/google-popup'
import { safeNext } from '@/features/auth/redirect'

/**
 * Where the backend sends the Google sign-in popup when the flow ends
 * (`?next=` on success, `?error=CODE` on failure). Tells the tab that opened
 * the popup, then closes. If the window cannot close (the browser opened it as
 * a normal tab), carries on here instead.
 */
export function GoogleDonePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const reported = useRef(false)

  useEffect(() => {
    const error = params.get('error')
    const next = safeNext(params.get('next'))

    // Report once, even when StrictMode runs this effect twice.
    if (!reported.current) {
      reported.current = true
      const result: GoogleAuthResult = error ? { ok: false, error } : { ok: true, next }
      const channel = new BroadcastChannel(GOOGLE_AUTH_CHANNEL)
      channel.postMessage(result)
      channel.close()
      window.close()
    }

    // Still here: not a script-opened popup. Finish the sign-in in this window.
    const fallback = window.setTimeout(() => {
      navigate(error ? `/login?error=${encodeURIComponent(error)}` : next, { replace: true })
    }, 400)
    return () => window.clearTimeout(fallback)
  }, [params, navigate])

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
      <p className="flex items-center gap-2 text-sm text-muted" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Finishing Google sign-in…
      </p>
    </div>
  )
}
