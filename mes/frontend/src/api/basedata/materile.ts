import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { Materiel } from '@/types/common'

export function page(params: PageParams & { materiel?: string; materielDesc?: string }) {
  return client.post('/basedata/materiel/page', params) as Promise<PageResult<Materiel>>
}

export function getById(id: string) {
  return client.get('/basedata/materiel/add-or-update-ui', { params: { id } })
}

export function addOrUpdate(record: Record<string, unknown>) {
  return client.post('/basedata/materiel/add-or-update', record)
}
