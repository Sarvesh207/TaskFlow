import { Info } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/form'
import { InfoNote } from '@/components/ui/misc'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { useProjectContext } from '@/features/projects/project-context'
import { useUsers } from '@/features/users/queries'
import type { AssignableRole } from '@/types/api'
import { useAddMember } from './queries'

export function AddMemberModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { project, peopleById } = useProjectContext()
  const { data: users, isPending, refetch } = useUsers()

  // Someone may have signed up since the directory was cached.
  useEffect(() => {
    if (open) refetch()
  }, [open, refetch])
  const add = useAddMember(project.id)
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<AssignableRole>('member')
  const [error, setError] = useState<string>()

  const candidates = useMemo(
    () => (users ?? []).filter((u) => !peopleById.has(u.id)).sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [users, peopleById],
  )

  function close(next: boolean) {
    if (!next) {
      setUserId('')
      setRole('member')
      setError(undefined)
    }
    onOpenChange(next)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!userId) {
      setError('Select a user to add')
      return
    }
    add.mutate({ user_id: userId, role }, { onSuccess: () => close(false) })
  }

  return (
    <Modal open={open} onOpenChange={close} title="Add Project Member" description="Add an existing user to this project.">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field
          label="User"
          error={error}
          hint={!isPending && candidates.length === 0 ? 'Every registered user is already on this project.' : undefined}
        >
          <Select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value)
              setError(undefined)
            }}
            disabled={isPending || candidates.length === 0}
          >
            <option value="">{isPending ? 'Loading users…' : 'Select a user'}</option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.email})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as AssignableRole)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <InfoNote icon={<Info />}>
          {role === 'admin'
            ? 'Admins can manage members and edit, assign or delete any task.'
            : 'Members can create tasks and update the tasks assigned to them.'}
        </InfoNote>
        <ModalActions>
          <Button variant="secondary" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={add.isPending}>
            Add Member
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
