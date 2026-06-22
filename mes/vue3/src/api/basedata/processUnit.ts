import { http } from '@/api/request'
import type { SpProcessUnit, ProcessUnitPageReq } from '@/types/processUnit'
import type { IPage } from '@/types/basedata'
import type { SpTeam } from '@/types/team'

/** 分页(form) */
export const processUnitPage = (req: ProcessUnitPageReq) =>
  http.post<IPage<SpProcessUnit>>('/basedata/process-unit/page', req)

/** 单个(GET) */
export const processUnitGetById = (id: string) =>
  http.get<SpProcessUnit>(`/basedata/process-unit/${encodeURIComponent(id)}`)

/** 新增/编辑(JSON @RequestBody) */
export const processUnitAddOrUpdate = (dto: Partial<SpProcessUnit>) =>
  http.post<string>('/basedata/process-unit/add-or-update', dto, true)

/** 软删(JSON @RequestBody) */
export const processUnitDelete = (id: string) =>
  http.post<void>('/basedata/process-unit/delete', { id }, true)

/** 某加工单元已绑班组(GET) */
export const processUnitTeams = (unitId: string) =>
  http.get<SpTeam[]>(`/basedata/process-unit/teams/${encodeURIComponent(unitId)}`)

/** 绑定班组(JSON {unitId,teamId};后端按 unit_id+team_id 去重) */
export const processUnitTeamAdd = (unitId: string, teamId: string) =>
  http.post<void>('/basedata/process-unit/teams/add', { unitId, teamId }, true)

/** 解绑班组(JSON {unitId,teamId}) */
export const processUnitTeamRemove = (unitId: string, teamId: string) =>
  http.post<void>('/basedata/process-unit/teams/remove', { unitId, teamId }, true)
