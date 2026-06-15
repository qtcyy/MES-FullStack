import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SpComponent } from '@/types/component'

export function page(params: PageParams & { name?: string; code?: string }) {
  return client.post('/basedata/component/page', params) as Promise<PageResult<SpComponent>>
}

export function addOrUpdate(record: Partial<SpComponent>) {
  return client.post('/basedata/component/add-or-update', record)
}

export function deleteById(id: string) {
  return client.post('/basedata/component/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}
