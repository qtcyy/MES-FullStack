import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SysDict } from '@/types/user'

export function page(params: PageParams & { nameLike?: string }) {
  return client.post('/admin/sys/dict/page', params) as Promise<PageResult<SysDict>>
}

export function getById(id: string) {
  return client.get('/admin/sys/dict/get-by-id', { params: { id } })
}

export function addOrUpdate(record: SysDict) {
  return client.post('/admin/sys/dict/add-or-update', record)
}

export function deleteById(id: string) {
  return client.post('/admin/sys/dict/delete', { id })
}
