import { CheckCircle2, CheckSquare, CircleDot, FolderKanban, ListTodo, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { DueLabel, PriorityBadge, ProjectStatusBadge } from '@/components/badges'
import { ButtonLink } from '@/components/ui/Button'
import { Card, CardHeader, StatCard } from '@/components/ui/Card'
import { PageHeader, ProjectTile } from '@/components/ui/misc'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { useMe } from '@/features/auth/queries'
import { useProjects } from '@/features/projects/queries'
import { byUrgency } from '@/features/tasks/filters'
import { useTasksAcross } from '@/features/tasks/queries'
import { projectTile } from '@/lib/domain'
import { percent } from '@/lib/format'

export function DashboardPage() {
  const me = useMe()
  const projects = useProjects()
  const across = useTasksAcross(projects.data)

  const stats = useMemo(() => {
    const tasks = across.tasks
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length
    const completed = tasks.filter((t) => t.status === 'completed').length
    return { projects: projects.data?.length ?? 0, tasks: tasks.length, inProgress, completed }
  }, [across.tasks, projects.data])

  const myOpenTasks = useMemo(
    () =>
      across.tasks
        .filter((t) => t.assigned_to === me.id && t.status !== 'completed' && t.status !== 'cancelled')
        .toSorted(byUrgency)
        .slice(0, 5),
    [across.tasks, me.id],
  )

  const recentProjects = projects.data?.slice(0, 5) ?? []
  const loading = projects.isPending || across.isPending
  const num = (n: number) => (loading ? <Skeleton className="h-8 w-12" /> : n)
  const firstName = me.full_name.split(' ')[0]

  if (projects.error) return <ErrorState error={projects.error} onRetry={projects.refetch} />

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back, ${firstName}. Here's what's happening in your projects.`} />

      <div className="stagger grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total Projects" value={num(stats.projects)} icon={<FolderKanban className="size-4" />} tone="violet" />
        <StatCard label="Total Tasks" value={num(stats.tasks)} icon={<ListTodo className="size-4" />} tone="blue" />
        <StatCard
          label="In Progress"
          value={num(stats.inProgress)}
          icon={<CircleDot className="size-4" />}
          tone="blue"
          hint={loading ? null : `${percent(stats.inProgress, stats.tasks)}% of total`}
        />
        <StatCard
          label="Completed"
          value={num(stats.completed)}
          icon={<CheckCircle2 className="size-4" />}
          tone="emerald"
          hint={loading ? null : `${percent(stats.completed, stats.tasks)}% of total`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="My Tasks"
            action={
              <Link to="/my-tasks" className="text-sm font-medium text-primary hover:text-primary-hover">
                View all
              </Link>
            }
          />
          <div className="p-3">
            {loading ? (
              <ListSkeleton />
            ) : myOpenTasks.length === 0 ? (
              <EmptyState icon={<CheckSquare />} title="You're all caught up" description="No open tasks are assigned to you." />
            ) : (
              <ul className="space-y-1">
                {myOpenTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      to={`/projects/${task.project_id}/tasks/${task.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2"
                    >
                      <ProjectTile name={task.project.name} tileClass={projectTile(task.project.id)} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{task.title}</span>
                        <span className="block truncate text-xs text-muted">{task.project.name}</span>
                      </span>
                      <PriorityBadge priority={task.priority} />
                      <span className="w-14 text-right text-xs">
                        <DueLabel task={task} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent Projects"
            action={
              <Link to="/projects" className="text-sm font-medium text-primary hover:text-primary-hover">
                View all
              </Link>
            }
          />
          <div className="p-3">
            {projects.isPending ? (
              <ListSkeleton />
            ) : recentProjects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban />}
                title="No projects yet"
                description="Create a project to get started."
                action={
                  <ButtonLink to="/projects/new" icon={<Plus className="size-4" />}>
                    New Project
                  </ButtonLink>
                }
              />
            ) : (
              <ul className="space-y-1">
                {recentProjects.map((project) => (
                  <li key={project.id}>
                    <Link
                      to={`/projects/${project.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2"
                    >
                      <ProjectTile name={project.name} tileClass={projectTile(project.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{project.name}</span>
                        <span className="block truncate text-xs text-muted">{project.description || 'No description'}</span>
                      </span>
                      <ProjectStatusBadge status={project.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-1" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2.5">
          <Skeleton className="size-7" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  )
}
