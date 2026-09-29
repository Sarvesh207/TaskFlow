import { Check, Info, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InfoNote } from '@/components/ui/misc'
import { useMe } from '@/features/auth/queries'
import { useRemoveMember } from '@/features/members/queries'
import { cn } from '@/lib/cn'
import { changedFields } from '@/lib/form'
import { can, PERMISSION_MATRIX } from '@/lib/permissions'
import type { MemberRole } from '@/types/api'
import { useProjectContext } from '@/features/projects/project-context'
import { ProjectForm } from '@/features/projects/ProjectForm'
import { useUpdateProject } from '@/features/projects/queries'

export function ProjectSettingsPage() {
  const { project, role, requestDelete } = useProjectContext()
  const me = useMe()
  const navigate = useNavigate()
  const update = useUpdateProject(project.id)
  const leave = useRemoveMember(project.id)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const canEdit = can.editProject(role)

  const original = { name: project.name, description: project.description ?? '', status: project.status }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Project details" description="Name, description and status." />
        <div className="p-5">
          {!canEdit ? (
            <div className="mb-5">
              <InfoNote icon={<Info />}>Only the project owner can edit project details.</InfoNote>
            </div>
          ) : null}
          <ProjectForm
            key={project.updated_at}
            defaultValues={original}
            disabled={!canEdit}
            onSubmit={(values) => update.mutateAsync(changedFields(values, original))}
            actions={({ isSubmitting, isDirty }) =>
              canEdit ? (
                <div className="flex justify-end pt-1">
                  <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                    Save changes
                  </Button>
                </div>
              ) : null
            }
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Project Roles & Permissions" description="What each role can do in a project." />
        <div className="scrollbar-thin mt-4 overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr>
                <th scope="col" className="py-2 text-left text-xs font-medium text-muted">
                  Permission
                </th>
                {(['owner', 'admin', 'member'] as const).map((r) => (
                  <th key={r} scope="col" className="w-24 py-2">
                    <span
                      className={cn(
                        'inline-block w-full rounded-md py-1 text-xs font-medium capitalize',
                        r === 'owner' && 'bg-violet-500/12 text-violet-700 dark:bg-violet-500/25 dark:text-violet-200',
                        r === 'admin' && 'bg-blue-500/12 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
                        r === 'member' && 'bg-slate-500/12 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200',
                        r === role && 'ring-1 ring-fg/25',
                      )}
                    >
                      {r}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.label}>
                  <td className="py-2.5 text-fg">{row.label}</td>
                  {(['owner', 'admin', 'member'] as MemberRole[]).map((r) => (
                    <td key={r} className="py-2.5 text-center">
                      {row[r] ? (
                        <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" aria-label="Allowed" />
                      ) : (
                        <X className="mx-auto size-4 text-red-600 dark:text-red-400" aria-label="Not allowed" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-red-500/30 xl:col-span-2">
        <CardHeader title="Danger zone" />
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          {can.deleteProject(role) ? (
            <>
              <p className="text-sm text-muted">Permanently delete this project, including all of its tasks and memberships.</p>
              <Button variant="danger-outline" onClick={requestDelete}>
                Delete project
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Leave this project. You will lose access to its tasks.</p>
              <Button variant="danger-outline" onClick={() => setConfirmLeave(true)}>
                Leave project
              </Button>
            </>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave project"
        description={`You will no longer have access to “${project.name}”. An owner or admin will have to add you back.`}
        confirmLabel="Leave project"
        loading={leave.isPending}
        onConfirm={() => leave.mutate(me.id, { onSuccess: () => navigate('/projects', { replace: true }) })}
      />
    </div>
  )
}
