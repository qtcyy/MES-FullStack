import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { DispatchableOrder, OrderDispatch, DispatchAssignDTO } from '@/types/dispatch'
import type { SpTeam } from '@/types/team'
import type { SysUser } from '@/types/user'

/** 分页查询待派工工单 */
export function page(params: PageParams & { orderCode?: string }) {
  return client.post('/order/dispatch/page', params) as Promise<PageResult<DispatchableOrder>>
}

/** 执行派工（JSON 请求体） */
export function assign(dto: DispatchAssignDTO) {
  return client.post('/order/dispatch/assign', dto, {
    headers: { 'Content-Type': 'application/json' },
  })
}

/** 查询工单派工详情 */
export function getByOrderId(orderId: string) {
  return client.get(`/order/dispatch/get-by-order/${orderId}`) as Promise<OrderDispatch>
}

/** 获取可用班组列表 */
export function getTeams() {
  return client.get('/order/dispatch/teams') as Promise<SpTeam[]>
}

/** 获取班组下的作业员列表 */
export function getTeamUsers(teamId: string) {
  return client.get(`/order/dispatch/team-users/${teamId}`) as Promise<SysUser[]>
}
