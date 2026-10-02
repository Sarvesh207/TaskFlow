import { Eye, ListTodo, Pencil, Plus, Trash2 } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { DueLabel, PriorityBadge, TaskStatusBadge } from '@/components/badges'
import { Avatar } from '@/components/ui/Avatar'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/form'
import { SearchInput, Toolbar } from '@/components/ui/misc'
import { Pagination } from '@/components/ui/Pagination'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states'
import { FilterTabs } from '@/components/ui/Tabs'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import { FILL_HEIGHT } from '@/components/layout/fill-height'
import { useMe } from '@/features/auth/queries'
import { useProjectContext } from '@/features/projects/project-context'
import { usePagination } from '@/hooks/usePagination'
import { PRIORITY, PRIORITY_LEVELS } from '@/lib/domain'
import { can } from '@/lib/permissions'
import type { Task } from '@/types/api'
import { byUrgency, filterTasks, statusTabs, type PriorityFilter, type StatusFilter } from '@/features/tasks/filters'
import { useDeleteTask, useTasks } from '@/features/tasks/queries'

export function ProjectTasksPage() {
  const { project, role, peopleById } = useProjectContext()
  const me = useMe()
  const navigate = useNavigate()
  const { data: tasks, isPending, error, refetch } = useTasks(project.id)
  const deleteTask = useDeleteTask(project.id)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [priority, setPriority] = useState<PriorityFilter>('all')
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search)
  const [toDelete, setToDelete] = useState<Task | null>(null)

  const sorted = useMemo(() => (tasks ?? []).toSorted(byUrgency), [tasks])
  const filtered = useMemo(() => filterTasks(sorted, { status, priority, q }), [sorted, status, priority, q])
  const pagination = usePagination(filtered, 10)
  const base = `/projects/${project.id}/tasks`

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">Tasks</h2>
          <p className="text-sm text-muted">Manage tasks for this project.</p>
        </div>
        {can.createTask(role) ? (
          <ButtonLink to={`${base}/new`} icon={<Plus className="size-4" />}>
            New Task
          </ButtonLink>
        ) : null}
      </div>

      <Card className={FILL_HEIGHT}>
        <div className="px-4 pt-1">
          <FilterTabs value={status} onChange={setStatus} options={statusTabs(tasks ?? [])} />
        </div>
        <Toolbar>
          <SearchInput
            placeholder="Search tasks…"
            aria-label="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs sm:flex-1"
          />
          <Select
            aria-label="Filter by priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityFilter)}
            className="sm:ml-auto sm:w-40"
          >
            <option value="all">All Priority</option>
            {PRIORITY_LEVELS.map((p) => (
              <option key={p} value={p}>
                {PRIORITY[p].label}
              </option>
            ))}
          </Select>
        </Toolbar>

        {isPending ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ListTodo />}
            title={tasks?.length ? 'No matching tasks' : 'No tasks yet'}
            description={tasks?.length ? 'Try a different filter.' : 'Break the project down into tasks to track progress.'}
            action={
              !tasks?.length && can.createTask(role) ? (
                <ButtonLink to={`${base}/new`} icon={<Plus className="size-4" />}>
                  New Task
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Title</Th>
                  <Th>Assignee</Th>
                  <Th>Status</Th>
                  <Th>Priority</Th>
                  <Th>Due Date</Th>
                  <Th className="w-12">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {pagination.pageItems.map((task) => {
                  const assignee = task.assigned_to ? peopleById.get(task.assigned_to) : undefined
                  return (
                    <Tr key={task.id} onClick={() => navigate(`${base}/${task.id}`)}>
                      <Td className="max-w-xs">
                        <Link
                          to={`${base}/${task.id}`}
                          className="line-clamp-1 font-medium hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {task.title}
                        </Link>
                      </Td>
                      <Td>
                        {assignee ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={assignee.name} src={assignee.avatarUrl} seed={assignee.id} size="xs" />
                            <span className="truncate text-muted">{assignee.name}</span>
                          </span>
                        ) : (
                          <span className="text-subtle">{task.assigned_to ? 'Former member' : 'Unassigned'}</span>
                        )}
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
                      <Td>
                        <RowMenu
                          items={[
                            { label: 'View', icon: <Eye />, onSelect: () => navigate(`${base}/${task.id}`) },
                            {
                              label: 'Edit',
                              icon: <Pencil />,
                              onSelect: () => navigate(`${base}/${task.id}/edit`),
                              hidden: !can.editTask(role, task, me.id),
                            },
                            {
                              label: 'Delete',
                              icon: <Trash2 />,
                              danger: true,
                              onSelect: () => setToDelete(task),
                              hidden: !can.deleteTask(role),
                            },
                          ]}
                        />
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

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete task"
        description={`“${toDelete?.title}” will be permanently deleted.`}
        confirmLabel="Delete task"
        loading={deleteTask.isPending}
        onConfirm={() => toDelete && deleteTask.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
