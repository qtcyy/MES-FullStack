import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SpTeam, SpTeamDTO } from '@/types/team'
import type { SysUser } from '@/types/user'

export function page(params: PageParams & { name?: string; code?: string }) {
  return client.post('/admin/sys/team/page', params) as Promise<PageResult<SpTeamDTO>>
}

export function getById(id: string) {
  return client.get(`/admin/sys/team/${id}`) as Promise<SpTeam>
}

export function addOrUpdate(record: Partial<SpTeam>) {
  return client.post('/admin/sys/team/add-or-update', record)
}

// Uses @RequestBody JSON — explicitly set Content-Type to application/json
export function deleteById(id: string) {
  return client.post('/admin/sys/team/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getTeamUsers(teamId: string) {
  return client.get(`/admin/sys/team/users/${teamId}`) as Promise<SysUser[]>
}

// Uses @RequestBody JSON — explicitly set Content-Type to application/json
export function addTeamUsers(teamId: string, userIds: string[]) {
  return client.post('/admin/sys/team/users/add', { teamId, userIds }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

// Uses @RequestBody JSON — explicitly set Content-Type to application/json
export function removeTeamUser(teamId: string, userId: string) {
  return client.post('/admin/sys/team/users/remove', { teamId, userId }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getAvailableUsers() {
  return client.get('/admin/sys/team/available-users') as Promise<SysUser[]>
}
