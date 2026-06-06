import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

export function page(params: PageParams & { name?: string; code?: string }) {
  return client.post('/basedata/warehouse/page', params) as Promise<PageResult<SpWarehouse>>
}

// Uses @RequestBody JSON
export function addOrUpdate(record: Partial<SpWarehouse>) {
  return client.post('/basedata/warehouse/add-or-update', record, {
    headers: { 'Content-Type': 'application/json' },
  })
}

// Uses @RequestBody JSON
export function deleteById(id: string) {
  return client.post('/basedata/warehouse/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getList() {
  return client.get('/basedata/warehouse/list') as Promise<SpWarehouse[]>
}

export function getLocations(warehouseId: string) {
  return client.get(`/basedata/warehouse/locations/${warehouseId}`) as Promise<SpWarehouseLocation[]>
}
