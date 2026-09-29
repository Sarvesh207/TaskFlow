import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { IDS, sent } from '@/test/msw/db'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

describe('MyProfilePage', () => {
  it('saves only the fields that changed', async () => {
    const { user } = renderApp('/profile', { as: IDS.alex })
    await user.type(await screen.findByLabelText('Bio'), 'Shipping things.')
    await user.type(screen.getByLabelText('Phone'), '+91 98765 43210')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('User updated successfully.')).toBeInTheDocument()
    expect(sent('PATCH', `/users/${IDS.alex}`)).toEqual([{ bio: 'Shipping things.', phone: '+91 98765 43210' }])
  })

  it('checks the phone format before saving', async () => {
    const { user } = renderApp('/profile', { as: IDS.alex })
    await user.type(await screen.findByLabelText('Phone'), '12')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Phone must be 7-20 digits and may start with +')).toBeInTheDocument()
    expect(sent('PATCH', `/users/${IDS.alex}`)).toEqual([])
  })

  it('shows server field errors next to the right input', async () => {
    server.use(
      http.patch('*/api/v1/users/:id', () =>
        HttpResponse.json(
          {
            success: false,
            statusCode: 409,
            code: 'ALREADY_EXISTS',
            message: 'A record with this "email" already exists.',
            fieldErrors: { email: ['That email is taken'] },
          },
          { status: 409 },
        ),
      ),
    )
    const { user } = renderApp('/profile', { as: IDS.alex })
    const email = await screen.findByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'sam@example.com')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('That email is taken')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('Discard restores the saved values', async () => {
    const { user } = renderApp('/profile', { as: IDS.alex })
    const name = await screen.findByLabelText('Full Name')
    await user.clear(name)
    await user.type(name, 'Someone Else')
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    await waitFor(() => expect(screen.getByLabelText('Full Name')).toHaveValue('Alex Morgan'))
  })
})
