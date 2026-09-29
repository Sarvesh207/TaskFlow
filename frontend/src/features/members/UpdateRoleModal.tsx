import { Info } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/form'
import { InfoNote } from '@/components/ui/misc'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { useProjectContext, type ProjectPerson } from '@/features/projects/project-context'
import { ROLE } from '@/lib/domain'
import type { AssignableRole } from '@/types/api'
import { useUpdateMemberRole } from './queries'

export function UpdateRoleModal({ person, onClose }: { person: ProjectPerson | null; onClose: () => void }) {
  return (
    <Modal
      open={!!person}
      onOpenChange={(open) => !open && onClose()}
      title="Update Member Role"
      description={person ? `Change the role for ${person.name} in this project.` : undefined}
    >
      {/* Keyed so the select starts from the member's current role each time. */}
      {person ? <UpdateRoleForm key={person.id} person={person} onClose={onClose} /> : null}
    </Modal>
  )
}

function UpdateRoleForm({ person, onClose }: { person: ProjectPerson; onClose: () => void }) {
  const { project } = useProjectContext()
  const update = useUpdateMemberRole(project.id)
  const [role, setRole] = useState<AssignableRole>(person.role === 'admin' ? 'admin' : 'member')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    update.mutate({ userId: person.id, role }, { onSuccess: onClose })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
        <Avatar name={person.name} src={person.avatarUrl} seed={person.id} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{person.name}</p>
          <p className="truncate text-xs text-muted">{person.email}</p>
        </div>
        <span className="rounded-md bg-surface-3 px-2 py-1 text-xs text-muted">
          Current: <span className="text-fg">{ROLE[person.role].label}</span>
        </span>
      </div>
      <Field label="New Role">
        <Select value={role} onChange={(e) => setRole(e.target.value as AssignableRole)}>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </Select>
      </Field>
      <InfoNote icon={<Info />}>This will update the user&apos;s role and permissions for this project.</InfoNote>
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending} disabled={role === person.role}>
          Update Role
        </Button>
      </ModalActions>
    </form>
  )
}
