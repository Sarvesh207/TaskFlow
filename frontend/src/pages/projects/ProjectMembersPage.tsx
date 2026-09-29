import { Eye, LogOut, Plus, ShieldCheck, UserMinus, Users } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { RoleBadge } from '@/components/badges'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SearchInput, Toolbar } from '@/components/ui/misc'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState } from '@/components/ui/states'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import { useMe } from '@/features/auth/queries'
import { useProjectContext, type ProjectPerson } from '@/features/projects/project-context'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { AddMemberModal } from '@/features/members/AddMemberModal'
import { MemberDetailsModal } from '@/features/members/MemberDetailsModal'
import { useRemoveMember } from '@/features/members/queries'
import { UpdateRoleModal } from '@/features/members/UpdateRoleModal'

export function ProjectMembersPage() {
  const { project, people, role } = useProjectContext()
  const me = useMe()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [editing, setEditing] = useState<ProjectPerson | null>(null)
  const [viewing, setViewing] = useState<ProjectPerson | null>(null)
  const [removing, setRemoving] = useState<ProjectPerson | null>(null)
  const remove = useRemoveMember(project.id)

  const canManage = can.manageMembers(role)
  const addOpen = canManage && params.get('add') === '1'
  const setAddOpen = (open: boolean) => setParams(open ? { add: '1' } : {}, { replace: true })

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return q ? people.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)) : people
  }, [people, deferredSearch])

  const canRemove = (person: ProjectPerson) => can.removeMember(role, person.id, me.id, project.owner_id)
  const isSelf = removing?.id === me.id

  return (
    <>
      <Card>
        <Toolbar>
          <SearchInput
            placeholder="Search members…"
            aria-label="Search members"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs sm:flex-1"
          />
          {canManage ? (
            <Button className="sm:ml-auto" icon={<Plus className="size-4" />} onClick={() => setAddOpen(true)}>
              Add Member
            </Button>
          ) : null}
        </Toolbar>

        {filtered.length === 0 ? (
          <EmptyState icon={<Users />} title="No members found" description="Try a different search." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Joined At</Th>
                <Th className="w-12">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {filtered.map((person) => (
                <Tr key={person.id} onClick={() => setViewing(person)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={person.name} src={person.avatarUrl} seed={person.id} size="sm" />
                      <span className="font-medium">
                        {person.name}
                        {person.id === me.id ? <span className="ml-1.5 text-xs font-normal text-muted">(you)</span> : null}
                      </span>
                    </div>
                  </Td>
                  <Td className="text-muted">{person.email}</Td>
                  <Td>
                    <RoleBadge role={person.role} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(person.joinedAt)}</Td>
                  <Td>
                    <RowMenu
                      items={[
                        { label: 'View details', icon: <Eye />, onSelect: () => setViewing(person) },
                        { label: 'View profile', icon: <Users />, onSelect: () => navigate(`/users/${person.id}`) },
                        {
                          label: 'Change role',
                          icon: <ShieldCheck />,
                          onSelect: () => setEditing(person),
                          hidden: !canManage || person.role === 'owner',
                        },
                        {
                          label: person.id === me.id ? 'Leave project' : 'Remove from project',
                          icon: person.id === me.id ? <LogOut /> : <UserMinus />,
                          danger: true,
                          onSelect: () => setRemoving(person),
                          hidden: !canRemove(person),
                        },
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {canManage ? <AddMemberModal open={addOpen} onOpenChange={setAddOpen} /> : null}
      <UpdateRoleModal person={editing} onClose={() => setEditing(null)} />
      <MemberDetailsModal
        person={viewing}
        onClose={() => setViewing(null)}
        onChangeRole={
          canManage
            ? (p) => {
                setViewing(null)
                setEditing(p)
              }
            : undefined
        }
        onRemove={(p) => {
          setViewing(null)
          setRemoving(p)
        }}
        canRemove={viewing ? canRemove(viewing) : false}
      />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={isSelf ? 'Leave project' : 'Remove member'}
        description={
          isSelf
            ? `You will lose access to “${project.name}”.`
            : `${removing?.name} will lose access to “${project.name}” and its tasks.`
        }
        confirmLabel={isSelf ? 'Leave project' : 'Remove'}
        loading={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.id, {
            onSuccess: () => {
              setRemoving(null)
              if (isSelf) navigate('/projects', { replace: true })
            },
          })
        }
      />
    </>
  )
}
