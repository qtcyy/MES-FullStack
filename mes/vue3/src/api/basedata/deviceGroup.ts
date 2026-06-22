import { http } from '@/api/request'
import type { SpDeviceGroup, DeviceGroupPageReq, SpDevice, IPage } from '@/types/basedata'

export const deviceGroupPage = (req: DeviceGroupPageReq) =>
  http.post<IPage<SpDeviceGroup>>('/basedata/device-group/page', req)

export const deviceGroupGetById = (id: string) =>
  http.get<SpDeviceGroup>(`/basedata/device-group/${encodeURIComponent(id)}`)

export const deviceGroupAddOrUpdate = (dto: Partial<SpDeviceGroup>) =>
  http.post<string>('/basedata/device-group/add-or-update', dto, true)

export const deviceGroupDelete = (id: string) =>
  http.post<void>('/basedata/device-group/delete', { id }, true)

export const deviceGroupItems = (groupId: string) =>
  http.get<SpDevice[]>(`/basedata/device-group/items/${encodeURIComponent(groupId)}`)

export const deviceGroupItemsAdd = (groupId: string, deviceIds: string[]) =>
  http.post<void>('/basedata/device-group/items/add', { groupId, deviceIds }, true)

export const deviceGroupItemsRemove = (groupId: string, deviceId: string) =>
  http.post<void>('/basedata/device-group/items/remove', { groupId, deviceId }, true)
