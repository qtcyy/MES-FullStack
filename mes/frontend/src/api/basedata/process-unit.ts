import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SpProcessUnit, SpProcessUnitDTO } from '@/types/process-unit'
import type { SpTeam } from '@/types/team'

export function page(params: PageParams & { name?: string; code?: string }) {
  return client.post('/basedata/process-unit/page', params) as Promise<PageResult<SpProcessUnitDTO>>
}

export function getById(id: string) {
  return client.get(`/basedata/process-unit/${id}`) as Promise<SpProcessUnit>
}

// @RequestBody JSON
export function addOrUpdate(record: Partial<SpProcessUnit>) {
  return client.post('/basedata/process-unit/add-or-update', record, {
    headers: { 'Content-Type': 'application/json' },
  })
}

// @RequestBody JSON
export function deleteById(id: string) {
  return client.post('/basedata/process-unit/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getTeams(unitId: string) {
  return client.get(`/basedata/process-unit/teams/${unitId}`) as Promise<SpTeam[]>
}

// @RequestBody JSON
export function addTeam(unitId: string, teamId: string) {
  return client.post('/basedata/process-unit/teams/add', { unitId, teamId }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

// @RequestBody JSON
export function removeTeam(unitId: string, teamId: string) {
  return client.post('/basedata/process-unit/teams/remove', { unitId, teamId }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getAllTeams() {
  // Get all teams via the team API
  return client.post('/admin/sys/team/page', { current: 1, size: 999 }) as Promise<PageResult<SpTeam>>
}
