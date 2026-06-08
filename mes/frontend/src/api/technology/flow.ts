import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { Flow } from '@/types/common'

export function page(params: PageParams & { flow?: string; flowDesc?: string }) {
  return client.post('/basedata/flow/page', params) as Promise<PageResult<Flow>>
}

export function getById(id: string) {
  return client.get('/basedata/flow/get-by-id', { params: { id } })
}

// Flow process add-or-update (also used for Flow create/edit)
// Uses @RequestBody JSON — explicitly set Content-Type to application/json
export function addOrUpdate(record: Record<string, unknown>) {
  return client.post('/basedata/flow/process/add-or-update', record, {
    headers: { 'Content-Type': 'application/json' },
  })
}

// Get flow list for dropdown selects
export function flowList() {
  return client.get('/basedata/flow/list') as Promise<Flow[]>
}

// Delete flow process
export function deleteById(id: string) {
  return client.post('/basedata/flow/process/delete', { id })
}
