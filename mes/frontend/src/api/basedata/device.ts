import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SpDevice, SpDeviceDTO } from '@/types/device'

export function page(params: PageParams & { name?: string; code?: string; type?: string }) {
  return client.post('/basedata/device/page', params) as Promise<PageResult<SpDeviceDTO>>
}

export function getById(id: string) {
  return client.get(`/basedata/device/${id}`) as Promise<SpDevice>
}

// Uses @RequestBody JSON
export function addOrUpdate(record: Partial<SpDevice>) {
  return client.post('/basedata/device/add-or-update', record, {
    headers: { 'Content-Type': 'application/json' },
  })
}

// Uses @RequestBody JSON
export function deleteById(id: string) {
  return client.post('/basedata/device/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}
