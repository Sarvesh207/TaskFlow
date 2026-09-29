import { describe, expect, it } from 'vitest'
import type { MemberRole, ProjectMember } from '@/types/api'
import { can, getProjectRole, PERMISSION_MATRIX } from './permissions'

const OWNER = 'owner-id'
const project = { owner_id: OWNER }
const members = [
  { user_id: 'admin-id', role: 'admin' },
  { user_id: 'member-id', role: 'member' },
] as ProjectMember[]

describe('getProjectRole', () => {
  it('identifies the owner from owner_id, not the member list', () => {
    expect(getProjectRole(project, [], OWNER)).toBe('owner')
  })

  it('reads other roles from the member list', () => {
    expect(getProjectRole(project, members, 'admin-id')).toBe('admin')
    expect(getProjectRole(project, members, 'member-id')).toBe('member')
    expect(getProjectRole(project, members, 'stranger')).toBeNull()
    expect(getProjectRole(undefined, members, OWNER)).toBeNull()
  })
})

describe('can', () => {
  const roles: MemberRole[] = ['owner', 'admin', 'member']

  it('matches the permission matrix shown to users', () => {
    const row = (label: string) => PERMISSION_MATRIX.find((r) => r.label === label)!
    for (const role of roles) {
      expect(can.editProject(role)).toBe(row('Edit project details')[role])
      expect(can.deleteProject(role)).toBe(row('Delete project')[role])
      expect(can.manageMembers(role)).toBe(row('Manage members')[role])
      expect(can.createTask(role)).toBe(row('Create tasks')[role])
      expect(can.assignTask(role)).toBe(row('Assign tasks & set priority')[role])
      expect(can.deleteTask(role)).toBe(row('Delete tasks')[role])
      expect(can.editTask(role, { assigned_to: 'someone-else' }, 'me')).toBe(row('Edit any task')[role])
      expect(can.editTask(role, { assigned_to: 'me' }, 'me')).toBe(row('Edit own assigned tasks')[role])
    }
  })

  it('denies everything to non-members', () => {
    expect(can.createTask(null)).toBe(false)
    expect(can.editTask(null, { assigned_to: 'me' }, 'me')).toBe(false)
  })

  it('never lets anyone remove the owner; members may remove only themselves', () => {
    expect(can.removeMember('owner', OWNER, OWNER, OWNER)).toBe(false)
    expect(can.removeMember('admin', 'member-id', 'admin-id', OWNER)).toBe(true)
    expect(can.removeMember('member', 'admin-id', 'member-id', OWNER)).toBe(false)
    expect(can.removeMember('member', 'member-id', 'member-id', OWNER)).toBe(true)
  })
})
