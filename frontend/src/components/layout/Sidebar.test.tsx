import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IDS } from '@/test/msw/db'
import { renderApp } from '@/test/render'

describe('app shell without a top bar', () => {
  it('the sidebar search opens the command palette', async () => {
    const { user } = renderApp('/', { as: IDS.alex })
    // jsdom applies no CSS, so the phone header's search icon is in the DOM too; the sidebar's
    // button is the one that shows "Search…".
    const buttons = await screen.findAllByRole('button', { name: 'Search or jump to' })
    await user.click(buttons.find((b) => b.textContent?.includes('Search…'))!)
    expect(await screen.findByPlaceholderText('Search projects, pages and actions…')).toBeInTheDocument()
  })

  it('Ctrl+K still opens the palette from anywhere', async () => {
    const { user } = renderApp('/projects', { as: IDS.alex })
    await screen.findByRole('heading', { name: 'Projects', level: 1 })
    await user.keyboard('{Control>}k{/Control}')
    expect(await screen.findByPlaceholderText('Search projects, pages and actions…')).toBeInTheDocument()
  })

  it('theme and account live in Settings; the old top-bar controls are gone', async () => {
    const { user } = renderApp('/', { as: IDS.alex })
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Switch to (light|dark) theme/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(await screen.findByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('the collapsed rail keeps search as an icon button', async () => {
    const { user } = renderApp('/', { as: IDS.alex })
    await user.click(await screen.findByRole('button', { name: 'Collapse sidebar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument())

    const search = screen.getAllByRole('button', { name: 'Search or jump to' }).find((b) => b.hasAttribute('title'))!
    expect(search).toHaveAttribute('title', expect.stringMatching(/^Search \((Ctrl|⌘) K\)$/))
    expect(search).not.toHaveTextContent('Search…')
    await user.click(search)
    expect(await screen.findByPlaceholderText('Search projects, pages and actions…')).toBeInTheDocument()
  })
})
