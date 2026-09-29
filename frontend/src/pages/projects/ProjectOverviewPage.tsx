import { AlertCircle, CheckCircle2, CircleDot, ListTodo, Pencil, Plus, Settings, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { Card, StatCard } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/states'
import { useTasks } from '@/features/tasks/queries'
import { isOverdue } from '@/lib/domain'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { useProjectContext } from '@/features/projects/project-context'

export function ProjectOverviewPage() {
  const { project, owner, role, people } = useProjectContext()
  const { data: tasks, isPending } = useTasks(project.id)

  const stats = {
    total: tasks?.length ?? 0,
    inProgress: tasks?.filter((t) => t.status === 'in_progress').length ?? 0,
    completed: tasks?.filter((t) => t.status === 'completed').length ?? 0,
    overdue: tasks?.filter(isOverdue).length ?? 0,
  }
  const value = (n: number) => (isPending ? <Skeleton className="h-8 w-10" /> : n)
  const base = `/projects/${project.id}`

  return (
    <div className="space-y-6">
      <div className="stagger grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total Tasks" value={value(stats.total)} icon={<ListTodo className="size-4" />} tone="violet" />
        <StatCard label="In Progress" value={value(stats.inProgress)} icon={<CircleDot className="size-4" />} tone="blue" />
        <StatCard label="Completed" value={value(stats.completed)} icon={<CheckCircle2 className="size-4" />} tone="emerald" />
        <StatCard label="Overdue" value={value(stats.overdue)} icon={<AlertCircle className="size-4" />} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-fg">Description</h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
            {project.description || 'No description yet.'}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Created by</dt>
              <dd className="mt-1.5 flex items-center gap-2 text-sm text-fg">
                <Avatar name={owner.name} src={owner.avatarUrl} seed={owner.id} size="xs" />
                <Link to={`/users/${owner.id}`} className="truncate hover:text-primary">
                  {owner.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Created at</dt>
              <dd className="mt-1.5 text-sm text-fg">{formatDate(project.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Team</dt>
              <dd className="mt-1.5 text-sm text-fg">
                {people.length} {people.length === 1 ? 'person' : 'people'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-fg">Quick Actions</h2>
          <ul className="mt-3 space-y-1">
            {can.createTask(role) ? <QuickAction to={`${base}/tasks/new`} icon={<Plus />} label="Add Task" /> : null}
            <QuickAction to={`${base}/members`} icon={<Users />} label={can.manageMembers(role) ? 'Manage Members' : 'View Members'} />
            {can.editProject(role) ? <QuickAction to={`${base}/settings`} icon={<Pencil />} label="Edit Project" /> : null}
            <QuickAction to={`${base}/settings`} icon={<Settings />} label="Project Settings" />
          </ul>
        </Card>
      </div>
    </div>
  )
}

function QuickAction({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-primary transition-colors hover:bg-hover hover:text-primary-hover [&_svg]:size-4"
      >
        {icon}
        {label}
      </Link>
    </li>
  )
}
