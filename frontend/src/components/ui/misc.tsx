import { Search } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.025em] text-fg">{title}</h1>
        {description ? <p className="mt-1.5 text-[13.5px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('group relative', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle transition-colors duration-200 group-focus-within:text-muted"
        aria-hidden
      />
      <input
        type="search"
        className={cn(
          'h-9 w-full rounded-lg border border-border bg-input pr-3 pl-9 text-[13.5px] text-fg placeholder:text-subtle',
          'transition-[border-color,box-shadow] duration-200 ease-out-expo',
          'hover:border-border-strong focus:border-primary/70 focus:outline-none focus:ring-4 focus:ring-primary/15',
        )}
        {...props}
      />
    </div>
  )
}

/** Toolbar row above a table: search on the left, filters/actions on the right. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">{children}</div>
}

export function ProjectTile({
  name,
  tileClass,
  size = 'md',
}: {
  name: string
  tileClass: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const sizes = {
    xs: 'size-5 text-[10px] rounded-[5px]',
    sm: 'size-7 text-[11px] rounded-md',
    md: 'size-9 text-[13px] rounded-lg',
    lg: 'size-14 text-[22px] rounded-xl',
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold text-white',
        // Glossy top edge so the flat colour reads as a tile.
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.25),inset_0_-1px_0_rgb(0_0_0/0.15)]',
        sizes[size],
        tileClass,
      )}
      aria-hidden
    >
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

export function InfoNote({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary-soft px-3.5 py-3 text-[13px] leading-relaxed text-fg-2 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-primary">
      {icon}
      <div>{children}</div>
    </div>
  )
}

/** A keyboard shortcut hint, e.g. <Kbd>⌘K</Kbd>. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'figures inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-3 px-1 text-[10.5px] text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
