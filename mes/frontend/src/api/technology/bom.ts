import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { Bom } from '@/types/common'

export function page(params: PageParams & { materielCode?: string; materielCodeLike?: string }) {
  return client.post('/technology/bom/page', params) as Promise<PageResult<Bom>>
}

export function getById(id: string) {
  return client.get('/technology/bom/get-by-id', { params: { id } })
}

export function addOrUpdate(record: Record<string, unknown>) {
  return client.post('/technology/bom/add-or-update', record)
}

export function deleteById(id: string) {
  return client.post('/technology/bom/delete', { id })
}
