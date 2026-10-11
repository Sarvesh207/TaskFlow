import { CheckCircle2, CheckSquare, CircleDot, FolderKanban, LayoutDashboard, ListTodo, Users } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { PriorityBars } from '@/components/ui/SelectMenu'
import { cn } from '@/lib/cn'
import { PRIORITY, PROJECT_STATUS, TASK_STATUS, type PriorityLevel } from '@/lib/domain'
import type { ProjectStatus, TaskStatus } from '@/types/api'

/**
 * A static, illustrative copy of the dashboard for the landing page hero.
 * Built from the app's own badges and tokens so it always matches the product
 * and follows the theme; it is decorative, so screen readers skip it.
 */

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Projects', icon: FolderKanban },
  { label: 'My Tasks', icon: CheckSquare },
  { label: 'Users', icon: Users },
]

const STATS = [
  { label: 'Total Projects', value: '6', icon: FolderKanban, tone: 'text-violet-500 bg-violet-500/10' },
  { label: 'Total Tasks', value: '48', icon: ListTodo, tone: 'text-blue-500 bg-blue-500/10' },
  { label: 'In Progress', value: '14', hint: '29% of total', icon: CircleDot, tone: 'text-sky-500 bg-sky-500/10' },
  { label: 'Completed', value: '27', hint: '56% of total', icon: CheckCircle2, tone: 'text-emerald-500 bg-emerald-500/10' },
]

const TASKS: { title: string; project: string; priority: PriorityLevel; status: TaskStatus; due: string }[] = [
  { title: 'Finalize launch checklist', project: 'Website Relaunch', priority: 'high', status: 'in_progress', due: 'Today' },
  { title: 'Review onboarding copy', project: 'Mobile App', priority: 'medium', status: 'pending', due: 'Oct 14' },
  { title: 'Set up analytics events', project: 'Website Relaunch', priority: 'low', status: 'completed', due: 'Oct 9' },
  { title: 'Plan Q4 roadmap session', project: 'Operations', priority: 'medium', status: 'in_progress', due: 'Oct 18' },
]

const PROJECTS: { name: string; status: ProjectStatus; done: number; people: string[] }[] = [
  { name: 'Website Relaunch', status: 'active', done: 72, people: ['Aisha Khan', 'Rohan Mehta', 'Lena Park'] },
  { name: 'Mobile App', status: 'active', done: 41, people: ['Dev Patel', 'Aisha Khan'] },
  { name: 'Brand Refresh', status: 'completed', done: 100, people: ['Lena Park', 'Sam Cole', 'Rohan Mehta'] },
]

export function ProductPreview({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none overflow-hidden rounded-2xl border border-border bg-canvas text-left select-none',
        'shadow-[0_40px_120px_-30px_rgb(37_99_235/0.35),0_20px_50px_-20px_var(--shadow-color)]',
        className,
      )}
    >
      {/* Window chrome */}
      <div className="flex h-10 items-center gap-2 border-b border-border-soft bg-bg px-4">
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="mx-auto hidden rounded-md bg-surface-2 px-16 py-1 text-[11px] text-subtle sm:block">
          taskflow.sarveshgaynar.in
        </span>
      </div>

      <div className="flex gap-2 p-2">
        {/* Sidebar */}
        <div className="hidden w-44 shrink-0 flex-col gap-1 rounded-xl border border-border-soft bg-bg p-3 md:flex">
          <div className="mb-3 flex items-center gap-2 px-1">
            <LogoMark className="size-6" />
            <span className="text-[13px] font-bold tracking-tight">
              Task<span className="text-brand-gradient">Flow</span>
            </span>
          </div>
          {NAV.map(({ label, icon: Icon, active }) => (
            <span
              key={label}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]',
                active ? 'bg-primary-soft font-medium text-primary-soft-fg' : 'text-muted',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </span>
          ))}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 rounded-xl border border-border-soft bg-bg p-4 sm:p-5">
          <p className="text-[15px] font-semibold tracking-tight">Dashboard</p>
          <p className="mt-0.5 text-[11.5px] text-muted">Welcome back, Aisha. Here's what's happening in your projects.</p>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {STATS.map(({ label, value, hint, icon: Icon, tone }) => (
              <div key={label} className="surface-highlight rounded-xl border border-border-soft bg-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">{label}</span>
                  <span className={cn('grid size-6 place-items-center rounded-md', tone)}>
                    <Icon className="size-3.5" />
                  </span>
                </div>
                <p className="figures mt-2 text-xl font-semibold">{value}</p>
                <p className="mt-0.5 h-3.5 text-[10.5px] text-subtle">{hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-[1.45fr_1fr]">
            <div className="surface-highlight rounded-xl border border-border-soft bg-surface p-3">
              <p className="mb-2 text-[12px] font-semibold">My Tasks</p>
              <div className="divide-y divide-border-soft">
                {TASKS.map((task) => (
                  <div key={task.title} className="flex items-center gap-3 py-2">
                    <PriorityBars
                      level={task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1}
                      tone={PRIORITY[task.priority].tone}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium">{task.title}</p>
                      <p className="truncate text-[10.5px] text-subtle">{task.project}</p>
                    </div>
                    <Badge tone={TASK_STATUS[task.status].tone} className="hidden sm:inline-flex">
                      {TASK_STATUS[task.status].label}
                    </Badge>
                    <span
                      className={cn(
                        'w-11 text-right text-[11px] tabular-nums',
                        task.due === 'Today' ? 'text-amber-600 dark:text-amber-300' : 'text-muted',
                      )}
                    >
                      {task.due}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-highlight hidden rounded-xl border border-border-soft bg-surface p-3 lg:block">
              <p className="mb-2 text-[12px] font-semibold">Recent Projects</p>
              <div className="space-y-3">
                {PROJECTS.map((project) => (
                  <div key={project.name}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-medium">{project.name}</span>
                      <Badge tone={PROJECT_STATUS[project.status].tone}>{PROJECT_STATUS[project.status].label}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-from to-brand-to"
                          style={{ width: `${project.done}%` }}
                        />
                      </div>
                      <div className="flex -space-x-1">
                        {project.people.map((name) => (
                          <Avatar key={name} name={name} size="xs" className="ring-2 ring-surface" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
