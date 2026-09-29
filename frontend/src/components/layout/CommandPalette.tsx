import { Command } from 'cmdk'
import {
  CheckSquare,
  CornerDownLeft,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  UserRound,
  Users,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Kbd, ProjectTile } from '@/components/ui/misc'
import { useLogout } from '@/features/auth/queries'
import { useProjects } from '@/features/projects/queries'
import { cn } from '@/lib/cn'
import { projectTile } from '@/lib/domain'

const SEARCH_VALUE = '__search__'

const PAGES = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
  { to: '/projects', label: 'Projects', icon: FolderKanban, keywords: ['all projects'] },
  { to: '/my-tasks', label: 'My Tasks', icon: CheckSquare, keywords: ['assigned', 'todo'] },
  { to: '/users', label: 'Users', icon: Users, keywords: ['people', 'team', 'directory'] },
  { to: '/profile', label: 'My profile', icon: UserRound, keywords: ['settings', 'account', 'bio'] },
]

/** Rank by the item's words (keywords), not its internal value. "Search for…" sits below real matches. */
function rank(value: string, search: string, keywords?: string[]): number {
  if (value === SEARCH_VALUE) return 0.1
  const q = search.trim().toLowerCase()
  if (!q) return 1
  const text = (keywords?.join(' ') ?? value).toLowerCase()
  if (text.startsWith(q)) return 1
  if (text.split(/\s+/).some((word) => word.startsWith(q))) return 0.8
  return text.includes(q) ? 0.5 : 0
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const logout = useLogout()
  const { data: projects } = useProjects()
  const [query, setQuery] = useState('')

  function run(action: () => void) {
    onOpenChange(false)
    setQuery('')
    action()
  }

  const trimmed = query.trim()

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('')
        onOpenChange(next)
      }}
      label="Command menu"
      filter={rank}
      loop
      // Keyboard-triggered and used constantly: it opens instantly, no animation.
      overlayClassName="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] dark:bg-black/55"
      contentClassName={cn(
        'fixed top-[14vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl',
        'elevated border border-border bg-surface',
        'focus:outline-none',
      )}
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-subtle" aria-hidden />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search projects, pages and actions…"
          className="h-12 w-full bg-transparent text-[14px] text-fg placeholder:text-subtle focus:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>

      <Command.List className="max-h-[min(420px,60vh)] scroll-py-2 overflow-y-auto p-2">
        <Command.Empty className="py-10 text-center text-[13px] text-muted">No results for “{trimmed}”.</Command.Empty>

        {projects?.length ? (
          <Group heading="Projects">
            {projects.map((p) => (
              <Item
                key={p.id}
                value={`project:${p.id}`}
                keywords={[p.name, p.description ?? '']}
                onSelect={() => run(() => navigate(`/projects/${p.id}`))}
              >
                <ProjectTile name={p.name} tileClass={projectTile(p.id)} size="sm" />
                <span className="truncate">{p.name}</span>
              </Item>
            ))}
          </Group>
        ) : null}

        <Group heading="Go to">
          {PAGES.map(({ to, label, icon: Icon, keywords }) => (
            <Item key={to} value={`page:${to}`} keywords={[label, ...keywords]} onSelect={() => run(() => navigate(to))}>
              <Icon className="text-subtle" />
              {label}
            </Item>
          ))}
        </Group>

        <Group heading="Actions">
          <Item value="action:new-project" keywords={['New project', 'create']} onSelect={() => run(() => navigate('/projects/new'))}>
            <Plus className="text-subtle" />
            New project
          </Item>
          <Item value="action:sign-out" keywords={['Sign out', 'log out', 'logout']} onSelect={() => run(() => logout.mutate())}>
            <LogOut className="text-subtle" />
            Sign out
          </Item>
        </Group>

        {trimmed ? (
          <Group heading="Search">
            <Item value={SEARCH_VALUE} onSelect={() => run(() => navigate(`/projects?q=${encodeURIComponent(trimmed)}`))}>
              <Search className="text-subtle" />
              Search projects for “{trimmed}”
            </Item>
          </Group>
        ) : null}
      </Command.List>

      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11.5px] text-subtle">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>
            <CornerDownLeft className="size-3" />
          </Kbd>
          open
        </span>
      </div>
    </Command.Dialog>
  )
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-subtle [&_[cmdk-group-heading]]:uppercase"
    >
      {children}
    </Command.Group>
  )
}

function Item({
  children,
  ...props
}: { children: ReactNode; value: string; keywords?: string[]; onSelect: () => void }) {
  return (
    <Command.Item
      {...props}
      className={cn(
        'flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[13.5px] text-muted select-none',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        'data-[selected=true]:bg-hover-strong data-[selected=true]:text-fg',
      )}
    >
      {children}
    </Command.Item>
  )
}
