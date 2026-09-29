import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { db, IDS, makeUser, sent } from '@/test/msw/db'
import { renderApp } from '@/test/render'

const path = `/projects/${IDS.project}/members`

function userOptions() {
  const dialog = screen.getByRole('dialog')
  const select = within(dialog).getByRole('combobox', { name: 'User' })
  return within(select)
    .getAllByRole('option')
    .map((o) => o.textContent)
}

describe('ProjectMembersPage', () => {
  it('lists the owner first, then members, with roles', async () => {
    renderApp(path, { as: IDS.alex })
    const rows = await screen.findAllByRole('row')
    const body = rows.slice(1).map((r) => r.textContent)
    expect(body[0]).toMatch(/Alex Morgan.*Owner/)
    expect(body.some((t) => /Sam Rivera.*Admin/.test(t ?? ''))).toBe(true)
    expect(body.some((t) => /Jo Park.*Member/.test(t ?? ''))).toBe(true)
  })

  it('hides member management from plain members', async () => {
    renderApp(path, { as: IDS.jo })
    await screen.findByText('Sam Rivera')
    expect(screen.queryByRole('button', { name: 'Add Member' })).not.toBeInTheDocument()
  })

  it('adds a member, offering only people not already on the project', async () => {
    const { user } = renderApp(path, { as: IDS.alex })
    await user.click(await screen.findByRole('button', { name: 'Add Member' }))

    await waitFor(() => expect(userOptions()).toContain('Olivia Chen (olivia@example.com)'))
    expect(userOptions().some((o) => o?.includes('Jo Park'))).toBe(false)

    const dialog = screen.getByRole('dialog')
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'User' }), 'Olivia Chen (olivia@example.com)')
    await user.click(within(dialog).getByRole('button', { name: 'Add Member' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(sent('POST', '/members')).toEqual([{ user_id: IDS.olivia, role: 'member' }])
    expect(await screen.findByText('Olivia Chen')).toBeInTheDocument()
  })

  it('requires a user to be picked', async () => {
    const { user } = renderApp(path, { as: IDS.alex })
    await user.click(await screen.findByRole('button', { name: 'Add Member' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Add Member' }))
    expect(within(dialog).getByText('Select a user to add')).toBeInTheDocument()
    expect(sent('POST', '/members')).toEqual([])
  })

  it('F4: someone who signed up after the page loaded appears when the modal reopens', async () => {
    const { user } = renderApp(path, { as: IDS.alex })
    await user.click(await screen.findByRole('button', { name: 'Add Member' }))
    await waitFor(() => expect(userOptions()).toContain('Olivia Chen (olivia@example.com)'))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    db.users.push(makeUser('00000000-0000-4000-8000-0000000000ff', 'Nina New', 'nina@example.com'))

    await user.click(screen.getByRole('button', { name: 'Add Member' }))
    await waitFor(() => expect(userOptions()).toContain('Nina New (nina@example.com)'))
  })

  it('?add=1 opens the modal directly (project menu deep link)', async () => {
    renderApp(`${path}?add=1`, { as: IDS.alex })
    expect(await screen.findByRole('dialog', { name: 'Add Project Member' })).toBeInTheDocument()
  })
})
