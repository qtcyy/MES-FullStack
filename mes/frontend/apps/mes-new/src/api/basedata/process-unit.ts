import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpProcessUnitDTO, SpTeam } from '@/types/process-unit'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface ProcessUnitPageParams extends PageParams {
  name?: string
  code?: string
}

export function processUnitPage(params: ProcessUnitPageParams) {
  return http.post<PageResult<SpProcessUnitDTO>>('/basedata/process-unit/page', params)
}

export function processUnitAddOrUpdate(record: Partial<SpProcessUnitDTO>) {
  return http.post<string>('/basedata/process-unit/add-or-update', record, JSON_HEADERS)
}

export function processUnitDelete(id: string) {
  return http.post<void>('/basedata/process-unit/delete', { id }, JSON_HEADERS)
}

export function processUnitTeams(unitId: string) {
  return http.get<SpTeam[]>(`/basedata/process-unit/teams/${unitId}`)
}

export function processUnitTeamAdd(unitId: string, teamId: string) {
  return http.post<void>('/basedata/process-unit/teams/add', { unitId, teamId }, JSON_HEADERS)
}

export function processUnitTeamRemove(unitId: string, teamId: string) {
  return http.post<void>('/basedata/process-unit/teams/remove', { unitId, teamId }, JSON_HEADERS)
}
