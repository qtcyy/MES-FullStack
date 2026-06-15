import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { Manager } from '@/types/common'

export function page(params: PageParams & { tableName?: string; tableDesc?: string }) {
  return client.post('/basedata/manager/page', params) as Promise<PageResult<Manager>>
}

export function getById(id: string) {
  return client.get('/basedata/manager/get-by-id', { params: { id } })
}

// addOrUpdate uses @RequestBody JSON — explicitly set Content-Type to application/json
export function addOrUpdate(record: Record<string, unknown>) {
  return client.post('/basedata/manager/add-or-update', record, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function deleteById(id: string) {
  return client.post('/basedata/manager/delete/by/tableNameId', { id })
}

// Dynamic common page for ManagerItemList
export function commonPage(params: {
  tableName: string
  tableNameId: string
  current: number
  size: number
}) {
  return client.post('/basedata/common/page', params) as Promise<
    PageResult<Record<string, string>>
  >
}
