import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { InfoNote } from '@/components/ui/misc'
import { ErrorState, PageLoader } from '@/components/ui/states'
import { useMe } from '@/features/auth/queries'
import { useProjectContext } from '@/features/projects/project-context'
import {
  PRIORITY,
  PRIORITY_LEVELS,
  priorityLevel,
  TASK_STATUS,
  WRITABLE_TASK_STATUSES,
  type WritableTaskStatus,
} from '@/lib/domain'
import { toDateInput } from '@/lib/format'
import { applyFieldErrors } from '@/lib/form'
import { can } from '@/lib/permissions'
import type { Task, TaskInput } from '@/types/api'
import { useCreateTask, useTask, useUpdateTask } from '@/features/tasks/queries'

// Mirrors createTasksSchema / updateTaskSchema in backend/src/modules/projects/project.schema.ts.
const schema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(100, 'Title must be at most 100 characters'),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters'),
  assigned_to: z.string(),
  priority: z.enum(PRIORITY_LEVELS),
  due_date: z.string(),
  status: z.enum(WRITABLE_TASK_STATUSES),
})
type Values = z.infer<typeof schema>
const FIELDS = ['title', 'description', 'assigned_to', 'priority', 'due_date', 'status'] as const

function toValues(task?: Task): Values {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    assigned_to: task?.assigned_to ?? '',
    priority: task ? priorityLevel(task.priority) : 'medium',
    due_date: toDateInput(task?.due_date),
    // A cancelled task can only be moved to a writable status.
    status: task && task.status !== 'cancelled' ? task.status : 'pending',
  }
}

export function TaskFormPage() {
  const { taskId } = useParams()
  const { project } = useProjectContext()
  const taskQuery = useTask(project.id, taskId)

  if (!taskId) return <TaskForm />
  if (taskQuery.error) return <ErrorState error={taskQuery.error} onRetry={taskQuery.refetch} />
  if (!taskQuery.data) return <PageLoader />
  return <TaskForm key={taskQuery.data.id} task={taskQuery.data} />
}

function TaskForm({ task }: { task?: Task }) {
  const { project, role, people } = useProjectContext()
  const me = useMe()
  const navigate = useNavigate()
  const create = useCreateTask(project.id)
  const update = useUpdateTask(project.id)
  const isEdit = !!task
  const canAssign = can.assignTask(role)
  const initial = toValues(task)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? initial : { ...initial, assigned_to: canAssign ? '' : me.id },
  })

  if (isEdit && !can.editTask(role, task, me.id)) {
    return <Navigate to={`/projects/${project.id}/tasks/${task.id}`} replace />
  }

  const back = task ? `/projects/${project.id}/tasks/${task.id}` : `/projects/${project.id}/tasks`

  const onSubmit = handleSubmit(async (values) => {
    const payload: TaskInput = {}
    const changed = <K extends keyof Values>(key: K) => !isEdit || values[key] !== initial[key]

    if (changed('title')) payload.title = values.title
    if (changed('description')) payload.description = values.description || (isEdit ? null : undefined)
    if (changed('status')) payload.status = values.status as WritableTaskStatus
    if (changed('due_date')) payload.due_date = values.due_date || (isEdit ? null : undefined)
    // Plain members may not set priority, and may only assign a new task to themselves —
    // the API rejects the whole request with 403 otherwise.
    if (canAssign) {
      if (changed('priority')) payload.priority = PRIORITY[values.priority].value
      if (changed('assigned_to')) payload.assigned_to = values.assigned_to || (isEdit ? null : undefined)
    } else if (!isEdit && values.assigned_to) {
      payload.assigned_to = values.assigned_to
    }

    if (isEdit && Object.keys(payload).length === 0) {
      navigate(back)
      return
    }

    try {
      if (task) {
        await update.mutateAsync({ taskId: task.id, input: payload })
        navigate(back)
      } else {
        const { data } = await create.mutateAsync(payload)
        navigate(`/projects/${project.id}/tasks/${data.id}`)
      }
    } catch (error) {
      applyFieldErrors(error, setError, FIELDS)
    }
  })

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-fg">{isEdit ? 'Edit Task' : 'Create Task'}</h2>
        <p className="text-sm text-muted">{isEdit ? 'Update the details of this task.' : 'Add a new task to this project.'}</p>
      </div>
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Field label="Title" error={errors.title?.message}>
            <Input placeholder="e.g. Design homepage" autoFocus={!isEdit} {...register('title')} />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <Textarea rows={4} placeholder="Describe the task…" {...register('description')} />
          </Field>

          {!canAssign ? (
            <InfoNote icon={<Info />}>
              {isEdit
                ? 'Only owners and admins can change the assignee or priority.'
                : 'You can assign new tasks to yourself. Owners and admins set the priority and assign others.'}
            </InfoNote>
          ) : null}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Assignee" error={errors.assigned_to?.message}>
              <Select {...register('assigned_to')} disabled={isEdit && !canAssign}>
                <option value="">Unassigned</option>
                {people
                  .filter((p) => canAssign || p.id === me.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.id === me.id ? ' (you)' : ''}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Priority" error={errors.priority?.message}>
              <Select {...register('priority')} disabled={!canAssign}>
                {PRIORITY_LEVELS.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY[p].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due Date" error={errors.due_date?.message}>
              <Input type="date" {...register('due_date')} />
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <Select {...register('status')}>
                {WRITABLE_TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS[s].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Create Task'}
            </Button>
            <ButtonLink to={back} variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  )
}
