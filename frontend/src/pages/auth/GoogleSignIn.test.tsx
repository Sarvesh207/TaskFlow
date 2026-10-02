import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GOOGLE_AUTH_CHANNEL, type GoogleAuthResult } from '@/features/auth/google-popup'
import { IDS, signInAs } from '@/test/msw/db'
import { renderApp } from '@/test/render'

/** Stand-in for the popup page: report a result the way /auth/google/done does. */
function reportFromPopup(result: GoogleAuthResult) {
  const channel = new BroadcastChannel(GOOGLE_AUTH_CHANNEL)
  channel.postMessage(result)
  channel.close()
}

function fakePopup() {
  return { closed: false, focus: vi.fn() } as unknown as Window
}

describe('Continue with Google (popup)', () => {
  afterEach(() => vi.useRealTimers())

  it('opens the OAuth flow in a popup instead of leaving the page', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(fakePopup())
    const { user, router } = renderApp('/login?next=/projects')

    await user.click(await screen.findByRole('link', { name: 'Continue with Google' }))

    expect(open).toHaveBeenCalledTimes(1)
    const [url, , features] = open.mock.calls[0]!
    expect(url).toBe('http://localhost/api/v1/auth/google?next=%2Fprojects&mode=popup')
    expect(features).toContain('popup')
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByRole('link', { name: 'Waiting for Google…' })).toBeInTheDocument()
  })

  it('signs in and goes to ?next= when the popup reports success', async () => {
    vi.spyOn(window, 'open').mockReturnValue(fakePopup())
    const { user, router } = renderApp('/login?next=/projects')
    await user.click(await screen.findByRole('link', { name: 'Continue with Google' }))

    // The callback set the session cookie in the popup.
    signInAs(IDS.alex)
    reportFromPopup({ ok: true, next: '/projects' })

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/projects')
  })

  it('shows the error when the popup reports a failure', async () => {
    vi.spyOn(window, 'open').mockReturnValue(fakePopup())
    const { user } = renderApp('/login')
    await user.click(await screen.findByRole('link', { name: 'Continue with Google' }))

    reportFromPopup({ ok: false, error: 'GOOGLE_EMAIL_UNVERIFIED' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Your Google email address is not verified')
    expect(screen.getByRole('link', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('stops waiting when the popup is closed without a result', async () => {
    const popup = fakePopup()
    vi.spyOn(window, 'open').mockReturnValue(popup)
    const { user } = renderApp('/login')
    await user.click(await screen.findByRole('link', { name: 'Continue with Google' }))
    expect(screen.getByRole('link', { name: 'Waiting for Google…' })).toBeInTheDocument()

    Object.assign(popup, { closed: true })
    expect(await screen.findByRole('link', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('falls back to a full-page redirect when the popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    renderApp('/register')
    const link = await screen.findByRole('link', { name: 'Continue with Google' })

    // Default not prevented: the link's own href (no mode=popup) is followed.
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(link).toHaveAttribute('href', 'http://localhost/api/v1/auth/google?next=%2F')
  })
})

describe('GoogleDonePage (inside the popup)', () => {
  function listen() {
    const received: GoogleAuthResult[] = []
    const channel = new BroadcastChannel(GOOGLE_AUTH_CHANNEL)
    channel.onmessage = (e: MessageEvent<GoogleAuthResult>) => received.push(e.data)
    return { received, close: () => channel.close() }
  }

  it('reports success to the opening tab and closes', async () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    const listener = listen()
    renderApp('/auth/google/done?next=/projects')

    await waitFor(() => expect(listener.received).toEqual([{ ok: true, next: '/projects' }]))
    expect(close).toHaveBeenCalled()
    listener.close()
  })

  it('reports the error code, and ignores an off-site next', async () => {
    vi.spyOn(window, 'close').mockImplementation(() => {})
    const listener = listen()
    renderApp('/auth/google/done?error=GOOGLE_AUTH_FAILED')

    await waitFor(() => expect(listener.received).toEqual([{ ok: false, error: 'GOOGLE_AUTH_FAILED' }]))
    listener.close()

    const offsite = listen()
    renderApp('/auth/google/done?next=//evil.example.com')
    await waitFor(() => expect(offsite.received).toContainEqual({ ok: true, next: '/' }))
    offsite.close()
  })

  it('carries on in this window when it cannot close (not a popup)', async () => {
    vi.spyOn(window, 'close').mockImplementation(() => {})
    const { router } = renderApp('/auth/google/done?error=GOOGLE_AUTH_FAILED')

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in failed')
  })
})
