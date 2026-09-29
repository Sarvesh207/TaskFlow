import { useSyncExternalStore } from 'react'

/**
 * Light / dark / system theme. The choice lives in localStorage and is applied
 * as a `dark` class on <html>. index.html runs the same logic inline before
 * first paint, so there is never a flash of the wrong theme.
 */

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'taskflow.theme'
export const DEFAULT_THEME: ThemePreference = 'dark'

const listeners = new Set<() => void>()

function systemQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
}

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // Storage blocked (private mode, sandbox) — fall back to the default.
  }
  return DEFAULT_THEME
}

let preference: ThemePreference = typeof window === 'undefined' ? DEFAULT_THEME : readStored()

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref !== 'system') return pref
  return systemQuery()?.matches ? 'dark' : 'light'
}

/** Apply the current preference to <html>, swapping every colour in one frame. */
export function applyTheme(pref: ThemePreference = preference) {
  const root = document.documentElement
  const resolved = resolveTheme(pref)
  root.classList.add('theme-switching')
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#070709' : '#f4f4f6')
  // Transitions are suppressed for the switch itself, then restored.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
}

function emit() {
  listeners.forEach((listener) => listener())
}

export function setTheme(next: ThemePreference) {
  preference = next
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Not persisted, but still applied for this session.
  }
  applyTheme(next)
  emit()
}

// Follow the OS while the preference is "system".
systemQuery()?.addEventListener?.('change', () => {
  if (preference !== 'system') return
  applyTheme()
  emit()
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// A string snapshot changes when either the choice or the OS theme changes.
const snapshot = () => `${preference}:${resolveTheme(preference)}`

export function useTheme() {
  const [pref, resolved] = useSyncExternalStore(subscribe, snapshot, () => `${DEFAULT_THEME}:dark`).split(':') as [
    ThemePreference,
    ResolvedTheme,
  ]
  return { preference: pref, resolved, setTheme }
}

/** Test helper: reset module state between tests. */
export function __resetThemeForTests(pref: ThemePreference = DEFAULT_THEME) {
  preference = pref
}
