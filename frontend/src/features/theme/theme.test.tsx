import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDS } from '@/test/msw/db'
import { renderApp } from '@/test/render'
import { __resetThemeForTests, resolveTheme, setTheme, THEME_STORAGE_KEY } from './theme'

const html = () => document.documentElement

beforeEach(() => {
  localStorage.clear()
  html().classList.remove('dark')
  __resetThemeForTests('dark')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('theme store', () => {
  it('applies the choice to <html> and remembers it', () => {
    setTheme('light')
    expect(html()).not.toHaveClass('dark')
    expect(html().style.colorScheme).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    setTheme('dark')
    expect(html()).toHaveClass('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('"system" follows the operating system', () => {
    const mock = (matches: boolean) =>
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList)
    mock(true)
    expect(resolveTheme('system')).toBe('dark')
    mock(false)
    expect(resolveTheme('system')).toBe('light')
  })
})

describe('Settings popover', () => {
  it('switches the whole app between light and dark from the sidebar', async () => {
    const { user } = renderApp('/', { as: IDS.alex })
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(html()).not.toHaveClass('dark') // module state reset above; nothing applied yet

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    const theme = await screen.findByRole('radiogroup', { name: 'Theme' })
    expect(within(theme).getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')

    await user.click(within(theme).getByRole('radio', { name: 'Light' }))
    expect(html()).not.toHaveClass('dark')
    expect(within(theme).getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    await user.click(within(theme).getByRole('radio', { name: 'Dark' }))
    await waitFor(() => expect(html()).toHaveClass('dark'))
  })

  it('arrow keys move through Light / Dark / System', async () => {
    const { user } = renderApp('/', { as: IDS.alex })
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    const theme = await screen.findByRole('radiogroup', { name: 'Theme' })

    within(theme).getByRole('radio', { name: 'Dark' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(within(theme).getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
    expect(within(theme).getByRole('radio', { name: 'System' })).toHaveFocus()
  })
})
