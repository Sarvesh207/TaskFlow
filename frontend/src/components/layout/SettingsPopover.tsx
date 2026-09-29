import * as Popover from '@radix-ui/react-popover'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { useLogout, useMe } from '@/features/auth/queries'
import { ThemeSwitcher } from '@/features/theme/ThemeSwitcher'
import { cn } from '@/lib/cn'

/** Sidebar "Settings": appearance (theme) plus account shortcuts. */
export function SettingsPopover({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const me = useMe()
  const navigate = useNavigate()
  const logout = useLogout()
  const [open, setOpen] = useState(false)

  function go(to: string) {
    setOpen(false)
    onNavigate?.()
    navigate(to)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label="Settings"
        title={collapsed ? 'Settings' : undefined}
        className={cn(
          'flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium text-muted transition-colors duration-200',
          'hover:bg-hover hover:text-fg data-[state=open]:bg-hover-strong data-[state=open]:text-fg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          collapsed && 'justify-center px-0',
        )}
      >
        <Settings className="size-[17px] shrink-0" aria-hidden />
        <span className={cn(collapsed && 'sr-only')}>Settings</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={collapsed ? 'right' : 'top'}
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            'elevated z-50 w-72 rounded-xl border border-border bg-surface p-1.5 focus:outline-none',
            'origin-(--radix-popover-content-transform-origin)',
            'data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
          )}
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={me.full_name} src={me.profile?.avatar_url} seed={me.id} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-fg">{me.full_name}</p>
              <p className="truncate text-xs text-muted">{me.email}</p>
            </div>
          </div>

          <div className="mx-1 my-1 h-px bg-border-soft" />

          <div className="px-2 pt-2 pb-2.5">
            <p className="mb-2 text-[11.5px] font-medium text-muted">Appearance</p>
            <ThemeSwitcher />
          </div>

          <div className="mx-1 my-1 h-px bg-border-soft" />

          <MenuButton icon={<UserRound />} onClick={() => go('/profile')}>
            My profile
          </MenuButton>
          <MenuButton
            icon={<LogOut />}
            danger
            onClick={() => {
              setOpen(false)
              logout.mutate()
            }}
          >
            Sign out
          </MenuButton>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function MenuButton({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: ReactNode
  children: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [&_svg]:size-4 [&_svg]:shrink-0',
        danger ? 'text-red-600 hover:bg-red-500/10 dark:text-red-300' : 'text-fg hover:bg-hover-strong [&_svg]:text-muted',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
