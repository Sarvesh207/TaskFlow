import { describe, expect, it } from 'vitest'
import { makeTask } from '@/test/msw/db'
import { byUrgency, filterTasks, statusTabs } from './filters'

const tasks = [
  makeTask({ id: '1', title: 'Fix login bug', status: 'in_progress', priority: 5, due_date: '2026-10-05T00:00:00.000Z' }),
  makeTask({ id: '2', title: 'Write docs', description: 'API reference', status: 'pending', priority: 1 }),
  makeTask({ id: '3', title: 'Design homepage', status: 'completed', priority: 3, due_date: '2026-09-01T00:00:00.000Z' }),
  makeTask({ id: '4', title: 'Plan launch', status: 'pending', priority: 3, due_date: '2026-10-01T00:00:00.000Z' }),
]
const ids = (list: { id: string }[]) => list.map((t) => t.id)

describe('filterTasks', () => {
  it('filters by status, priority level and text (title or description)', () => {
    expect(ids(filterTasks(tasks, { status: 'pending', priority: 'all', q: '' }))).toEqual(['2', '4'])
    expect(ids(filterTasks(tasks, { status: 'all', priority: 'high', q: '' }))).toEqual(['1'])
    expect(ids(filterTasks(tasks, { status: 'all', priority: 'all', q: '  api ' }))).toEqual(['2'])
    expect(ids(filterTasks(tasks, { status: 'all', priority: 'medium', q: 'plan' }))).toEqual(['4'])
  })
})

describe('statusTabs', () => {
  it('counts each status', () => {
    expect(statusTabs(tasks).map((t) => [t.value, t.count])).toEqual([
      ['all', 4],
      ['pending', 2],
      ['in_progress', 1],
      ['completed', 1],
    ])
  })

  it('adds a Cancelled tab only when a task is cancelled', () => {
    const withCancelled = [...tasks, makeTask({ id: '5', title: 'Dropped', status: 'cancelled' })]
    expect(statusTabs(withCancelled).at(-1)).toMatchObject({ value: 'cancelled', count: 1 })
  })
})

describe('byUrgency', () => {
  it('puts open work first, earliest due date first, undated last', () => {
    expect(ids(tasks.toSorted(byUrgency))).toEqual(['4', '1', '2', '3'])
  })
})
