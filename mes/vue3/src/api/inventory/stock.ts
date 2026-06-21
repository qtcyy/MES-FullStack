import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type { SpInventory } from '@/types/inventory'

/** 库存分页(form);size 拉大兜底取全量,3D 场景用 */
export const pageInventory = (params: { current: number; size: number }) =>
  http.post<IPage<SpInventory>>('/inventory/page', params)
