import { Mail, RotateCw, X } from 'lucide-react'
import { useState } from 'react'
import { RoleBadge } from '@/components/badges'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatRelative } from '@/lib/format'
import type { ProjectInvite } from '@/types/api'
import { useProjectInvites, useResendInvite, useRevokeInvite } from './queries'

/**
 * Invites that were emailed but not accepted yet, shown to owners and admins
 * above the members table. Renders nothing when there are none.
 */
export function PendingInvites({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { data: invites } = useProjectInvites(projectId)
  const resend = useResendInvite(projectId)
  const revoke = useRevokeInvite(projectId)
  const [revoking, setRevoking] = useState<ProjectInvite | null>(null)

  if (!invites?.length) return null

  return (
    <section aria-labelledby="pending-invites" className="border-b border-border-soft px-4 py-3 sm:px-5">
      <h2 id="pending-invites" className="mb-2 flex items-center gap-2 text-[12.5px] font-medium text-muted">
        Pending invites
        <span className="figures rounded-full bg-hover-strong px-1.5 py-px text-[11px]">{invites.length}</span>
      </h2>
      <ul className="divide-y divide-border-soft">
        {invites.map((invite) => (
          <li key={invite.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-border-strong text-muted">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{invite.email}</p>
              <p className="truncate text-[11.5px] text-subtle">
                Invited by {invite.inviter.full_name} · expires {formatRelative(invite.expires_at)}
              </p>
            </div>
            <RoleBadge role={invite.role} />
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCw className="size-3.5" />}
                loading={resend.isPending && resend.variables === invite.id}
                onClick={() => resend.mutate(invite.id)}
                aria-label={`Resend invite to ${invite.email}`}
              >
                Resend
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<X className="size-3.5" />}
                onClick={() => setRevoking(invite)}
                aria-label={`Cancel invite to ${invite.email}`}
              >
                Cancel
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Cancel invite"
        description={`The link sent to ${revoking?.email} will stop working, and they won't be able to join “${projectName}” with it.`}
        confirmLabel="Cancel invite"
        loading={revoke.isPending}
        onConfirm={() => revoking && revoke.mutate(revoking.id, { onSuccess: () => setRevoking(null) })}
      />
    </section>
  )
}
