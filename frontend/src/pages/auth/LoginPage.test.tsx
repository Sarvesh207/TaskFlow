import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PASSWORD } from '@/test/msw/db'
import { renderApp } from '@/test/render'

async function signIn(user: ReturnType<typeof renderApp>['user'], email: string, password = PASSWORD) {
  await user.type(await screen.findByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  it('sends signed-out visitors to /login and back to where they were going', async () => {
    const { user, router } = renderApp('/projects')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('?next=%2Fprojects')

    await signIn(user, 'alex@example.com')
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/projects')
  })

  it('validates before calling the API', async () => {
    const { user } = renderApp('/login')
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('shows a friendly message for wrong credentials', async () => {
    const { user } = renderApp('/login')
    await signIn(user, 'alex@example.com', 'Wrong1!')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
  })

  it('ignores an off-site ?next= redirect', async () => {
    const { user, router } = renderApp('/login?next=//evil.example.com')
    await signIn(user, 'alex@example.com')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('links "Continue with Google" to the backend OAuth route, keeping ?next=', async () => {
    renderApp('/login?next=/projects')
    const link = await screen.findByRole('link', { name: 'Continue with Google' })
    expect(link).toHaveAttribute('href', 'http://localhost/api/v1/auth/google?next=%2Fprojects')
  })

  it('does not pass an off-site ?next= on to Google sign-in', async () => {
    renderApp('/login?next=//evil.example.com')
    const link = await screen.findByRole('link', { name: 'Continue with Google' })
    expect(link).toHaveAttribute('href', 'http://localhost/api/v1/auth/google?next=%2F')
  })

  it('explains a failed Google sign-in and drops ?error= from the URL', async () => {
    const { router } = renderApp('/login?error=GOOGLE_EMAIL_UNVERIFIED&next=/projects')
    expect(await screen.findByRole('alert')).toHaveTextContent('Your Google email address is not verified')
    await waitFor(() => expect(router.state.location.search).toBe('?next=%2Fprojects'))
  })

  it('shows a generic message for other Google errors', async () => {
    renderApp('/login?error=GOOGLE_AUTH_FAILED')
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in failed. Please try again.')
  })

  it('redirects signed-in users away from /login', async () => {
    const { router } = renderApp('/login', { as: '00000000-0000-4000-8000-00000000000a' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
