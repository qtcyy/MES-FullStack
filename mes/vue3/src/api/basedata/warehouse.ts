import { http } from '@/api/request'
import type { SpWarehouse, SpWarehouseLocation, WarehousePageReq } from '@/types/warehouse'
import type { IPage } from '@/types/basedata'

/** 分页(form) */
export const warehousePage = (req: WarehousePageReq) =>
  http.post<IPage<SpWarehouse>>('/basedata/warehouse/page', req)

/** 全部仓库(GET) */
export const warehouseList = () => http.get<SpWarehouse[]>('/basedata/warehouse/list')

/** 单个仓库(GET) */
export const warehouseGetById = (id: string) =>
  http.get<SpWarehouse>(`/basedata/warehouse/${encodeURIComponent(id)}`)

/** 某仓库的库位(GET) */
export const warehouseLocations = (warehouseId: string) =>
  http.get<SpWarehouseLocation[]>(`/basedata/warehouse/locations/${encodeURIComponent(warehouseId)}`)

/** 新增/编辑(JSON @RequestBody) */
export const warehouseAddOrUpdate = (dto: Partial<SpWarehouse>) =>
  http.post<string>('/basedata/warehouse/add-or-update', dto, true)

/** 软删(JSON @RequestBody) */
export const warehouseDelete = (id: string) =>
  http.post<void>('/basedata/warehouse/delete', { id }, true)
