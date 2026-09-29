import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { isDueToday, isOverdue, PRIORITY, priorityLevel, PROJECT_STATUS, ROLE, TASK_STATUS } from '@/lib/domain'
import { formatDueDate } from '@/lib/format'
import type { MemberRole, ProjectStatus, Task, TaskStatus } from '@/types/api'

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const s = TASK_STATUS[status]
  return <Badge tone={s.tone}>{s.label}</Badge>
}

export function PriorityBadge({ priority }: { priority: number }) {
  const p = PRIORITY[priorityLevel(priority)]
  return <Badge tone={p.tone}>{p.label}</Badge>
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const s = PROJECT_STATUS[status]
  return <Badge tone={s.tone}>{s.label}</Badge>
}

export function RoleBadge({ role }: { role: MemberRole }) {
  const r = ROLE[role]
  return <Badge tone={r.tone}>{r.label}</Badge>
}

export function DueLabel({ task, short = true }: { task: Pick<Task, 'due_date' | 'status'>; short?: boolean }) {
  if (!task.due_date) return <span className="text-subtle">—</span>
  const overdue = isOverdue(task)
  const today = !overdue && isDueToday(task)
  return (
    <span
      className={cn('relative whitespace-nowrap tabular-nums', overdue ? 'text-red-600 dark:text-red-400' : today ? 'text-amber-600 dark:text-amber-300' : 'text-muted')}
      title={overdue ? 'Overdue' : undefined}
    >
      {today ? 'Today' : formatDueDate(task.due_date, short)}
      {overdue ? <span className="sr-only"> (overdue)</span> : null}
    </span>
  )
}
