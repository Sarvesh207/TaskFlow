import { ChevronRight, FolderKanban, Mail } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ProjectStatusBadge, RoleBadge } from '@/components/badges'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { ProjectTile } from '@/components/ui/misc'
import { EmptyState, ErrorState, PageLoader, Skeleton } from '@/components/ui/states'
import { FilterTabs } from '@/components/ui/Tabs'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import { useMe } from '@/features/auth/queries'
import { useMembersOf } from '@/features/members/queries'
import { useProjects } from '@/features/projects/queries'
import { useTasksAcross } from '@/features/tasks/queries'
import { projectTile } from '@/lib/domain'
import { formatDate } from '@/lib/format'
import { getProjectRole } from '@/lib/permissions'
import type { MemberRole, Project } from '@/types/api'
import { useUser } from '@/features/users/queries'

type Tab = 'overview' | 'projects'

export function UserProfilePage() {
  const { userId } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const { data: user, error, refetch } = useUser(userId)
  const [tab, setTab] = useState<Tab>('overview')

  // The API has no "projects of user X" endpoint; derive it from the projects we share.
  const projects = useProjects()
  const members = useMembersOf(projects.data?.map((p) => p.id) ?? [])
  const shared = useMemo(() => {
    const list: { project: Project; role: MemberRole; joinedAt: string | null }[] = []
    for (const project of projects.data ?? []) {
      const projectMembers = members.byProject.get(project.id)
      const role = getProjectRole(project, projectMembers, userId)
      if (!role) continue
      const joinedAt =
        role === 'owner' ? project.created_at : (projectMembers?.find((m) => m.user_id === userId)?.created_at ?? null)
      list.push({ project, role, joinedAt })
    }
    return list
  }, [projects.data, members.byProject, userId])
  const sharedProjects = useMemo(() => shared.map((s) => s.project), [shared])
  const tasks = useTasksAcross(sharedProjects)
  const assignedCount = tasks.tasks.filter((t) => t.assigned_to === userId).length

  if (userId === me.id) return <Navigate to="/profile" replace />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!user) return <PageLoader />

  const loadingShared = projects.isPending || members.isPending
  const stat = (v: ReactNode, loading: boolean) => (loading ? <Skeleton className="h-6 w-10" /> : v)

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/users" className="hover:text-fg">
          Users
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-fg">{user.full_name}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={user.full_name} src={user.profile?.avatar_url} seed={user.id} size="lg" className="size-20 text-2xl" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{user.full_name}</h1>
          <a href={`mailto:${user.email}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
            <Mail className="size-3.5" aria-hidden />
            {user.email}
          </a>
        </div>
      </div>

      <FilterTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'projects', label: 'Projects', count: loadingShared ? undefined : shared.length },
        ]}
      />

      {tab === 'overview' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <InfoTile label="Joined At">{formatDate(user.created_at)}</InfoTile>
            <InfoTile label="Last Updated">{formatDate(user.updated_at)}</InfoTile>
            <InfoTile label="Shared Projects">{stat(shared.length, loadingShared)}</InfoTile>
            <InfoTile label="Assigned Tasks">{stat(assignedCount, loadingShared || tasks.isPending)}</InfoTile>
          </div>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-fg">Bio</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
              {user.profile?.bio || 'No bio yet.'}
            </p>
            {user.profile?.phone ? (
              <p className="mt-4 text-sm text-muted">
                <span className="text-fg">Phone:</span> {user.profile.phone}
              </p>
            ) : null}
          </Card>
        </div>
      ) : (
        <Card>
          {loadingShared ? (
            <PageLoader />
          ) : shared.length === 0 ? (
            <EmptyState
              icon={<FolderKanban />}
              title="No shared projects"
              description={`You and ${user.full_name} are not on any project together.`}
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Project Name</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Joined At</Th>
                </tr>
              </THead>
              <TBody>
                {shared.map(({ project, role, joinedAt }) => (
                  <Tr key={project.id} onClick={() => navigate(`/projects/${project.id}`)}>
                    <Td>
                      <Link
                        to={`/projects/${project.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-3 font-medium hover:text-primary"
                      >
                        <ProjectTile name={project.name} tileClass={projectTile(project.id)} size="sm" />
                        {project.name}
                      </Link>
                    </Td>
                    <Td>
                      <RoleBadge role={role} />
                    </Td>
                    <Td>
                      <ProjectStatusBadge status={project.status} />
                    </Td>
                    <Td className="text-muted">{formatDate(joinedAt)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  )
}

function InfoTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1.5 text-base font-medium text-fg">{children}</div>
    </Card>
  )
}
