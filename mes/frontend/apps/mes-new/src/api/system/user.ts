import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SysUser, SysUserDTO } from '@/types/user'

export interface UserPageParams extends PageParams {
  nameLike?: string
  usernameLike?: string
}

export function userPage(params: UserPageParams) {
  return http.post<PageResult<SysUser>>('/admin/sys/user/page', params)
}

export function userGetById(id: string) {
  return http.get<SysUser>('/admin/sys/user/get-by-id', { params: { id } })
}

export function userAddOrUpdate(record: SysUserDTO) {
  return http.post<void>('/admin/sys/user/add-or-update', record)
}

export function userDelete(id: string) {
  return http.post<void>('/admin/sys/user/delete', { id })
}
