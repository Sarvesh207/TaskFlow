import { CheckSquare } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { DueLabel, PriorityBadge, TaskStatusBadge } from '@/components/badges'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/form'
import { PageHeader, ProjectTile, SearchInput, Toolbar } from '@/components/ui/misc'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states'
import { FilterTabs } from '@/components/ui/Tabs'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import { FILL_HEIGHT } from '@/components/layout/fill-height'
import { useMe } from '@/features/auth/queries'
import { useProjects } from '@/features/projects/queries'
import { usePagination } from '@/hooks/usePagination'
import { PRIORITY, PRIORITY_LEVELS, projectTile } from '@/lib/domain'
import { byUrgency, filterTasks, statusTabs, type PriorityFilter, type StatusFilter } from '@/features/tasks/filters'
import { useTasksAcross } from '@/features/tasks/queries'

export function MyTasksPage() {
  const me = useMe()
  const navigate = useNavigate()
  const projects = useProjects()
  const across = useTasksAcross(projects.data)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [priority, setPriority] = useState<PriorityFilter>('all')
  const [projectId, setProjectId] = useState('all')
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search)

  const mine = useMemo(
    () => across.tasks.filter((t) => t.assigned_to === me.id).toSorted(byUrgency),
    [across.tasks, me.id],
  )
  const inProject = useMemo(
    () => (projectId === 'all' ? mine : mine.filter((t) => t.project_id === projectId)),
    [mine, projectId],
  )
  const filtered = useMemo(() => filterTasks(inProject, { status, priority, q }), [inProject, status, priority, q])
  const pagination = usePagination(filtered, 10)

  const isPending = projects.isPending || across.isPending
  const error = projects.error ?? across.error

  return (
    <>
      <PageHeader title="My Tasks" description="Tasks assigned to you across all projects." />
      <Card className={FILL_HEIGHT}>
        <div className="px-4 pt-1">
          <FilterTabs value={status} onChange={setStatus} options={statusTabs(inProject)} />
        </div>
        <Toolbar>
          <SearchInput
            placeholder="Search tasks…"
            aria-label="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs sm:flex-1"
          />
          <div className="flex gap-3 sm:ml-auto">
            <Select
              aria-label="Filter by project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex-1 sm:w-44"
            >
              <option value="all">All Projects</option>
              {projects.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter by priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityFilter)}
              className="flex-1 sm:w-40"
            >
              <option value="all">All Priority</option>
              {PRIORITY_LEVELS.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY[p].label}
                </option>
              ))}
            </Select>
          </div>
        </Toolbar>

        {isPending ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={() => projects.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CheckSquare />}
            title={mine.length ? 'No matching tasks' : 'Nothing assigned to you'}
            description={mine.length ? 'Try a different filter.' : 'Tasks assigned to you in any project will show up here.'}
          />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Title</Th>
                  <Th>Project</Th>
                  <Th>Status</Th>
                  <Th>Priority</Th>
                  <Th>Due Date</Th>
                </tr>
              </THead>
              <TBody>
                {pagination.pageItems.map((task) => {
                  const href = `/projects/${task.project_id}/tasks/${task.id}`
                  return (
                    <Tr key={task.id} onClick={() => navigate(href)}>
                      <Td className="max-w-xs">
                        <Link to={href} className="line-clamp-1 font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>
                          {task.title}
                        </Link>
                      </Td>
                      <Td>
                        <span className="flex items-center gap-2 text-muted">
                          <ProjectTile name={task.project.name} tileClass={projectTile(task.project.id)} size="sm" />
                          <span className="truncate">{task.project.name}</span>
                        </span>
                      </Td>
                      <Td>
                        <TaskStatusBadge status={task.status} />
                      </Td>
                      <Td>
                        <PriorityBadge priority={task.priority} />
                      </Td>
                      <Td>
                        <DueLabel task={task} />
                      </Td>
                    </Tr>
                  )
                })}
              </TBody>
            </Table>
            <Pagination {...pagination} onPageChange={pagination.setPage} />
          </>
        )}
      </Card>
    </>
  )
}
