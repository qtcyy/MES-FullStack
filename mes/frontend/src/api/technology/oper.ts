import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { Oper } from '@/types/common'

export function page(params: PageParams & { operDescLike?: string }) {
  return client.post('/basedata/sp-oper/page', params) as Promise<PageResult<Oper>>
}

export function list() {
  return client.get('/basedata/sp-oper/list') as Promise<Oper[]>
}

export function addOrUpdate(record: Record<string, unknown>) {
  return client.post('/basedata/sp-oper/add-or-update', record)
}

export function deleteById(id: string) {
  return client.post('/basedata/sp-oper/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getProcessUnits() {
  return client.get('/basedata/sp-oper/process-units') as Promise<{ id: string; code: string; name: string }[]>
}
