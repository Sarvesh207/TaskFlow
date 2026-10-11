import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { db, IDS, makeInvite, sent } from '@/test/msw/db'
import { renderApp } from '@/test/render'

const path = `/projects/${IDS.project}/members`

function pendingList() {
  return screen.findByRole('region', { name: /Pending invites/ })
}

describe('inviting by email from the Members page', () => {
  it('sends an invite and lists it as pending', async () => {
    const { user } = renderApp(path, { as: IDS.alex })
    await user.click(await screen.findByRole('button', { name: 'Add Member' }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByRole('tab', { name: 'Invite by email' })).toHaveAttribute('aria-selected', 'true')
    await user.type(within(dialog).getByLabelText('Email'), 'Newbie@Example.com')
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'admin')
    await user.click(within(dialog).getByRole('button', { name: 'Send Invite' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(sent('POST', '/invites')).toEqual([{ email: 'Newbie@Example.com', role: 'admin' }])
    const list = await pendingList()
    expect(within(list).getByText('newbie@example.com')).toBeInTheDocument()
    expect(within(list).getByText('Admin')).toBeInTheDocument()
  })

  it('checks the email before sending', async () => {
    const { user } = renderApp(path, { as: IDS.alex })
    await user.click(await screen.findByRole('button', { name: 'Add Member' }))
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText('Email'), 'not-an-email')
    await user.click(within(dialog).getByRole('button', { name: 'Send Invite' }))
    expect(within(dialog).getByText('Enter a valid email address')).toBeInTheDocument()
    expect(sent('POST', '/invites')).toEqual([])
  })

  it('shows the API error on the field when the person is already on the project', async () => {
    const { user } = renderApp(path, { as: IDS.alex })
    await user.click(await screen.findByRole('button', { name: 'Add Member' }))
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText('Email'), 'jo@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Send Invite' }))
    expect(await within(dialog).findByText('This person is already on the project')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('resends and cancels pending invites', async () => {
    db.invites.push(makeInvite({ id: '00000000-0000-4000-8000-000000000301', email: 'pending@example.com' }))
    const { user } = renderApp(path, { as: IDS.sam })

    const list = await pendingList()
    expect(within(list).getByText(/Invited by Alex Morgan · expires in 6 days/)).toBeInTheDocument()

    await user.click(within(list).getByRole('button', { name: 'Resend invite to pending@example.com' }))
    await waitFor(() => expect(sent('POST', '/resend')).toHaveLength(1))

    await user.click(within(list).getByRole('button', { name: 'Cancel invite to pending@example.com' }))
    const confirm = await screen.findByRole('dialog', { name: 'Cancel invite' })
    await user.click(within(confirm).getByRole('button', { name: 'Cancel invite' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: /Pending invites/ })).not.toBeInTheDocument())
    expect(db.invites[0]?.revoked_at).not.toBeNull()
  })

  it('plain members see no invites and never ask for them', async () => {
    db.invites.push(makeInvite({ id: '00000000-0000-4000-8000-000000000301', email: 'pending@example.com' }))
    renderApp(path, { as: IDS.jo })
    await screen.findByText('Sam Rivera')
    expect(screen.queryByText('pending@example.com')).not.toBeInTheDocument()
    expect(db.requests.some((r) => r.path.endsWith('/invites'))).toBe(false)
  })
})
