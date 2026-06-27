// apps/mes-new/src/api/system/role.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SysRole, SysRoleDTO } from '@/types/system'

export interface RolePageParams extends PageParams {
  nameLike?: string
}

export function rolePage(params: RolePageParams) {
  return http.post<PageResult<SysRole>>('/admin/sys/role/page', params)
}

/** 新增/编辑(含 sysMenuIds 授权) */
export function roleAddOrUpdate(record: SysRoleDTO) {
  return http.post<void>('/admin/sys/role/add-or-update', record)
}

/** 软删除角色(后端 /delete 仅需 id,置 is_deleted='1') */
export function roleDelete(id: string) {
  return http.post<void>('/admin/sys/role/delete', { id })
}

/** 获取角色已授权菜单 id 列表 */
export function roleMenuTree(roleId: string) {
  return http.get<string[]>(`/admin/sys/role/tree/${roleId}`)
}
