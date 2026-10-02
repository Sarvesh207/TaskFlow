import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { IDS, PASSWORD } from '@/test/msw/db'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

async function signOut(user: ReturnType<typeof renderApp>['user']) {
  // Sign out lives in the sidebar's Settings popover (there is no top-bar account menu).
  await user.click(await screen.findByRole('button', { name: 'Settings' }))
  await user.click(await screen.findByRole('button', { name: 'Sign out' }))
}

describe('session', () => {
  it('F1: signing out lands on /login immediately, without another navigation', async () => {
    const { user, router } = renderApp('/profile', { as: IDS.alex })
    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument()

    await signOut(user)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('F2: signing in again in the same tab after signing out works', async () => {
    const { user, router } = renderApp('/', { as: IDS.alex })
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()

    await signOut(user)
    await screen.findByRole('heading', { name: 'Welcome back' })

    await user.type(screen.getByLabelText('Email'), 'jo@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    // The new user's data, not the previous user's cache.
    expect(await screen.findByText(/Welcome back, Jo/)).toBeInTheDocument()
  })

  it('an expired session on any request sends the user to /login with a notice', async () => {
    server.use(
      http.get('*/api/v1/projects', () =>
        HttpResponse.json(
          { success: false, statusCode: 401, code: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' },
          { status: 401 },
        ),
      ),
    )
    const { router } = renderApp('/projects', { as: IDS.alex })

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(await screen.findByText('Your session expired. Please sign in again.')).toBeInTheDocument()
  })
})
