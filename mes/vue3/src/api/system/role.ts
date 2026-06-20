import { http } from '@/api/request'
import type { SysRole, SysRoleDTO, SysRolePageReq, IPage } from '@/types/system'

export const rolePage = (req: SysRolePageReq) => http.post<IPage<SysRole>>('/admin/sys/role/page', req)
export const roleGetById = (id: string) => http.get<SysRole>('/admin/sys/role/get-by-id', { id })
export const roleAddOrUpdate = (dto: SysRoleDTO) => http.post<string>('/admin/sys/role/add-or-update', dto)
export const roleMenuIds = (roleId: string) => http.get<string[]>(`/admin/sys/role/tree/${roleId}`)
export const roleDelete = (id: string) => http.post<string>('/admin/sys/role/delete', { id })
