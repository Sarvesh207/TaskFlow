import { BASE_URL } from '@/lib/api'

/**
 * Google sign-in runs in a popup. The backend sends the popup to
 * /auth/google/done, which reports the result on this channel and closes.
 * A same-origin BroadcastChannel is used instead of `window.opener`, because
 * Google's pages may cut the popup off from the tab that opened it.
 */
export const GOOGLE_AUTH_CHANNEL = 'taskflow:google-auth'

export type GoogleAuthResult = { ok: true; next: string } | { ok: false; error: string }

/** The backend route that starts the OAuth flow. */
export function googleAuthUrl(next: string, popup = false): string {
  const params = new URLSearchParams({ next })
  if (popup) params.set('mode', 'popup')
  return `${BASE_URL}/auth/google?${params}`
}

/** A centred popup on the Google flow, or null when the browser blocks it. */
export function openGooglePopup(next: string): Window | null {
  const width = 500
  const height = 640
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2)
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2)

  return window.open(
    googleAuthUrl(next, true),
    'taskflow-google-signin',
    `popup,width=${width},height=${height},left=${left},top=${top}`,
  )
}
