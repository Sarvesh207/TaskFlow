import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { DueLabel, PriorityBadge, TaskStatusBadge } from '@/components/badges'
import { Avatar } from '@/components/ui/Avatar'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/form'
import { ErrorState, PageLoader } from '@/components/ui/states'
import { useMe } from '@/features/auth/queries'
import { useProjectContext } from '@/features/projects/project-context'
import { isOverdue, TASK_STATUS, WRITABLE_TASK_STATUSES, type WritableTaskStatus } from '@/lib/domain'
import { formatDate, formatRelative } from '@/lib/format'
import { can } from '@/lib/permissions'
import { useDeleteTask, useTask, useUpdateTask } from '@/features/tasks/queries'

export function TaskDetailPage() {
  const { taskId } = useParams()
  const { project, role, peopleById } = useProjectContext()
  const me = useMe()
  const navigate = useNavigate()
  const { data: task, error, refetch } = useTask(project.id, taskId)
  const updateStatus = useUpdateTask(project.id)
  const deleteTask = useDeleteTask(project.id)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!task) return <PageLoader />

  const tasksPath = `/projects/${project.id}/tasks`
  const assignee = task.assigned_to ? peopleById.get(task.assigned_to) : undefined
  const canEdit = can.editTask(role, task, me.id)

  return (
    <div className="max-w-4xl space-y-6">
      <Link to={tasksPath} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        All tasks
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight break-words text-fg">{task.title}</h2>
          <PriorityBadge priority={task.priority} />
          {isOverdue(task) ? <span className="text-xs font-medium text-red-600 dark:text-red-400">Overdue</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && task.status !== 'cancelled' ? (
            <Select
              aria-label="Task status"
              value={task.status}
              onChange={(e) =>
                updateStatus.mutate({ taskId: task.id, input: { status: e.target.value as WritableTaskStatus } })
              }
              className="w-40"
            >
              {WRITABLE_TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS[s].label}
                </option>
              ))}
            </Select>
          ) : (
            <TaskStatusBadge status={task.status} />
          )}
          {canEdit ? (
            <ButtonLink to={`${tasksPath}/${task.id}/edit`} variant="secondary" icon={<Pencil className="size-4" />}>
              Edit
            </ButtonLink>
          ) : null}
          {can.deleteTask(role) ? (
            <Button variant="ghost" size="icon" aria-label="Delete task" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fg">Description</h3>
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
          {task.description || 'No description.'}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-5 border-t border-border pt-5 md:grid-cols-4">
          <Meta label="Project">
            <Link to={`/projects/${project.id}`} className="hover:text-primary">
              {project.name}
            </Link>
          </Meta>
          <Meta label="Assignee">
            {assignee ? (
              <span className="flex items-center gap-2">
                <Avatar name={assignee.name} src={assignee.avatarUrl} seed={assignee.id} size="xs" />
                <Link to={assignee.id === me.id ? '/profile' : `/users/${assignee.id}`} className="truncate hover:text-primary">
                  {assignee.name}
                </Link>
              </span>
            ) : (
              <span className="text-muted">Unassigned</span>
            )}
          </Meta>
          <Meta label="Due Date">
            <DueLabel task={task} short={false} />
          </Meta>
          <Meta label="Status">
            <TaskStatusBadge status={task.status} />
          </Meta>
          <Meta label="Created At">{formatDate(task.created_at)}</Meta>
          <Meta label="Last Updated">{formatRelative(task.updated_at)}</Meta>
        </dl>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete task"
        description={`“${task.title}” will be permanently deleted.`}
        confirmLabel="Delete task"
        loading={deleteTask.isPending}
        onConfirm={() => deleteTask.mutate(task.id, { onSuccess: () => navigate(tasksPath, { replace: true }) })}
      />
    </div>
  )
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1.5 text-sm text-fg">{children}</dd>
    </div>
  )
}
