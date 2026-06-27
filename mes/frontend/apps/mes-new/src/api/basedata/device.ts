// apps/mes-new/src/api/basedata/device.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpDevice } from '@/types/device'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface DevicePageParams extends PageParams {
  name?: string
  code?: string
  type?: string
}

/** 设备分页(form 编码;SpDevicePageReq)。亦用于设备组"管理成员"候选池 */
export function devicePage(params: DevicePageParams) {
  return http.post<PageResult<SpDevice>>('/basedata/device/page', params)
}

export function deviceGetById(id: string) {
  return http.get<SpDevice>(`/basedata/device/${id}`)
}

/** add-or-update 为 @RequestBody JSON */
export function deviceAddOrUpdate(record: Partial<SpDevice>) {
  return http.post<string>('/basedata/device/add-or-update', record, JSON_HEADERS)
}

/** delete 为 @RequestBody {id};后端若设备已关联生产作业会拒删 */
export function deviceDelete(id: string) {
  return http.post<void>('/basedata/device/delete', { id }, JSON_HEADERS)
}
