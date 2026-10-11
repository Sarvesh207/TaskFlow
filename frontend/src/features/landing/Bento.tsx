import { Check, ChevronDown, CircleDot, FolderKanban, Search } from 'lucide-react'
import type { PointerEvent, ReactNode } from 'react'
import { LogoMark } from '@/components/brand/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { PriorityBars } from '@/components/ui/SelectMenu'
import { cn } from '@/lib/cn'
import { PROJECT_STATUS, ROLE, TASK_STATUS, WRITABLE_TASK_STATUSES } from '@/lib/domain'
import { Reveal } from './Reveal'

/**
 * The landing page's features bento: cards of different sizes, each led by a
 * large illustration on a dotted "stage". The illustrations are static, built
 * from the app's own badges, and hidden from screen readers.
 */

/** Tracks the pointer so a soft glow follows it across the card. */
function trackPointer(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--x', `${event.clientX - rect.left}px`)
  event.currentTarget.style.setProperty('--y', `${event.clientY - rect.top}px`)
}

export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article
      onPointerMove={trackPointer}
      className={cn(
        'group/card relative h-full overflow-hidden rounded-[28px] border border-border-soft bg-bg',
        'shadow-[inset_0_1px_0_var(--highlight)] transition-colors duration-300 hover:border-border',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        style={{ background: 'radial-gradient(420px circle at var(--x) var(--y), rgb(59 130 246 / 0.09), transparent 45%)' }}
      />
      {children}
    </article>
  )
}

function BentoCard({
  title,
  children,
  visual,
  className,
  stageClassName,
  delay,
  badge,
}: {
  title: string
  /** Small chip after the title, e.g. "Coming soon". */
  badge?: ReactNode
  children: ReactNode
  visual: ReactNode
  className?: string
  stageClassName?: string
  delay?: number
}) {
  return (
    <Reveal delay={delay} className={className}>
      <SpotlightCard className="flex flex-col p-2">
        <div
          aria-hidden
          className={cn(
            'relative flex h-64 items-center justify-center overflow-hidden rounded-[22px] border border-border-soft bg-surface/50',
            stageClassName,
          )}
        >
          {/* Dotted backdrop that fades towards the edges. */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: 'radial-gradient(var(--border-strong) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
              maskImage: 'radial-gradient(ellipse 65% 60% at 50% 50%, black 20%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 65% 60% at 50% 50%, black 20%, transparent 80%)',
            }}
          />
          <div className="relative w-full px-6">{visual}</div>
        </div>
        <div className="px-4 pt-5 pb-4 sm:px-5">
          <h3 className="flex flex-wrap items-center gap-2 text-[17px] font-semibold tracking-tight">
            {title}
            {badge}
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{children}</p>
        </div>
      </SpotlightCard>
    </Reveal>
  )
}

