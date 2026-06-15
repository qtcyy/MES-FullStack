import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SysMenu, TreeVO } from '@/types/menu'

export function page(params: PageParams & { nameLike?: string }) {
  return client.post('/admin/sys/menu/page', params) as Promise<PageResult<SysMenu>>
}

export function tree() {
  return client.get('/admin/sys/menu/tree') as Promise<TreeVO<SysMenu>[]>
}

export function getById(id: string) {
  return client.get('/admin/sys/menu/get-by-id', { params: { id } })
}

export function addOrUpdate(record: SysMenu) {
  return client.post('/admin/sys/menu/add-or-update', record)
}

export function deleteById(id: string) {
  return client.post('/admin/sys/menu/delete', { id })
}
