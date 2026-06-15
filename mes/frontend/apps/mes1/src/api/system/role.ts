import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SysRole } from '@/types/user'

export function page(params: PageParams & { nameLike?: string }) {
  return client.post('/admin/sys/role/page', params) as Promise<PageResult<SysRole>>
}

export function getById(id: string) {
  return client.get('/admin/sys/role/get-by-id', { params: { id } })
}

export function addOrUpdate(record: SysRole & { sysMenuIds?: string[] }) {
  return client.post('/admin/sys/role/add-or-update', record)
}

export function deleteById(id: string) {
  return client.post('/admin/sys/role/delete', { id })
}

export function getRoleMenuTree(roleId: string) {
  return client.get(`/admin/sys/role/tree/${roleId}`) as Promise<string[]>
}
