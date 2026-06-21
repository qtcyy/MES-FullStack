import { http } from '@/api/request'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

/** 全部仓库(GET) */
export const warehouseList = () => http.get<SpWarehouse[]>('/basedata/warehouse/list')

/** 某仓库的库位(GET) */
export const warehouseLocations = (warehouseId: string) =>
  http.get<SpWarehouseLocation[]>(`/basedata/warehouse/locations/${encodeURIComponent(warehouseId)}`)
