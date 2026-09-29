import type { MemberRole, ProjectStatus, Task, TaskStatus } from '@/types/api'
import { todayKey } from './format'

export type Tone = 'emerald' | 'blue' | 'slate' | 'amber' | 'red' | 'violet'

export const TASK_STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  pending: { label: 'To Do', tone: 'slate' },
  in_progress: { label: 'In Progress', tone: 'blue' },
  completed: { label: 'Completed', tone: 'emerald' },
  cancelled: { label: 'Cancelled', tone: 'red' },
}

/** Statuses the API accepts on write — `cancelled` is read-only. */
export const WRITABLE_TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const
export type WritableTaskStatus = (typeof WRITABLE_TASK_STATUSES)[number]

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'emerald' },
  completed: { label: 'Completed', tone: 'blue' },
  archived: { label: 'Archived', tone: 'slate' },
}

export const PROJECT_STATUSES = ['active', 'completed', 'archived'] as const

export const ROLE: Record<MemberRole, { label: string; tone: Tone }> = {
  owner: { label: 'Owner', tone: 'violet' },
  admin: { label: 'Admin', tone: 'blue' },
  member: { label: 'Member', tone: 'slate' },
}

export type PriorityLevel = 'low' | 'medium' | 'high'

/** The API stores priority as 1–5; the UI works in three levels. */
export const PRIORITY: Record<PriorityLevel, { label: string; tone: Tone; value: number }> = {
  low: { label: 'Low', tone: 'emerald', value: 1 },
  medium: { label: 'Medium', tone: 'amber', value: 3 },
  high: { label: 'High', tone: 'red', value: 5 },
}

export const PRIORITY_LEVELS = ['low', 'medium', 'high'] as const

export function priorityLevel(priority: number): PriorityLevel {
  if (priority >= 4) return 'high'
  if (priority === 3) return 'medium'
  return 'low'
}

export function isOverdue(task: Pick<Task, 'due_date' | 'status'>): boolean {
  if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false
  return task.due_date.slice(0, 10) < todayKey()
}

export function isDueToday(task: Pick<Task, 'due_date'>): boolean {
  return !!task.due_date && task.due_date.slice(0, 10) === todayKey()
}

export function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return Math.abs(hash)
}

/** Tile colours for project letter avatars, picked deterministically from the id. */
const PROJECT_TILES = [
  'bg-violet-600',
  'bg-blue-600',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-cyan-600',
  'bg-indigo-600',
]

export function projectTile(id: string): string {
  return PROJECT_TILES[hashString(id) % PROJECT_TILES.length]!
}
