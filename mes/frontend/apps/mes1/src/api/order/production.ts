import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { ProductionOrder, GanttItem } from '@/types/common'

export function page(params: PageParams & { orderCode?: string; materiel?: string }) {
  return client.post('/order/release/page', params) as Promise<PageResult<ProductionOrder>>
}

export function getById(id: string) {
  return client.get('/order/release/get-by-id', { params: { id } })
}

export function addOrUpdate(record: Record<string, unknown>) {
  return client.post('/order/release/add-or-update', record)
}

export function deleteById(id: string) {
  return client.post('/order/release/delete', { id })
}

export function ganttList(params: PageParams) {
  return client.post('/order/release/gantt/list', params) as Promise<PageResult<GanttItem>>
}
