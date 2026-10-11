import { Clock, FolderKanban, LinkIcon, LogOut, Mail } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { RoleBadge } from '@/components/badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormError } from '@/components/ui/form'
import { Spinner } from '@/components/ui/states'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { AuthDivider, GoogleButton } from '@/features/auth/GoogleButton'
import { googleErrorMessage } from '@/features/auth/google-error'
import { useCurrentUser, useLogout } from '@/features/auth/queries'
import { useAcceptInvite, useInvitePreview } from '@/features/invites/queries'
import { ApiRequestError, errorMessage } from '@/lib/api'
import type { InvitePreview } from '@/types/api'

/**
 * Where an invite email's link lands: /invite/:token. Public, so it works
 * before the recipient has an account; they sign up or sign in with the
 * invited email (coming back here via `?next=`), then join with one click.
 */
export function InvitePage() {
  const { token = '' } = useParams()
  const preview = useInvitePreview(token)
  const session = useCurrentUser()

  useEffect(() => {
    const previous = document.title
    document.title = 'Join a project — TaskFlow'
    return () => {
      document.title = previous
    }
  }, [])

  if (preview.isPending || session.isPending) {
    return (
      <AuthLayout title="You're invited" subtitle="Checking your invite…">
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </AuthLayout>
    )
  }

  if (preview.error) {
    const notFound = preview.error instanceof ApiRequestError && [400, 404].includes(preview.error.status)
    return (
      <Dead
        icon={<LinkIcon />}
        title={notFound ? 'This invite link isn’t valid' : 'Couldn’t load this invite'}
        text={
          notFound
            ? 'Check that you opened the whole link from the email, or ask for a new invite.'
            : errorMessage(preview.error)
        }
      />
    )
  }

  const invite = preview.data
  if (invite.status === 'expired') {
    return (
      <Dead
        icon={<Clock />}
        title="This invite has expired"
        text={`Invites work for 7 days. Ask ${invite.inviter.full_name} to send you a new one.`}
      />
    )
  }
  if (invite.status !== 'pending') {
    return (
      <Dead
        icon={<LinkIcon />}
        title="This invite can’t be used anymore"
        text="It was already accepted or was cancelled. If you’ve joined, sign in to find the project."
        action={
          session.data ? (
            <ButtonLink to={`/projects/${invite.project.id}`} className="w-full">
              Open project
            </ButtonLink>
          ) : (
            <ButtonLink to="/login" className="w-full">
              Sign in
            </ButtonLink>
          )
        }
      />
    )
  }

  const user = session.data
  return (
    <AuthLayout title="You're invited" subtitle={`Join ${invite.project.name} on TaskFlow`}>
      <InviteSummary invite={invite} />
      <div className="mt-6">
        {!user ? (
          <SignedOut token={token} invite={invite} />
        ) : user.email.toLowerCase() === invite.email.toLowerCase() ? (
          <Join token={token} invite={invite} />
        ) : (
          <WrongAccount signedInAs={user.email} invite={invite} />
        )}
      </div>
    </AuthLayout>
  )
}

function InviteSummary({ invite }: { invite: InvitePreview }) {
  return (
    <div className="surface-highlight rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary-soft-fg">
          <FolderKanban className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{invite.project.name}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            <span className="text-fg-2">{invite.inviter.full_name}</span> invited you as{' '}
            <RoleBadge role={invite.role} />
          </p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 border-t border-border-soft pt-4 text-[12.5px] text-muted">
        <Mail className="size-3.5 shrink-0" />
        <span className="truncate">
          Sent to <span className="font-medium text-fg-2">{invite.email}</span>
        </span>
      </p>
    </div>
  )
}

function SignedOut({ token, invite }: { token: string; invite: InvitePreview }) {
  const [googleError, setGoogleError] = useState<string | null>(null)
  const back = `/invite/${token}`
  const query = new URLSearchParams({ email: invite.email, next: back }).toString()

  return (
    <div>
      <FormError message={googleError} />
      <p className="mb-4 text-[13px] text-muted">
        Create an account or sign in with <span className="font-medium text-fg-2">{invite.email}</span> to join.
      </p>
      <div className="grid gap-2.5">
        <ButtonLink to={`/register?${query}`} className="w-full">
          Create account
        </ButtonLink>
        <ButtonLink to={`/login?${query}`} variant="secondary" className="w-full">
          Sign in
        </ButtonLink>
      </div>
      <AuthDivider />
      <GoogleButton next={back} onError={(code) => setGoogleError(googleErrorMessage(code))} />
    </div>
  )
}

function Join({ token, invite }: { token: string; invite: InvitePreview }) {
  const accept = useAcceptInvite(token)
  const navigate = useNavigate()

  return (
    <div>
      <FormError message={accept.error ? errorMessage(accept.error) : null} />
      <Button
        className="w-full"
        loading={accept.isPending}
        onClick={() =>
          accept.mutate(undefined, {
            onSuccess: ({ data }) => {
              toast.success(`You joined ${invite.project.name}`)
              navigate(`/projects/${data.project_id}`, { replace: true })
            },
          })
        }
      >
        Join project
      </Button>
    </div>
  )
}

function WrongAccount({ signedInAs, invite }: { signedInAs: string; invite: InvitePreview }) {
  const logout = useLogout()
  return (
    <div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-[13px] leading-relaxed text-amber-800 dark:text-amber-200">
        You're signed in as <span className="font-medium">{signedInAs}</span>, but this invite was sent to{' '}
        <span className="font-medium">{invite.email}</span>. Sign out, then sign in with that email to join.
      </div>
      <Button
        variant="secondary"
        className="mt-4 w-full"
        icon={<LogOut className="size-4" />}
        loading={logout.isPending}
        onClick={() => logout.mutate()}
      >
        Sign out
      </Button>
    </div>
  )
}

function Dead({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <AuthLayout title={title} subtitle={text}>
      <div className="flex flex-col items-center gap-6">
        <span className="grid size-14 place-items-center rounded-2xl border border-border bg-surface text-muted [&_svg]:size-6">
          {icon}
        </span>
        {action ?? (
          <Link to="/" className="text-[13px] font-medium text-primary hover:text-primary-hover">
            Go to TaskFlow
          </Link>
        )}
      </div>
    </AuthLayout>
  )
}
