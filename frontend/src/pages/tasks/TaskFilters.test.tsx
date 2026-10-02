import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IDS } from '@/test/msw/db'
import { renderApp } from '@/test/render'
import { chooseOption, optionNames } from '@/test/select-menu'

describe('priority filter on the project task list', () => {
  const path = `/projects/${IDS.project}/tasks`

  it('offers All / Low / Medium / High and filters the table', async () => {
    const { user } = renderApp(path, { as: IDS.alex })
    // Generous: the first render of a lazy page compiles its chunk, slow when the suite runs in parallel.
    expect(await screen.findByRole('link', { name: 'Fix login bug' }, { timeout: 12_000 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Design homepage' })).toBeInTheDocument()

    expect(await optionNames(user, 'Filter by priority')).toEqual(['All Priority', 'Low', 'Medium', 'High'])

    await chooseOption(user, 'Filter by priority', 'High')
    expect(screen.getByRole('link', { name: 'Fix login bug' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Design homepage' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Filter by priority')).toHaveTextContent('High')

    await chooseOption(user, 'Filter by priority', 'All Priority')
    expect(await screen.findByRole('link', { name: 'Design homepage' })).toBeInTheDocument()
  })
})

describe('filters on My Tasks', () => {
  it('filters by priority and by project with the styled dropdowns', async () => {
    const { user } = renderApp('/my-tasks', { as: IDS.jo })
    expect(await screen.findByRole('link', { name: 'Fix login bug' }, { timeout: 12_000 })).toBeInTheDocument()

    await chooseOption(user, 'Filter by priority', 'Low')
    expect(screen.queryByRole('link', { name: 'Fix login bug' })).not.toBeInTheDocument()

    await chooseOption(user, 'Filter by priority', 'All Priority')
    expect(await screen.findByRole('link', { name: 'Fix login bug' })).toBeInTheDocument()

    expect(await optionNames(user, 'Filter by project')).toEqual(['All Projects', 'Website Redesign'])
    await chooseOption(user, 'Filter by project', 'Website Redesign')
    expect(screen.getByRole('link', { name: 'Fix login bug' })).toBeInTheDocument()
  })
})
