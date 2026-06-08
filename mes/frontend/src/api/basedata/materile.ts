import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { Materiel } from '@/types/common'

export function page(params: PageParams & { materiel?: string; materielDesc?: string }) {
  return client.post('/basedata/materile/page', params) as Promise<PageResult<Materiel>>
}

export function getById(id: string) {
  return client.get('/basedata/materile/get-by-id', { params: { id } })
}

export function addOrUpdate(record: Record<string, unknown>) {
  return client.post('/basedata/materile/add-or-update', record)
}
