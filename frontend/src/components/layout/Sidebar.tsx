import { CheckSquare, ChevronDown, FolderKanban, LayoutDashboard, PanelLeft, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useId, useState, type ComponentType, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { ProjectTile } from '@/components/ui/misc'
import { useMe } from '@/features/auth/queries'
import { useProjects } from '@/features/projects/queries'
import { cn } from '@/lib/cn'
import { projectTile } from '@/lib/domain'
import { preloadRoute } from '@/router-preload'
import { SettingsPopover } from './SettingsPopover'

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

const SECTIONS: { title: string; items: { to: string; label: string; icon: Icon; end?: boolean }[] }[] = [
  {
    title: 'Workspace',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/my-tasks', label: 'My Tasks', icon: CheckSquare },
    ],
  },
  {
    title: 'Manage',
    items: [
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/users', label: 'Users', icon: Users },
    ],
  },
]

const PROJECT_SHORTCUTS = 5

interface SidebarProps {
  /** Icon-only rail (desktop). */
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** Called after navigating — closes the mobile drawer. */
  onNavigate?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapse, onNavigate }: SidebarProps) {
  const me = useMe()
  const groupId = useId()
  const { data: projects } = useProjects()

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg">
      {/* Brand + collapse */}
      <div className={cn('flex h-14 shrink-0 items-center border-b border-border-soft px-4', collapsed ? 'justify-center px-0' : 'justify-between')}>
        {collapsed ? null : (
          <Link
            to="/"
            onClick={onNavigate}
            aria-label="TaskFlow home"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Logo />
          </Link>
        )}
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="group inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {collapsed ? <LogoMark className="size-6 group-hover:hidden" /> : null}
            <PanelLeft className={cn('size-[17px]', collapsed && 'hidden group-hover:block')} aria-hidden />
          </button>
        ) : null}
      </div>

      <nav className="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Main">
        {SECTIONS.map((section) => (
          <Section key={section.title} title={section.title} collapsed={collapsed}>
            {section.items.map((item) => (
              <NavItem key={item.to} {...item} groupId={groupId} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </Section>
        ))}

        {!collapsed && projects?.length ? (
          <Section title="Projects" collapsed={collapsed}>
            {projects.slice(0, PROJECT_SHORTCUTS).map((p) => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    isActive ? 'bg-primary-soft font-medium text-fg' : 'text-muted hover:bg-hover hover:text-fg',
                  )
                }
              >
                <ProjectTile name={p.name} tileClass={projectTile(p.id)} size="xs" />
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
            {projects.length > PROJECT_SHORTCUTS ? (
              <Link
                to="/projects"
                onClick={onNavigate}
                className="flex h-8 items-center px-3 text-xs font-medium text-muted transition-colors hover:text-primary"
              >
                View all {projects.length} projects
              </Link>
            ) : null}
          </Section>
        ) : null}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-border-soft p-3">
        <SettingsPopover collapsed={collapsed} onNavigate={onNavigate} />
        <Link
          to="/profile"
          onClick={onNavigate}
          title={collapsed ? me.full_name : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl border border-border bg-surface px-2.5 py-2 transition-colors duration-200',
            'hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            collapsed && 'justify-center border-transparent bg-transparent px-0',
          )}
        >
          <Avatar name={me.full_name} src={me.profile?.avatar_url} seed={me.id} size="sm" />
          {collapsed ? null : (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-fg">{me.full_name}</span>
              <span className="block truncate text-xs text-muted">{me.email}</span>
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}

/** A labelled group that folds away, like takeuforward's "Prep / Explore / My Spaces". */
function Section({ title, collapsed, children }: { title: string; collapsed: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  if (collapsed) return <div className="space-y-0.5 border-b border-border-soft pb-2 last:border-0">{children}</div>
  return (
    <div className="border-b border-border-soft pb-2 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-8 w-full items-center justify-between rounded-md px-3 text-[12px] font-medium text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {title}
        <ChevronDown className={cn('size-3.5 transition-transform duration-200', !open && '-rotate-90')} aria-hidden />
      </button>
      {open ? <div className="space-y-0.5">{children}</div> : null}
    </div>
  )
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  groupId,
  collapsed,
  onNavigate,
}: {
  to: string
  label: string
  icon: Icon
  end?: boolean
  groupId: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      // Start loading the page's code as soon as the pointer heads for it.
      onPointerEnter={() => preloadRoute(to)}
      onFocus={() => preloadRoute(to)}
      className={({ isActive }) =>
        cn(
          'relative flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          isActive ? 'text-fg' : 'text-fg-2 hover:bg-hover hover:text-fg',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId={`sidebar-active-${groupId}`}
              transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
              className="absolute inset-0 rounded-lg bg-primary-soft"
              aria-hidden
            />
          ) : null}
          <Icon className={cn('relative size-[18px] shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted')} aria-hidden />
          <span className={cn('relative', collapsed && 'sr-only')}>{label}</span>
        </>
      )}
    </NavLink>
  )
}
