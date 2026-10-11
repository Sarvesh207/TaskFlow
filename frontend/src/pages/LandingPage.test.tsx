import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IDS } from '@/test/msw/db'
import { renderApp } from '@/test/render'

describe('landing page', () => {
  it('is what signed-out visitors see at /', async () => {
    const { router } = renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: /turn ideas into real progress/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('links to sign up and sign in', async () => {
    const { user, router } = renderApp('/')
    const [getStarted] = await screen.findAllByRole('link', { name: /get started free/i })
    await user.click(getStarted!)
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/register')
  })

  it('is replaced by the dashboard for signed-in users', async () => {
    renderApp('/', { as: IDS.alex })
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: /turn ideas into/i })).not.toBeInTheDocument()
  })

  it('does not replace the login redirect for other pages', async () => {
    const { router } = renderApp('/projects')
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})
