import { AlertTriangle, Loader2, Lock, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiRequestError, errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { Button, ButtonLink } from './Button'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-primary', className)} aria-label="Loading" />
}

/**
 * Fades in only after 250ms, so fast loads (cached data, preloaded routes)
 * never flash a spinner — the page just appears.
 */
export function PageLoader() {
  return (
    <div
      className="flex min-h-[40vh] animate-[overlay-in_300ms_var(--ease-out-expo)_250ms_both] items-center justify-center"
      aria-busy="true"
    >
      <Spinner className="size-5 text-muted" />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-md bg-[length:200%_100%]',
        'bg-[linear-gradient(90deg,var(--color-surface-2)_25%,var(--color-surface-3)_50%,var(--color-surface-2)_75%)]',
        className,
      )}
      aria-hidden
    />
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/70" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-[52px] items-center gap-4 px-4" style={{ opacity: 1 - i * 0.15 }}>
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/6" />
          <Skeleton className="ml-auto h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex animate-rise flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon ? (
        <div className="surface-highlight mb-4 flex size-11 items-center justify-center rounded-xl border border-border-strong bg-gradient-to-b from-surface-3 to-surface-2 text-muted [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <h3 className="text-[14px] font-semibold text-fg">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof ApiRequestError && error.status === 403) {
    return (
      <EmptyState
        icon={<Lock />}
        title="You don't have access"
        description={error.message}
        action={
          <ButtonLink to="/" variant="secondary">
            Back to dashboard
          </ButtonLink>
        }
      />
    )
  }
  if (error instanceof ApiRequestError && error.status === 404) {
    return <NotFoundState description={error.message} />
  }
  return (
    <EmptyState
      icon={<AlertTriangle />}
      title="Something went wrong"
      description={errorMessage(error)}
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    />
  )
}

export function NotFoundState({ description = "We couldn't find what you were looking for." }: { description?: string }) {
  return (
    <EmptyState
      icon={<SearchX />}
      title="Not found"
      description={description}
      action={
        <ButtonLink to="/" variant="secondary">
          Back to dashboard
        </ButtonLink>
      }
    />
  )
}
