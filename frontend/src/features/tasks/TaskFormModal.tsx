import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Field, Input, Textarea } from '@/components/ui/form'
import { InfoNote } from '@/components/ui/misc'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { FormSelectMenu, ToneDot, type SelectMenuOption } from '@/components/ui/SelectMenu'
import { useMe } from '@/features/auth/queries'
import { useProjectContext } from '@/features/projects/project-context'
import {
  PRIORITY,
  PRIORITY_LEVELS,
  ROLE,
  priorityLevel,
  TASK_STATUS,
  WRITABLE_TASK_STATUSES,
  type WritableTaskStatus,
} from '@/lib/domain'
import { toDateInput } from '@/lib/format'
import { applyFieldErrors } from '@/lib/form'
import { can } from '@/lib/permissions'
import type { Task, TaskInput } from '@/types/api'
import { PRIORITY_OPTIONS } from './priority-options'
import { useCreateTask, useUpdateTask } from './queries'

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

const STATUS_OPTIONS: SelectMenuOption[] = WRITABLE_TASK_STATUSES.map((s) => ({
  value: s,
  label: TASK_STATUS[s].label,
  leading: <ToneDot tone={TASK_STATUS[s].tone} />,
}))

/** Dashed empty avatar for "Unassigned". */
function UnassignedIcon() {
  return <span className="size-5 rounded-full border border-dashed border-border-strong" aria-hidden />
}

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

interface TaskFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The task to edit; omit to create one. */
  task?: Task
  /** After a successful save (or an edit with nothing changed). */
  onSaved: () => void
}

/**
 * Create or edit a task in a modal. Used by the …/tasks/new and
 * …/tasks/:taskId/edit routes, and directly by the task list's row menu.
 * Callers decide who may edit; this enforces what each role may change.
 */
export function TaskFormModal({ open, onOpenChange, task, onSaved }: TaskFormModalProps) {
  const isEdit = !!task
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Task' : 'Create Task'}
      description={isEdit ? 'Update the details of this task.' : 'Add a new task to this project.'}
      className="max-w-2xl"
    >
      {/* Keyed so reopening for another task starts from that task's values. */}
      <TaskForm key={task?.id ?? 'new'} task={task} onCancel={() => onOpenChange(false)} onSaved={onSaved} />
    </Modal>
  )
}

function TaskForm({ task, onCancel, onSaved }: { task?: Task; onCancel: () => void; onSaved: () => void }) {
  const { project, role, people } = useProjectContext()
  const me = useMe()
  const create = useCreateTask(project.id)
  const update = useUpdateTask(project.id)
  const isEdit = !!task
  const canAssign = can.assignTask(role)
  const initial = toValues(task)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? initial : { ...initial, assigned_to: canAssign ? '' : me.id },
  })

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
      onSaved()
      return
    }

    try {
      if (task) await update.mutateAsync({ taskId: task.id, input: payload })
      else await create.mutateAsync(payload)
      onSaved()
    } catch (error) {
      applyFieldErrors(error, setError, FIELDS)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field label="Title" error={errors.title?.message}>
        <Input placeholder="e.g. Design homepage" {...register('title')} />
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
          <FormSelectMenu
            control={control}
            name="assigned_to"
            disabled={isEdit && !canAssign}
            options={[
              { value: '', label: 'Unassigned', leading: <UnassignedIcon /> },
              ...people
                .filter((p) => canAssign || p.id === me.id)
                .map(
                  (p): SelectMenuOption => ({
                    value: p.id,
                    label: p.id === me.id ? `${p.name} (you)` : p.name,
                    leading: <Avatar name={p.name} src={p.avatarUrl} seed={p.id} size="xs" className="size-5 text-[9px]" />,
                    hint: ROLE[p.role].label,
                  }),
                ),
            ]}
          />
        </Field>
        <Field label="Priority" error={errors.priority?.message}>
          <FormSelectMenu control={control} name="priority" disabled={!canAssign} options={PRIORITY_OPTIONS} />
        </Field>
        <Field label="Due Date" error={errors.due_date?.message}>
          <Input type="date" {...register('due_date')} />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <FormSelectMenu control={control} name="status" options={STATUS_OPTIONS} />
        </Field>
      </div>

      <ModalActions>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create Task'}
        </Button>
      </ModalActions>
    </form>
  )
}
