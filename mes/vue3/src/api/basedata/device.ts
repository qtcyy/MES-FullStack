import { http } from '@/api/request'
import type { SpDevice, DevicePageReq, IPage } from '@/types/basedata'

export const devicePage = (req: DevicePageReq) =>
  http.post<IPage<SpDevice>>('/basedata/device/page', req)

export const deviceGetById = (id: string) =>
  http.get<SpDevice>(`/basedata/device/${encodeURIComponent(id)}`)

export const deviceAddOrUpdate = (dto: Partial<SpDevice>) =>
  http.post<string>('/basedata/device/add-or-update', dto, true)

export const deviceDelete = (id: string) =>
  http.post<void>('/basedata/device/delete', { id }, true)
