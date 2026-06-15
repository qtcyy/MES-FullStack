import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpDeviceGroupDTO, SpDevice } from '@/types/device'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface DeviceGroupPageParams extends PageParams {
  name?: string
  code?: string
}

export function deviceGroupPage(params: DeviceGroupPageParams) {
  return http.post<PageResult<SpDeviceGroupDTO>>('/basedata/device-group/page', params)
}

/** add-or-update 为 @RequestBody JSON */
export function deviceGroupAddOrUpdate(record: Partial<SpDeviceGroupDTO>) {
  return http.post<string>('/basedata/device-group/add-or-update', record, JSON_HEADERS)
}

/** delete 为 @RequestBody Map{id} */
export function deviceGroupDelete(id: string) {
  return http.post<void>('/basedata/device-group/delete', { id }, JSON_HEADERS)
}

/** 成员设备列表 */
export function deviceGroupItems(groupId: string) {
  return http.get<SpDevice[]>(`/basedata/device-group/items/${groupId}`)
}

/** 批量加入成员设备 */
export function deviceGroupItemsAdd(groupId: string, deviceIds: string[]) {
  return http.post<void>('/basedata/device-group/items/add', { groupId, deviceIds }, JSON_HEADERS)
}

/** 移除单个成员设备 */
export function deviceGroupItemsRemove(groupId: string, deviceId: string) {
  return http.post<void>('/basedata/device-group/items/remove', { groupId, deviceId }, JSON_HEADERS)
}

export interface DevicePageParams extends PageParams {
  name?: string
  code?: string
  type?: string
}

/** 候选设备(全量分页,用于穿梭弹窗) */
export function devicePage(params: DevicePageParams) {
  return http.post<PageResult<SpDevice>>('/basedata/device/page', params)
}
