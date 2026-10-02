import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IDS, sent } from '@/test/msw/db'
import { renderApp } from '@/test/render'

describe('create project modal', () => {
  it('opens over the projects list and goes to the new project when created', async () => {
    const { user, router } = renderApp('/projects', { as: IDS.alex })
    await user.click((await screen.findAllByRole('link', { name: /New Project/ }))[0]!)

    expect(await screen.findByRole('dialog', { name: 'Create Project' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/projects/new')
    // The list is rendered underneath (hidden from assistive tech while the modal is open).
    expect(screen.getByRole('heading', { name: 'Projects', level: 1, hidden: true })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'Mobile App')
    await user.click(screen.getByRole('button', { name: 'Create Project' }))

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/projects\/[0-9a-f-]{36}$/))
    expect(sent('POST', '/projects')).toEqual([{ name: 'Mobile App', status: 'active' }])
    expect(await screen.findByRole('heading', { name: 'Mobile App', level: 1 })).toBeInTheDocument()
  })

  it('Cancel goes back to the list without creating anything', async () => {
    const { user, router } = renderApp('/projects/new', { as: IDS.alex })
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/projects'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(sent('POST', '/projects')).toEqual([])
  })
})
