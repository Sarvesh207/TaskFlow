import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { PROJECT_STATUS, PROJECT_STATUSES } from '@/lib/domain'
import { applyFieldErrors } from '@/lib/form'
import type { ProjectInput } from '@/types/api'

// Mirrors createProjectSchema in backend/src/modules/projects/project.schema.ts.
const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters'),
  status: z.enum(PROJECT_STATUSES),
})
export type ProjectFormValues = z.infer<typeof schema>

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormValues>
  disabled?: boolean
  /** Resolve on success; reject with the API error so field errors can be bound. */
  onSubmit: (values: ProjectInput) => Promise<unknown>
  actions: (state: { isSubmitting: boolean; isDirty: boolean }) => ReactNode
}

export function ProjectForm({ defaultValues, disabled, onSubmit, actions }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', status: 'active', ...defaultValues },
  })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
      reset(values)
    } catch (error) {
      applyFieldErrors(error, setError, ['name', 'description', 'status'])
    }
  })

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <fieldset disabled={disabled} className="space-y-5">
        <Field label="Name" error={errors.name?.message}>
          <Input placeholder="e.g. Website Redesign" {...register('name')} />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <Textarea rows={4} placeholder="Describe your project…" {...register('description')} />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <Select {...register('status')}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS[s].label}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>
      {actions({ isSubmitting, isDirty })}
    </form>
  )
}
