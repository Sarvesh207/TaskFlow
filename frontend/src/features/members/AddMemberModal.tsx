import { Info } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, FormError, Input, Select } from '@/components/ui/form'
import { InfoNote } from '@/components/ui/misc'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { FilterTabs } from '@/components/ui/Tabs'
import { useCreateInvite } from '@/features/invites/queries'
import { useProjectContext } from '@/features/projects/project-context'
import { useUsers } from '@/features/users/queries'
import { ApiRequestError, errorMessage } from '@/lib/api'
import type { AssignableRole } from '@/types/api'
import { useAddMember } from './queries'

type Mode = 'invite' | 'existing'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Two ways onto a project: email an invite link (works for people without an
 * account yet), or add someone who has already signed up.
 */
export function AddMemberModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { project, peopleById } = useProjectContext()
  const { data: users, isPending, refetch } = useUsers()

  // Someone may have signed up since the directory was cached.
  useEffect(() => {
    if (open) refetch()
  }, [open, refetch])
  const add = useAddMember(project.id)
  const invite = useCreateInvite(project.id)
  const [mode, setMode] = useState<Mode>('invite')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<AssignableRole>('member')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string | null>(null)

  const candidates = useMemo(
    () => (users ?? []).filter((u) => !peopleById.has(u.id)).sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [users, peopleById],
  )

  function close(next: boolean) {
    if (!next) {
      setMode('invite')
      setEmail('')
      setUserId('')
      setRole('member')
      setError(undefined)
      setFormError(null)
    }
    onOpenChange(next)
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(undefined)
    setFormError(null)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (mode === 'existing') {
      if (!userId) {
        setError('Select a user to add')
        return
      }
      add.mutate({ user_id: userId, role }, { onSuccess: () => close(false) })
      return
    }

    const address = email.trim()
    if (!EMAIL.test(address)) {
      setError('Enter a valid email address')
      return
    }
    invite.mutate(
      { email: address, role },
      {
        onSuccess: () => close(false),
        onError: (err) => {
          const fieldError = err instanceof ApiRequestError ? err.fieldErrors.email?.[0] : undefined
          if (fieldError) setError(fieldError)
          else setFormError(errorMessage(err))
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="Add Project Member"
      description="Invite someone by email, or add a person who already has an account."
    >
      <FilterTabs
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'invite', label: 'Invite by email' },
          { value: 'existing', label: 'Add existing user' },
        ]}
      />
      <form onSubmit={onSubmit} className="mt-5 space-y-5" noValidate>
        <FormError message={formError} />

        {mode === 'invite' ? (
          <Field
            label="Email"
            error={error}
            hint="We'll email them a link to join. It works for 7 days, even if they don't have an account yet."
          >
            <Input
              type="email"
              autoComplete="off"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(undefined)
              }}
              autoFocus
            />
          </Field>
        ) : (
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
        )}

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
          {mode === 'invite' ? (
            <Button type="submit" loading={invite.isPending}>
              Send Invite
            </Button>
          ) : (
            <Button type="submit" loading={add.isPending}>
              Add Member
            </Button>
          )}
        </ModalActions>
      </form>
    </Modal>
  )
}
