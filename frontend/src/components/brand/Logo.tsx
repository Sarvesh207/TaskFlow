import { useId } from 'react'
import { cn } from '@/lib/cn'

/** The TaskFlow "T" mark: a tilted bar over a rounded drop. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 48 48" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <rect x="5" y="9" width="38" height="13" rx="6.5" transform="rotate(-16 24 15.5)" fill={`url(#${id}-bar)`} />
      <path d="M13 22.5h13v13.5a6.5 6.5 0 0 1-13 0z" transform="rotate(10 19.5 30)" fill={`url(#${id}-stem)`} />
    </svg>
  )
}

export function Logo({ className, showTagline = false }: { className?: string; showTagline?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight text-fg">
          Task<span className="text-brand-gradient">Flow</span>
        </span>
        {showTagline ? (
          <span className="mt-1 text-[9px] font-medium tracking-[0.2em] text-muted uppercase">
            Turn ideas into real progress
          </span>
        ) : null}
      </span>
    </span>
  )
}
