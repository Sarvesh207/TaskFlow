import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { db, IDS, makeInvite, PASSWORD, sent, type FakeInvite } from '@/test/msw/db'
import { renderApp } from '@/test/render'

const INVITE_ID = '00000000-0000-4000-8000-000000000301'

/** An open invite to "Website Redesign", sent by Alex, for `email`. */
function seedInvite(email: string, overrides: Partial<FakeInvite> = {}) {
  const invite = makeInvite({ id: INVITE_ID, email, role: 'admin', ...overrides })
  db.invites.push(invite)
  return `/invite/${invite.token}`
}

describe('InvitePage', () => {
  it('shows who invited you to what, and offers sign-up/sign-in for the invited email', async () => {
    const path = seedInvite('newbie@example.com')
    renderApp(path)

    // The loading screen shares the heading, so wait for the invite itself.
    expect(await screen.findByText('Website Redesign')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "You're invited" })).toBeInTheDocument()
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()

    const query = new URLSearchParams({ email: 'newbie@example.com', next: path }).toString()
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', `/register?${query}`)
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', `/login?${query}`)
    expect(screen.getByRole('link', { name: /continue with google/i }).getAttribute('href')).toContain(
      encodeURIComponent(path),
    )
  })

  it('a brand-new person signs up from the invite and joins the project', async () => {
    const path = seedInvite('newbie@example.com')
    const { user, router } = renderApp(path)

    await user.click(await screen.findByRole('link', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('newbie@example.com')

    await user.type(screen.getByLabelText('Full name'), 'Nina Newbie')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    // Back on the invite, now signed in with the right email.
    await user.click(await screen.findByRole('button', { name: 'Join project' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${IDS.project}`))
    expect(db.members.find((m) => m.users.email === 'newbie@example.com')?.role).toBe('admin')
    expect(sent('POST', `${path.replace('/invite/', '/invites/')}/accept`)).toHaveLength(1)
  })

  it('an existing user signs in from the invite with their email prefilled', async () => {
    const path = seedInvite('olivia@example.com')
    const { user } = renderApp(path)

    await user.click(await screen.findByRole('link', { name: 'Sign in' }))
    expect(await screen.findByLabelText('Email')).toHaveValue('olivia@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('button', { name: 'Join project' })).toBeInTheDocument()
  })

  it('signed in with the invited email: one click joins', async () => {
    const path = seedInvite('olivia@example.com')
    const { user, router } = renderApp(path, { as: IDS.olivia })

    await user.click(await screen.findByRole('button', { name: 'Join project' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${IDS.project}`))
    expect(db.members.some((m) => m.user_id === IDS.olivia && m.role === 'admin')).toBe(true)
  })

  it('signed in with a different email: explains and offers to sign out', async () => {
    const path = seedInvite('someone.else@example.com')
    const { user } = renderApp(path, { as: IDS.olivia })

    expect(await screen.findByText(/You're signed in as/)).toHaveTextContent(
      "You're signed in as olivia@example.com, but this invite was sent to someone.else@example.com",
    )
    expect(screen.queryByRole('button', { name: 'Join project' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('link', { name: 'Create account' })).toBeInTheDocument()
  })

  it('an expired invite says so', async () => {
    const path = seedInvite('newbie@example.com', { expires_at: '2026-01-01T00:00:00.000Z' })
    renderApp(path)
    expect(await screen.findByRole('heading', { name: 'This invite has expired' })).toBeInTheDocument()
    expect(screen.getByText(/Ask Alex Morgan to send you a new one/)).toBeInTheDocument()
  })

  it('a cancelled or used invite says so', async () => {
    const path = seedInvite('newbie@example.com', { revoked_at: '2026-09-02T00:00:00.000Z' })
    renderApp(path)
    expect(await screen.findByRole('heading', { name: 'This invite can’t be used anymore' })).toBeInTheDocument()
  })

  it('an unknown link says it is not valid', async () => {
    renderApp(`/invite/${'z'.repeat(43)}`)
    expect(await screen.findByRole('heading', { name: 'This invite link isn’t valid' })).toBeInTheDocument()
  })
})
