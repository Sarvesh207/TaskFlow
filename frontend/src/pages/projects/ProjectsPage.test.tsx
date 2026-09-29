import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { db, IDS } from '@/test/msw/db'
import { renderApp } from '@/test/render'

// The sidebar also lists projects as shortcuts, so queries target the page content.
const page = () => within(screen.getByRole('main'))

describe('ProjectsPage', () => {
  it('lists only the projects the user belongs to', async () => {
    renderApp('/projects', { as: IDS.jo })
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(page().getByRole('link', { name: /Website Redesign/ })).toBeInTheDocument()
    expect(page().queryByText('Mobile App')).not.toBeInTheDocument()
  })

  it('shows owner and members in the avatar stack', async () => {
    renderApp('/projects', { as: IDS.alex })
    expect(await screen.findByLabelText('3 members')).toBeInTheDocument()
  })

  it('filters by search text and status', async () => {
    db.projects[1]!.owner_id = IDS.alex // make both projects visible to Alex
    const { user } = renderApp('/projects', { as: IDS.alex })
    await screen.findByRole('table')

    await user.selectOptions(page().getByRole('combobox', { name: 'Filter by status' }), 'archived')
    expect(page().queryByRole('link', { name: /Website Redesign/ })).not.toBeInTheDocument()
    expect(page().getByRole('link', { name: /Mobile App/ })).toBeInTheDocument()

    await user.selectOptions(page().getByRole('combobox', { name: 'Filter by status' }), 'all')
    await user.type(page().getByRole('searchbox', { name: 'Search projects' }), 'zzz')
    expect(await page().findByText('No matching projects')).toBeInTheDocument()
  })

  it('reads the search from ?q= (command palette search)', async () => {
    renderApp('/projects?q=website', { as: IDS.alex })
    const table = await screen.findByRole('table')
    expect(within(table).getByText('Website Redesign')).toBeInTheDocument()
    expect(page().getByRole('searchbox', { name: 'Search projects' })).toHaveValue('website')
  })

  it('offers to create the first project when there are none', async () => {
    db.projects = []
    renderApp('/projects', { as: IDS.alex })
    expect(await screen.findByText('No projects yet')).toBeInTheDocument()
    expect(page().getAllByRole('link', { name: /New Project/ }).length).toBeGreaterThan(0)
  })
})
