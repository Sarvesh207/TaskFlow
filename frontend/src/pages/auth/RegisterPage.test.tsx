import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'

describe('RegisterPage', () => {
  it('shows the password checklist only once the user starts typing', async () => {
    const { user } = renderApp('/register')
    const password = await screen.findByLabelText('Password')
    expect(screen.queryByRole('list', { name: 'Password requirements' })).not.toBeInTheDocument()

    await user.type(password, 'abc')
    const rules = screen.getByRole('list', { name: 'Password requirements' })
    expect(within(rules).getAllByRole('listitem')).toHaveLength(5)

    await user.clear(password)
    expect(screen.queryByRole('list', { name: 'Password requirements' })).not.toBeInTheDocument()
  })

  it('shows the checklist when an empty password is submitted', async () => {
    const { user } = renderApp('/register')
    await user.click(await screen.findByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('list', { name: 'Password requirements' })).toBeInTheDocument()
  })

  it('ticks off each rule as it is met', async () => {
    const { user } = renderApp('/register')
    await user.type(await screen.findByLabelText('Password'), 'Passw0rd')
    const rules = screen.getByRole('list', { name: 'Password requirements' })
    expect(within(rules).getByText('One number')).toHaveClass('text-emerald-600')
    expect(within(rules).getByText('One special character')).toHaveClass('text-muted')
  })
})
