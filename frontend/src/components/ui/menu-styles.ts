import { cn } from '@/lib/cn'

/** Shared look for every Radix dropdown: a raised panel that grows from its trigger. */
export const menuContentClass = cn(
  'elevated z-50 min-w-44 rounded-xl border border-border bg-surface p-1',
  'origin-(--radix-dropdown-menu-content-transform-origin)',
  'data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
)

export const menuItemClass = cn(
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] outline-none select-none',
  'transition-colors duration-150 [&_svg]:size-4 [&_svg]:shrink-0',
)

export const menuItemTone = {
  default: 'text-fg data-[highlighted]:bg-hover-strong [&_svg]:text-muted',
  danger: 'text-red-600 data-[highlighted]:bg-red-500/10 dark:text-red-300',
}
