import { Eye, Users } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { Pagination } from '@/components/ui/Pagination'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import { FILL_HEIGHT } from '@/components/layout/fill-height'
import { useMe } from '@/features/auth/queries'
import { usePagination } from '@/hooks/usePagination'
import { formatDate } from '@/lib/format'
import { useUsers } from '@/features/users/queries'

export function UsersPage() {
  const me = useMe()
  const navigate = useNavigate()
  const { data: users, isPending, error, refetch } = useUsers()
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    const list = users ?? []
    return query
      ? list.filter((u) => u.full_name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
      : list
  }, [users, q])
  const pagination = usePagination(filtered, 10)

  const profilePath = (id: string) => (id === me.id ? '/profile' : `/users/${id}`)

  return (
    <>
      <PageHeader title="Users" description="Everyone registered on the platform." />
      <Card className={FILL_HEIGHT}>
        <Toolbar>
          <SearchInput
            placeholder="Search users…"
            aria-label="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs sm:flex-1"
          />
          {users ? <p className="text-sm text-muted sm:ml-auto">{users.length} users</p> : null}
        </Toolbar>

        {isPending ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users />} title="No users found" description="Try a different search." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Joined At</Th>
                  <Th className="w-12">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {pagination.pageItems.map((user) => (
                  <Tr key={user.id} onClick={() => navigate(profilePath(user.id))}>
                    <Td>
                      <Link
                        to={profilePath(user.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-3 font-medium hover:text-primary"
                      >
                        <Avatar name={user.full_name} src={user.profile?.avatar_url} seed={user.id} size="sm" />
                        <span className="truncate">
                          {user.full_name}
                          {user.id === me.id ? <span className="ml-1.5 text-xs font-normal text-muted">(you)</span> : null}
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-muted">{user.email}</Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(user.created_at)}</Td>
                    <Td>
                      <RowMenu
                        items={[{ label: 'View profile', icon: <Eye />, onSelect: () => navigate(profilePath(user.id)) }]}
                      />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination {...pagination} onPageChange={pagination.setPage} />
          </>
        )}
      </Card>
    </>
  )
}
