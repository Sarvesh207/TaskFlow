import { priorityLevel, type PriorityLevel } from '@/lib/domain'
import type { Task, TaskStatus } from '@/types/api'

export type StatusFilter = 'all' | TaskStatus
export type PriorityFilter = 'all' | PriorityLevel

export function filterTasks<T extends Task>(
  tasks: T[],
  { status, priority, q }: { status: StatusFilter; priority: PriorityFilter; q: string },
): T[] {
  const query = q.trim().toLowerCase()
  return tasks.filter(
    (t) =>
      (status === 'all' || t.status === status) &&
      (priority === 'all' || priorityLevel(t.priority) === priority) &&
      (!query || t.title.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query)),
  )
}

export function statusCounts(tasks: Task[]) {
  const counts = { all: tasks.length, pending: 0, in_progress: 0, completed: 0, cancelled: 0 }
  for (const t of tasks) counts[t.status]++
  return counts
}

export function statusTabs(tasks: Task[]) {
  const c = statusCounts(tasks)
  const tabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: c.all },
    { value: 'pending', label: 'To Do', count: c.pending },
    { value: 'in_progress', label: 'In Progress', count: c.in_progress },
    { value: 'completed', label: 'Completed', count: c.completed },
  ]
  if (c.cancelled > 0) tabs.push({ value: 'cancelled', label: 'Cancelled', count: c.cancelled })
  return tabs
}

/** Open work first, then by due date (undated last). */
export function byUrgency(a: Task, b: Task): number {
  const done = (t: Task) => (t.status === 'completed' || t.status === 'cancelled' ? 1 : 0)
  if (done(a) !== done(b)) return done(a) - done(b)
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
  if (a.due_date) return -1
  if (b.due_date) return 1
  return b.priority - a.priority
}
