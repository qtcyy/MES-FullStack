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

export function deleteById(id: string) {
  return client.post('/admin/sys/team/delete', { id })
}

export function getTeamUsers(teamId: string) {
  return client.get(`/admin/sys/team/users/${teamId}`) as Promise<SysUser[]>
}

export function addTeamUsers(teamId: string, userIds: string[]) {
  return client.post('/admin/sys/team/users/add', { teamId, userIds })
}

export function removeTeamUser(teamId: string, userId: string) {
  return client.post('/admin/sys/team/users/remove', { teamId, userId })
}

export function getAvailableUsers() {
  return client.get('/admin/sys/team/available-users') as Promise<SysUser[]>
}
