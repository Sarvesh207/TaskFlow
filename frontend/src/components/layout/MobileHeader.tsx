import { Menu as MenuIcon, Search } from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/cn'

const iconButton = cn(
  'inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors duration-150',
  'hover:bg-hover-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
)

/**
 * Small screens only: the sidebar is a drawer there, so this slim bar opens
 * it and the search palette. On large screens there is no top bar at all —
 * search lives in the sidebar, and theme/account in its Settings.
 */
export function MobileHeader({ onOpenNav, onOpenPalette }: { onOpenNav: () => void; onOpenPalette: () => void }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 rounded-2xl border border-border bg-bg px-1.5 lg:hidden">
      <button type="button" onClick={onOpenNav} className={iconButton} aria-label="Open navigation">
        <MenuIcon className="size-5" />
      </button>
      <Link
        to="/"
        aria-label="TaskFlow home"
        className="rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Logo />
      </Link>
      <button type="button" onClick={onOpenPalette} className={cn(iconButton, 'ml-auto')} aria-label="Search or jump to">
        <Search className="size-[18px]" />
      </button>
    </header>
  )
}
