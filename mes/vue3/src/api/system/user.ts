import { http } from '@/api/request'
import type { SysUser, SysUserDTO, SysUserPageReq, IPage } from '@/types/system'

export const userPage = (req: SysUserPageReq) => http.post<IPage<SysUser>>('/admin/sys/user/page', req)
export const userGetById = (id: string) => http.get<SysUser>('/admin/sys/user/get-by-id', { id })
export const userAddOrUpdate = (dto: SysUserDTO) => http.post<string>('/admin/sys/user/add-or-update', dto)
export const userDelete = (id: string) => http.post<string>('/admin/sys/user/delete', { id })