/** Raised mini-panel used inside the illustrations. */
function Panel({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface shadow-[0_16px_40px_-16px_var(--shadow-color),inset_0_1px_0_var(--highlight)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------ illustrations */

function ProjectsVisual() {
  return (
    <div className="relative mx-auto h-44 max-w-md">
      {/* Two cards peeking out behind the front one. */}
      <Panel className="absolute inset-x-10 top-0 h-24 opacity-50" />
      <Panel className="absolute inset-x-5 top-4 h-24 opacity-80" />
      <Panel className="absolute inset-x-0 top-9 p-4 transition-transform duration-500 ease-out-expo group-hover/card:-translate-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-[14px] font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary-soft-fg">
              <FolderKanban className="size-4" />
            </span>
            Website Relaunch
          </span>
          <Badge tone={PROJECT_STATUS.active.tone}>{PROJECT_STATUS.active.label}</Badge>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-brand-from to-brand-to" />
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
          <span className="figures">18 of 25 tasks done</span>
          <span className="flex -space-x-1">
            {['Aisha Khan', 'Rohan Mehta', 'Lena Park'].map((name) => (
              <Avatar key={name} name={name} size="xs" className="ring-2 ring-surface" />
            ))}
          </span>
        </div>
      </Panel>
    </div>
  )
}

/** Donut of the task breakdown, like the dashboard's stat cards. */
function DashboardVisual() {
  const parts = [
    { label: 'Completed', value: 56, color: 'stroke-emerald-500', dot: 'bg-emerald-500' },
    { label: 'In Progress', value: 29, color: 'stroke-blue-500', dot: 'bg-blue-500' },
    { label: 'To Do', value: 15, color: 'stroke-slate-400 dark:stroke-slate-500', dot: 'bg-slate-400' },
  ]
  const r = 52
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-7">
      <div className="relative size-44">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" className="stroke-surface-3" />
          {parts.map((part) => {
            const length = (part.value / 100) * circumference
            const dash = (
              <circle
                key={part.label}
                cx="64"
                cy="64"
                r={r}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                className={part.color}
                // Small gap between segments; the round caps close most of it.
                strokeDasharray={`${Math.max(length - 8, 0)} ${circumference}`}
                strokeDashoffset={-offset}
              />
            )
            offset += length
            return dash
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="figures text-3xl font-semibold">56%</span>
          <span className="text-[11.5px] text-muted">completed</span>
        </div>
      </div>
      <div className="grid w-full max-w-[240px] gap-2">
        {parts.map((part) => (
          <div key={part.label} className="flex items-center gap-2.5 text-[12.5px]">
            <span className={cn('size-2 rounded-full', part.dot)} />
            <span className="flex-1 text-fg-2">{part.label}</span>
            <span className="figures text-muted">{part.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskVisual() {
  return (
    <div className="relative mx-auto max-w-[280px]">
      <Panel className="p-4">
        <p className="text-[13.5px] font-semibold">Finalize launch checklist</p>
        <p className="mt-1 text-[11.5px] text-subtle">Website Relaunch</p>
        <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2.5 text-[12px]">
          <span className="text-subtle">Assignee</span>
          <span className="flex items-center gap-1.5">
            <Avatar name="Aisha Khan" size="xs" /> Aisha Khan
          </span>
          <span className="text-subtle">Due</span>
          <span className="text-amber-600 dark:text-amber-300">Today</span>
        </div>
      </Panel>
      {/* Priority chip "pinned" to the corner. */}
      <span className="absolute -top-3 -right-3 flex rotate-3 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-medium shadow-[0_10px_24px_-10px_var(--shadow-color)] transition-transform duration-500 ease-out-expo group-hover/card:rotate-0">
        <PriorityBars level={3} tone="red" /> High
      </span>
    </div>
  )
}

function StatusVisual() {
  return (
    <div className="mx-auto max-w-[260px]">
      <div className="flex h-10 items-center justify-between rounded-xl border border-border bg-input px-3 text-[13px]">
        <span className="flex items-center gap-2">
          <CircleDot className="size-4 text-blue-500" /> In Progress
        </span>
        <ChevronDown className="size-4 rotate-180 text-muted" />
      </div>
      <Panel className="mt-2 p-1.5">
        {WRITABLE_TASK_STATUSES.map((status) => (
          <div
            key={status}
            className={cn(
              'flex items-center justify-between rounded-lg px-2.5 py-2',
              status === 'in_progress' && 'bg-hover-strong',
            )}
          >
            <Badge tone={TASK_STATUS[status].tone}>{TASK_STATUS[status].label}</Badge>
            {status === 'in_progress' ? <Check className="size-4 text-primary" /> : null}
          </div>
        ))}
      </Panel>
    </div>
  )
}

function TeamVisual() {
  const people = [
    { name: 'Aisha Khan', role: 'owner' as const, pos: 'left-0 top-[12%] sm:left-[6%] sm:top-[18%]' },
    { name: 'Rohan Mehta', role: 'admin' as const, pos: 'right-0 top-[24%] sm:right-[6%] sm:top-[14%]' },
    { name: 'Lena Park', role: 'member' as const, pos: 'left-[4%] bottom-[18%] sm:left-[14%] sm:bottom-[10%]' },
    { name: 'Dev Patel', role: 'member' as const, pos: 'right-[2%] bottom-[6%] sm:right-[12%] sm:bottom-[12%]' },
  ]
  return (
    <div className="relative mx-auto h-52 max-w-md">
      {/* Orbit rings around the project. */}
      <div className="absolute top-1/2 left-1/2 size-44 -translate-1/2 rounded-full border border-dashed border-border-strong" />
      <div className="absolute top-1/2 left-1/2 size-72 -translate-1/2 rounded-full border border-border-soft" />
      <div className="absolute top-1/2 left-1/2 grid size-16 -translate-1/2 place-items-center rounded-2xl border border-border bg-surface shadow-[0_0_60px_-10px_rgb(59_130_246/0.5)]">
        <LogoMark className="size-9" />
      </div>
      {people.map((p) => (
        <span
          key={p.name}
          className={cn(
            'absolute flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1 sm:pr-1.5 shadow-[0_10px_24px_-12px_var(--shadow-color)]',
            p.pos,
          )}
        >
          <Avatar name={p.name} size="xs" />
          <span className="text-[12px] font-medium">{p.name.split(' ')[0]}</span>
          {/* Role chips only where there is room for them. */}
          <span className="hidden sm:block">
            <Badge tone={ROLE[p.role].tone} className="h-5! rounded-full! px-1.5! text-[10.5px]!">
              {ROLE[p.role].label}
            </Badge>
          </span>
        </span>
      ))}
    </div>
  )
}

function MyTasksVisual() {
  const results = [
    { title: 'Finalize launch checklist', project: 'Website Relaunch', status: 'in_progress' as const },
    { title: 'Write launch announcement', project: 'Marketing', status: 'pending' as const },
  ]
  return (
    <div className="mx-auto max-w-sm">
      <div className="flex h-11 items-center gap-2.5 rounded-full border border-border bg-input px-4 text-[13.5px] shadow-[0_10px_30px_-14px_var(--shadow-color)]">
        <Search className="size-4 text-muted" />
        <span>
          launch<span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-primary" />
        </span>
        <span className="ml-auto rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary-soft-fg">
          2 results
        </span>
      </div>
      <Panel className="mt-3 divide-y divide-border-soft">
        {results.map((task) => (
          <div key={task.title} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium">{task.title}</p>
              <p className="truncate text-[11px] text-subtle">{task.project}</p>
            </div>
            <Badge tone={TASK_STATUS[task.status].tone}>{TASK_STATUS[task.status].label}</Badge>
          </div>
        ))}
      </Panel>
    </div>
  )
}

/** Marks a feature that is planned but not in the app yet. */
export function ComingSoon() {
  return (
    <span className="inline-flex h-[22px] items-center rounded-full border border-dashed border-primary/40 bg-primary/[0.06] px-2.5 text-[11px] font-medium tracking-normal text-primary-soft-fg">
      Email invites · Coming soon
    </span>
  )
}

/* -------------------------------------------------------------------- grid */

export function FeaturesBento() {
  return (
    <div className="grid gap-4 lg:grid-cols-6">
      <BentoCard className="lg:col-span-4" title="Projects that stay organized" visual={<ProjectsVisual />}>
        Create a project for each goal and mark it Active, Completed or Archived as it moves along.
      </BentoCard>

      <BentoCard
        className="lg:col-span-2 lg:row-span-2"
        stageClassName="lg:h-auto lg:flex-1 lg:min-h-[420px]"
        delay={80}
        title="Dashboard at a glance"
        visual={<DashboardVisual />}
      >
        Total projects and tasks, what's in progress and what's done, with percentages.
      </BentoCard>

      <BentoCard className="lg:col-span-2" title="Tasks with real detail" visual={<TaskVisual />}>
        Every task has a title, description, assignee, due date and Low / Medium / High priority.
      </BentoCard>

      <BentoCard className="lg:col-span-2" delay={80} title="Clear status at every step" visual={<StatusVisual />}>
        Move tasks from To Do to In Progress to Completed as the work moves.
      </BentoCard>

      <BentoCard
        className="lg:col-span-3"
        title="Bring your team in"
        badge={<ComingSoon />}
        visual={<TeamVisual />}
      >
        Add teammates to a project, give them a role, and assign tasks to the right person. Soon you'll invite
        anyone with an email link, even before they have an account.
      </BentoCard>

      <BentoCard className="lg:col-span-3" delay={80} title="My Tasks, front and center" visual={<MyTasksVisual />}>
        Everything assigned to you across all projects. Search and filter by project, priority or status.
      </BentoCard>
    </div>
  )
}
