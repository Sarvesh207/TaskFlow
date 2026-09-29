import { useState } from 'react'
import { cn } from '@/lib/cn'
import { hashString } from '@/lib/domain'
import { initials } from '@/lib/format'

const COLORS = [
  'bg-blue-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-teal-600',
]

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-28 text-3xl',
} as const

interface AvatarProps {
  name: string | null | undefined
  src?: string | null
  /** Seed for the fallback colour; defaults to the name. */
  seed?: string
  size?: keyof typeof SIZES
  className?: string
}

export function Avatar({ name, src, seed, size = 'sm', className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = src && failedSrc !== src
  const color = COLORS[hashString(seed ?? name ?? '') % COLORS.length]

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white select-none',
        SIZES[size],
        !showImage && color,
        className,
      )}
      title={name ?? undefined}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ?? ''}
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  )
}

interface AvatarStackProps {
  people: { id: string; name: string; src?: string | null }[]
  max?: number
}

export function AvatarStack({ people, max = 3 }: AvatarStackProps) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <div className="flex items-center -space-x-2" aria-label={`${people.length} members`}>
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} src={p.src} seed={p.id} size="xs" className="ring-2 ring-surface" />
      ))}
      {extra > 0 ? (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface-3 text-[10px] font-medium text-muted ring-2 ring-surface">
          +{extra}
        </span>
      ) : null}
    </div>
  )
}
