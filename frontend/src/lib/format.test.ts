import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDueDate, formatRelative, initials, percent, toDateInput, todayKey } from './format'

afterEach(() => {
  vi.useRealTimers()
})

describe('formatDueDate', () => {
  it('formats SQL DATE values in UTC so the day never shifts', () => {
    // Midnight UTC is still the previous day in the Americas; the label must not move.
    expect(formatDueDate('2026-10-01T00:00:00.000Z')).toBe('Oct 1, 2026')
    expect(formatDueDate('2026-10-01T00:00:00.000Z', true)).toBe('Oct 1')
  })

  it('shows a dash for empty values', () => {
    expect(formatDueDate(null)).toBe('—')
  })
})

describe('toDateInput', () => {
  it('returns YYYY-MM-DD for date inputs', () => {
    expect(toDateInput('2026-10-01T00:00:00.000Z')).toBe('2026-10-01')
    expect(toDateInput(null)).toBe('')
  })
})

describe('todayKey', () => {
  it('uses the local calendar date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 23, 30))
    expect(todayKey()).toBe('2026-01-05')
  })
})

describe('initials', () => {
  it.each([
    ['Alex Morgan', 'AM'],
    ['Cher', 'C'],
    ['  mary   jane   watson ', 'MW'],
    ['', '?'],
    [null, '?'],
  ])('%s -> %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

describe('percent', () => {
  it('rounds and never divides by zero', () => {
    expect(percent(1, 3)).toBe(33)
    expect(percent(0, 0)).toBe(0)
  })
})

describe('formatRelative', () => {
  it('describes recent times in words', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-29T12:00:00Z'))
    expect(formatRelative('2026-09-29T11:59:40Z')).toBe('just now')
    expect(formatRelative('2026-09-29T11:55:00Z')).toBe('5 minutes ago')
    expect(formatRelative('2026-09-29T09:00:00Z')).toBe('3 hours ago')
    expect(formatRelative('2026-09-27T12:00:00Z')).toBe('2 days ago')
  })
})
