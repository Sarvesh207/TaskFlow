import { ChevronRight, Pencil, Settings, Trash2, UserPlus } from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router'
import { ProjectStatusBadge } from '@/components/badges'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProjectTile } from '@/components/ui/misc'
import { RowMenu } from '@/components/ui/RowMenu'
import { ErrorState, PageLoader } from '@/components/ui/states'
import { LinkTabs } from '@/components/ui/Tabs'
import { useMe } from '@/features/auth/queries'
import { useMembers } from '@/features/members/queries'
import { useUserDirectory } from '@/features/users/queries'
import { projectTile } from '@/lib/domain'
import { can, getProjectRole } from '@/lib/permissions'
import type { ProjectContext, ProjectPerson } from '@/features/projects/project-context'
import { useDeleteProject, useProject } from '@/features/projects/queries'

export function ProjectLayout() {
  const { projectId } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const projectQuery = useProject(projectId)
  const membersQuery = useMembers(projectId)
  const directory = useUserDirectory()
  const deleteProject = useDeleteProject()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const project = projectQuery.data
  const members = membersQuery.data

  const context = useMemo<ProjectContext | null>(() => {
    if (!project || !members) return null
    const ownerUser = directory.map.get(project.owner_id)
    const owner: ProjectPerson = {
      id: project.owner_id,
      name: ownerUser?.full_name ?? 'Project owner',
      email: ownerUser?.email ?? '',
      role: 'owner',
      joinedAt: project.created_at,
      avatarUrl: ownerUser?.profile?.avatar_url ?? null,
    }
    const people: ProjectPerson[] = [
      owner,
      ...members
        .filter((m) => m.user_id !== project.owner_id)
        .map((m) => ({
          id: m.user_id,
          name: m.users.full_name,
          email: m.users.email,
          role: m.role,
          joinedAt: m.created_at,
          avatarUrl: directory.map.get(m.user_id)?.profile?.avatar_url ?? null,
        })),
    ]
    return {
      project,
      members,
      people,
      peopleById: new Map(people.map((p) => [p.id, p])),
      role: getProjectRole(project, members, me.id),
      owner,
      requestDelete: () => setConfirmDelete(true),
    }
  }, [project, members, directory.map, me.id])

  const error = projectQuery.error ?? membersQuery.error
  if (error) return <ErrorState error={error} onRetry={() => projectQuery.refetch()} />
  if (!context || !project) return <PageLoader />

  const base = `/projects/${project.id}`

  return (
    <div>
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/projects" className="hover:text-fg">
          Projects
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-fg">{project.name}</span>
      </nav>

      <div className="mb-6 flex items-start gap-4">
        <ProjectTile name={project.name} tileClass={projectTile(project.id)} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-fg">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{project.description}</p>
          ) : null}
        </div>
        <RowMenu
          label="Project actions"
          items={[
            { label: 'Add member', icon: <UserPlus />, onSelect: () => navigate(`${base}/members?add=1`), hidden: !can.manageMembers(context.role) },
            { label: 'Edit project', icon: <Pencil />, onSelect: () => navigate(`${base}/settings`), hidden: !can.editProject(context.role) },
            { label: 'Project settings', icon: <Settings />, onSelect: () => navigate(`${base}/settings`) },
            { label: 'Delete project', icon: <Trash2 />, danger: true, onSelect: () => setConfirmDelete(true), hidden: !can.deleteProject(context.role) },
          ]}
        />
      </div>

      <div className="mb-6">
        <LinkTabs
          tabs={[
            { to: base, label: 'Overview', end: true },
            { to: `${base}/tasks`, label: 'Tasks' },
            { to: `${base}/members`, label: 'Members' },
            { to: `${base}/settings`, label: 'Settings' },
          ]}
        />
      </div>

      <Suspense fallback={<PageLoader />}>
        <Outlet context={context} />
      </Suspense>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete project"
        description="This permanently deletes the project, its tasks and memberships. This cannot be undone."
        confirmText={project.name}
        confirmLabel="Delete project"
        loading={deleteProject.isPending}
        onConfirm={() =>
          deleteProject.mutate(project.id, {
            onSuccess: () => navigate('/projects', { replace: true }),
          })
        }
      />
    </div>
  )
}
