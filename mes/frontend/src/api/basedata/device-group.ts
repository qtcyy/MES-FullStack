import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { SpDevice, SpDeviceGroup, SpDeviceGroupDTO } from '@/types/device'

export function page(params: PageParams & { name?: string; code?: string }) {
  return client.post('/basedata/device-group/page', params) as Promise<PageResult<SpDeviceGroupDTO>>
}

export function getById(id: string) {
  return client.get(`/basedata/device-group/${id}`) as Promise<SpDeviceGroup>
}

// Uses @RequestBody JSON
export function addOrUpdate(record: Partial<SpDeviceGroup>) {
  return client.post('/basedata/device-group/add-or-update', record, {
    headers: { 'Content-Type': 'application/json' },
  })
}

// Uses @RequestBody JSON
export function deleteById(id: string) {
  return client.post('/basedata/device-group/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getGroupItems(groupId: string) {
  return client.get(`/basedata/device-group/items/${groupId}`) as Promise<SpDevice[]>
}

// Uses @RequestBody JSON
export function addGroupItems(groupId: string, deviceIds: string[]) {
  return client.post('/basedata/device-group/items/add', { groupId, deviceIds }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

// Uses @RequestBody JSON
export function removeGroupItem(groupId: string, deviceId: string) {
  return client.post('/basedata/device-group/items/remove', { groupId, deviceId }, {
    headers: { 'Content-Type': 'application/json' },
  })
}
