import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SysUser, SysUserDTO } from '@/types/user'

export function page(params: PageParams & { nameLike?: string; usernameLike?: string }) {
  return client.post('/admin/sys/user/page', params) as Promise<PageResult<SysUser>>
}

export function getById(id: string) {
  return client.get('/admin/sys/user/add-or-update-ui', { params: { id } })
}

export function addOrUpdate(record: SysUserDTO) {
  return client.post('/admin/sys/user/add-or-update', record)
}

export function deleteById(id: string) {
  return client.post('/admin/sys/user/delete', { id })
}
