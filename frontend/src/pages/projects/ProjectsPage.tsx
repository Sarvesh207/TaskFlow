import { ExternalLink, FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react'
import { Suspense, useDeferredValue, useMemo, useState } from 'react'
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router'
import { ProjectStatusBadge } from '@/components/badges'
import { AvatarStack } from '@/components/ui/Avatar'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/form'
import { PageHeader, ProjectTile, SearchInput, Toolbar } from '@/components/ui/misc'
import { Pagination } from '@/components/ui/Pagination'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from '@/components/ui/states'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import { FILL_HEIGHT } from '@/components/layout/fill-height'
import { useMe } from '@/features/auth/queries'
import { useMembersOf } from '@/features/members/queries'
import { useUserDirectory } from '@/features/users/queries'
import { usePagination } from '@/hooks/usePagination'
import { PROJECT_STATUS, PROJECT_STATUSES, projectTile } from '@/lib/domain'
import { formatDate } from '@/lib/format'
import type { Project, ProjectStatus } from '@/types/api'
import { useDeleteProject, useProjects } from '@/features/projects/queries'

export function ProjectsPage() {
  const me = useMe()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all')
  const [toDelete, setToDelete] = useState<Project | null>(null)

  const { data: projects, isPending, error, refetch } = useProjects()
  const directory = useUserDirectory()
  const members = useMembersOf(projects?.map((p) => p.id) ?? [])
  const deleteProject = useDeleteProject()

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return (projects ?? []).filter(
      (p) =>
        (status === 'all' || p.status === status) &&
        (!q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)),
    )
  }, [projects, deferredSearch, status])

  const pagination = usePagination(filtered, 10)

  function setSearch(value: string) {
    setParams(value ? { q: value } : {}, { replace: true })
  }

  function peopleFor(project: Project) {
    const owner = directory.map.get(project.owner_id)
    const list = [
      { id: project.owner_id, name: owner?.full_name ?? 'Owner', src: owner?.profile?.avatar_url },
      ...(members.byProject.get(project.id) ?? [])
        .filter((m) => m.user_id !== project.owner_id)
        .map((m) => ({ id: m.user_id, name: m.users.full_name, src: directory.map.get(m.user_id)?.profile?.avatar_url })),
    ]
    return list
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Manage and organize your projects."
        actions={
          <ButtonLink to="/projects/new" icon={<Plus className="size-4" />}>
            New Project
          </ButtonLink>
        }
      />

      <Card className={FILL_HEIGHT}>
        <Toolbar>
          <SearchInput
            placeholder="Search projects…"
            aria-label="Search projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs sm:flex-1"
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus | 'all')}
            className="sm:ml-auto sm:w-44"
          >
            <option value="all">All Status</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS[s].label}
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
            icon={<FolderKanban />}
            title={projects?.length ? 'No matching projects' : 'No projects yet'}
            description={
              projects?.length ? 'Try a different search or status filter.' : 'Create your first project to start organizing work.'
            }
            action={
              projects?.length ? undefined : (
                <ButtonLink to="/projects/new" icon={<Plus className="size-4" />}>
                  New Project
                </ButtonLink>
              )
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Name</Th>
                  <Th className="hidden md:table-cell">Description</Th>
                  <Th>Status</Th>
                  <Th>Members</Th>
                  <Th>Created At</Th>
                  <Th className="w-12">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {pagination.pageItems.map((project) => {
                  const isOwner = project.owner_id === me.id
                  return (
                    <Tr key={project.id} onClick={() => navigate(`/projects/${project.id}`)}>
                      <Td>
                        <Link
                          to={`/projects/${project.id}`}
                          className="flex items-center gap-3 font-medium hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ProjectTile name={project.name} tileClass={projectTile(project.id)} size="sm" />
                          <span className="truncate">{project.name}</span>
                        </Link>
                      </Td>
                      <Td className="hidden max-w-xs md:table-cell">
                        <span className="line-clamp-2 text-muted">{project.description || '—'}</span>
                      </Td>
                      <Td>
                        <ProjectStatusBadge status={project.status} />
                      </Td>
                      <Td>
                        {members.byProject.get(project.id) ? (
                          <AvatarStack people={peopleFor(project)} />
                        ) : (
                          <Skeleton className="h-6 w-16 rounded-full" />
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-muted">{formatDate(project.created_at)}</Td>
                      <Td>
                        <RowMenu
                          items={[
                            { label: 'Open', icon: <ExternalLink />, onSelect: () => navigate(`/projects/${project.id}`) },
                            { label: 'Edit', icon: <Pencil />, onSelect: () => navigate(`/projects/${project.id}/settings`), hidden: !isOwner },
                            { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => setToDelete(project), hidden: !isOwner },
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
        title="Delete project"
        description="This permanently deletes the project, its tasks and memberships. This cannot be undone."
        confirmText={toDelete?.name}
        confirmLabel="Delete project"
        loading={deleteProject.isPending}
        onConfirm={() => toDelete && deleteProject.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
      {/* Child routes are modals over this page (…/new, …/edit). */}
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </>
  )
}
