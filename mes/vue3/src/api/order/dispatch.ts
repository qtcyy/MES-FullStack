import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type { DispatchableOrder, DispatchPageReq, SpDispatchAssign, SpTeamOption, TeamUserOption } from '@/types/order'

/** 待派工工单分页（form，后端仅返 statue=0） */
export const dispatchPage = (req: DispatchPageReq) =>
  http.post<IPage<DispatchableOrder>>('/order/dispatch/page', req)

/** 批量派工（JSON） */
export const dispatchAssign = (dto: SpDispatchAssign) =>
  http.post<void>('/order/dispatch/assign', dto, true)

/** 班组下拉（GET） */
export const dispatchTeams = () =>
  http.get<SpTeamOption[]>('/order/dispatch/teams')

/** 班组成员下拉（GET，级联） */
export const dispatchTeamUsers = (teamId: string) =>
  http.get<TeamUserOption[]>(`/order/dispatch/team-users/${encodeURIComponent(teamId)}`)
