import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpTeam } from '@/types/process-unit'
import type { SpTeamDTO } from '@/types/system'
import type { SysUser } from '@/types/user'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface TeamPageParams extends PageParams {
  name?: string
  code?: string
}

/** 班组分页(form 编码);记录含 userCount/lineName/workshopName。亦用于工艺单元绑定候选 */
export function teamPage(params: TeamPageParams) {
  return http.post<PageResult<SpTeamDTO>>('/admin/sys/team/page', params)
}

/** 新增/编辑班组(form 编码;后端 SpTeam record,非 @RequestBody) */
export function teamAddOrUpdate(record: SpTeam) {
  return http.post<string>('/admin/sys/team/add-or-update', record)
}

/** 软删除班组(JSON;后端 @RequestBody {id},置 is_deleted='1') */
export function teamDelete(id: string) {
  return http.post<void>('/admin/sys/team/delete', { id }, JSON_HEADERS)
}

/** 查询某班组成员 */
export function teamUsers(teamId: string) {
  return http.get<SysUser[]>(`/admin/sys/team/users/${teamId}`)
}

/** 全部可选用户(is_deleted='0');候选池由前端 excludeSelected 排除已在组者 */
export function teamAvailableUsers() {
  return http.get<SysUser[]>('/admin/sys/team/available-users')
}

/** 批量添加成员(JSON;{teamId,userIds});后端按 (team_id,user_id) 去重 */
export function teamUsersAdd(teamId: string, userIds: string[]) {
  return http.post<void>('/admin/sys/team/users/add', { teamId, userIds }, JSON_HEADERS)
}

/** 移除单个成员(JSON;{teamId,userId}) */
export function teamUserRemove(teamId: string, userId: string) {
  return http.post<void>('/admin/sys/team/users/remove', { teamId, userId }, JSON_HEADERS)
}
