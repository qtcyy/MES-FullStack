import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SysDepartment } from '@/types/user'

export function page(params: PageParams & { nameLike?: string }) {
  return client.post('/admin/sys/department/page', params) as Promise<PageResult<SysDepartment>>
}

export function getById(id: string) {
  return client.get('/admin/sys/department/get-by-id', { params: { id } })
}

export function addOrUpdate(record: SysDepartment) {
  return client.post('/admin/sys/department/add-or-update', record)
}

export function deleteById(id: string) {
  return client.post('/admin/sys/department/delete', { id })
}
