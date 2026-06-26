import { http } from '@/api/request'
import type { IPage } from '@/types/basedata'
import type { SpTeam, SpTeamDTO, TeamPageReq } from '@/types/team'
import type { SysUser } from '@/types/system'

/** 班组分页(form);记录含 userCount 等派生字段 */
export const teamPage = (req: TeamPageReq) =>
  http.post<IPage<SpTeamDTO>>('/admin/sys/team/page', req)

/** 单个(GET) */
export const teamGetById = (id: string) =>
  http.get<SpTeam>(`/admin/sys/team/${encodeURIComponent(id)}`)

/** 新增/编辑(form;后端 SpTeam record,非 @RequestBody) */
export const teamAddOrUpdate = (record: Partial<SpTeam>) =>
  http.post<string>('/admin/sys/team/add-or-update', record)

/** 软删(JSON;后端 @RequestBody {id},置 is_deleted='1') */
export const teamDelete = (id: string) =>
  http.post<void>('/admin/sys/team/delete', { id }, true)

/** 班组成员(GET) */
export const teamUsers = (teamId: string) =>
  http.get<SysUser[]>(`/admin/sys/team/users/${encodeURIComponent(teamId)}`)

/** 全部可选用户(is_deleted='0');候选池由前端 excludeSelected 排除已在组者 */
export const teamAvailableUsers = () =>
  http.get<SysUser[]>('/admin/sys/team/available-users')

/** 批量加成员(JSON;{teamId,userIds});后端按 (team_id,user_id) 去重 */
export const teamUsersAdd = (teamId: string, userIds: string[]) =>
  http.post<void>('/admin/sys/team/users/add', { teamId, userIds }, true)

/** 移除单个成员(JSON;{teamId,userId}) */
export const teamUserRemove = (teamId: string, userId: string) =>
  http.post<void>('/admin/sys/team/users/remove', { teamId, userId }, true)
