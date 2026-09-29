import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isDueToday, isOverdue, PRIORITY, priorityLevel, projectTile } from './domain'

describe('priorityLevel', () => {
  it.each([
    [1, 'low'],
    [2, 'low'],
    [3, 'medium'],
    [4, 'high'],
    [5, 'high'],
  ])('%i -> %s', (priority, level) => {
    expect(priorityLevel(priority)).toBe(level)
  })

  it('round-trips the values the form writes', () => {
    for (const level of ['low', 'medium', 'high'] as const) {
      expect(priorityLevel(PRIORITY[level].value)).toBe(level)
    }
  })
})

describe('due dates', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 29, 9, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const due = (date: string, status: 'pending' | 'completed' | 'cancelled' = 'pending') => ({
    due_date: `${date}T00:00:00.000Z`,
    status,
  })

  it('is overdue only before today and while still open', () => {
    expect(isOverdue(due('2026-09-28'))).toBe(true)
    expect(isOverdue(due('2026-09-29'))).toBe(false)
    expect(isOverdue(due('2026-09-28', 'completed'))).toBe(false)
    expect(isOverdue(due('2026-09-28', 'cancelled'))).toBe(false)
    expect(isOverdue({ due_date: null, status: 'pending' })).toBe(false)
  })

  it('knows when a task is due today', () => {
    expect(isDueToday(due('2026-09-29'))).toBe(true)
    expect(isDueToday(due('2026-09-30'))).toBe(false)
  })
})

describe('projectTile', () => {
  it('is stable for the same id', () => {
    expect(projectTile('abc')).toBe(projectTile('abc'))
    expect(projectTile('abc')).toMatch(/^bg-/)
  })
})
