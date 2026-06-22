import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type { SpInventory, InventoryPageParams, ManualInboundDTO } from '@/types/inventory'

/** 库存台账分页(form;端点 /inventory/page) */
export const pageInventory = (params: InventoryPageParams) =>
  http.post<IPage<SpInventory>>('/inventory/page', params)

/** 手动入库(JSON 体) */
export const manualInbound = (dto: ManualInboundDTO) =>
  http.post<void>('/inventory/manual-inbound', dto, true)
