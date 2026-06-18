import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface WarehousePageParams extends PageParams {
  name?: string
  code?: string
}

export function warehousePage(params: WarehousePageParams) {
  return http.post<PageResult<SpWarehouse>>('/basedata/warehouse/page', params)
}

export function warehouseAddOrUpdate(record: Partial<SpWarehouse>) {
  return http.post<string>('/basedata/warehouse/add-or-update', record, JSON_HEADERS)
}

export function warehouseDelete(id: string) {
  return http.post<void>('/basedata/warehouse/delete', { id }, JSON_HEADERS)
}

export function warehouseLocations(warehouseId: string) {
  return http.get<SpWarehouseLocation[]>(`/basedata/warehouse/locations/${warehouseId}`)
}

/** 取全部仓库(后端 GET /basedata/warehouse/list 已存在) */
export function warehouseList() {
  return http.get<SpWarehouse[]>('/basedata/warehouse/list')
}
