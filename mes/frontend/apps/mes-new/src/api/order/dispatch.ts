import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { DispatchableOrder, SpDispatchAssign, SpTeamOption, TeamUserOption } from '@/types/order'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface DispatchPageParams extends PageParams {
  orderCode?: string
}

/** 待派工工单分页(表单编码;后端只返回 statue=0) */
export function dispatchPage(params: DispatchPageParams) {
  return http.post<PageResult<DispatchableOrder>>('/order/dispatch/page', params)
}

/** 执行派工(@RequestBody JSON) */
export function dispatchAssign(body: SpDispatchAssign) {
  return http.post<void>('/order/dispatch/assign', body, JSON_HEADERS)
}

/** 班组下拉 */
export function dispatchTeams() {
  return http.get<SpTeamOption[]>('/order/dispatch/teams')
}

/** 班组下作业员 */
export function dispatchTeamUsers(teamId: string) {
  return http.get<TeamUserOption[]>(`/order/dispatch/team-users/${encodeURIComponent(teamId)}`)
}
