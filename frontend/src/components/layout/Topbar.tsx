import * as Menu from '@radix-ui/react-dropdown-menu'
import { LogOut, Menu as MenuIcon, Moon, Search, Sun, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { menuContentClass, menuItemClass, menuItemTone } from '@/components/ui/menu-styles'
import { Kbd } from '@/components/ui/misc'
import { useLogout, useMe } from '@/features/auth/queries'
import { useTheme } from '@/features/theme/theme'
import { cn } from '@/lib/cn'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const iconButton = cn(
  'inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors duration-150',
  'hover:bg-hover-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
)

/** Floating top panel, like takeuforward's: search on the left, quick actions on the right. */
export function Topbar({ onOpenNav, onOpenPalette }: { onOpenNav: () => void; onOpenPalette: () => void }) {
  const me = useMe()
  const navigate = useNavigate()
  const logout = useLogout()
  const { resolved, setTheme } = useTheme()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 rounded-2xl border border-border bg-bg px-2.5 sm:px-3">
      <button type="button" onClick={onOpenNav} className={cn(iconButton, 'lg:hidden')} aria-label="Open navigation">
        <MenuIcon className="size-5" />
      </button>

      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Search or jump to"
        aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
        className={cn(
          'group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 text-left',
          'text-[13px] text-muted transition-[border-color,color] duration-200',
          'hover:border-border-strong hover:text-fg-2',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">Search or jump to…</span>
        <span className="hidden gap-1 sm:flex" aria-hidden>
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* One-click light/dark flip; the full Light/Dark/System choice lives in sidebar Settings. */}
        <button
          type="button"
          onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
          className={iconButton}
          aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={resolved === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {resolved === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Menu.Root modal={false}>
          <Menu.Trigger
            className="rounded-full ring-offset-2 ring-offset-bg transition-shadow duration-200 hover:ring-2 hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label="Account menu"
          >
            <Avatar name={me.full_name} src={me.profile?.avatar_url} seed={me.id} size="sm" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content align="end" sideOffset={8} className={cn(menuContentClass, 'w-60')}>
              <div className="flex items-center gap-3 px-2.5 py-2.5">
                <Avatar name={me.full_name} src={me.profile?.avatar_url} seed={me.id} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-fg">{me.full_name}</p>
                  <p className="truncate text-xs text-muted">{me.email}</p>
                </div>
              </div>
              <Menu.Separator className="-mx-1 my-1 h-px bg-border-soft" />
              <Menu.Item onSelect={() => navigate('/profile')} className={cn(menuItemClass, menuItemTone.default)}>
                <UserRound />
                My profile
              </Menu.Item>
              <Menu.Item onSelect={() => logout.mutate()} className={cn(menuItemClass, menuItemTone.danger)}>
                <LogOut />
                Sign out
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </header>
  )
}
