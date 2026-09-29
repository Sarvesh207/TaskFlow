import { Link } from 'react-router'
import { RoleBadge } from '@/components/badges'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useMe } from '@/features/auth/queries'
import type { ProjectPerson } from '@/features/projects/project-context'
import { ROLE } from '@/lib/domain'
import { formatDate } from '@/lib/format'

interface MemberDetailsModalProps {
  person: ProjectPerson | null
  onClose: () => void
  onChangeRole?: (person: ProjectPerson) => void
  onRemove: (person: ProjectPerson) => void
  canRemove: boolean
}

export function MemberDetailsModal({ person, onClose, onChangeRole, onRemove, canRemove }: MemberDetailsModalProps) {
  const me = useMe()
  return (
    <Modal open={!!person} onOpenChange={(open) => !open && onClose()} title="Member Details">
      {person ? (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={person.name} src={person.avatarUrl} seed={person.id} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-fg">{person.name}</p>
              <p className="truncate text-sm text-muted">{person.email}</p>
            </div>
            <RoleBadge role={person.role} />
          </div>

          <dl className="divide-y divide-border rounded-lg border border-border">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <dt className="text-xs text-muted">Role</dt>
                <dd className="mt-0.5 text-sm text-fg">{ROLE[person.role].label}</dd>
              </div>
              {onChangeRole && person.role !== 'owner' ? (
                <Button size="sm" variant="secondary" onClick={() => onChangeRole(person)}>
                  Change Role
                </Button>
              ) : null}
            </div>
            <div className="px-4 py-3">
              <dt className="text-xs text-muted">{person.role === 'owner' ? 'Owner since' : 'Joined at'}</dt>
              <dd className="mt-0.5 text-sm text-fg">{formatDate(person.joinedAt)}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-xs text-muted">Email</dt>
              <dd className="mt-0.5 text-sm text-fg">{person.email || '—'}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2">
            <Link
              to={person.id === me.id ? '/profile' : `/users/${person.id}`}
              className="text-center text-sm font-medium text-primary hover:text-primary-hover"
            >
              View full profile
            </Link>
            {canRemove ? (
              <Button variant="danger-outline" className="w-full" onClick={() => onRemove(person)}>
                {person.id === me.id ? 'Leave Project' : 'Remove from Project'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
