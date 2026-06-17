import { http } from '@/http/client'
import type { PageResult } from '@/types/api'
import type { SpInventory, InventoryPageParams, ManualInboundDTO } from '@/types/inventory'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 库存台账分页查询(form 编码;端点为 /inventory/page) */
export function pageInventory(params: InventoryPageParams) {
  return http.post<PageResult<SpInventory>>('/inventory/page', params)
}

/** 手动入库(JSON 体) */
export function manualInbound(dto: ManualInboundDTO) {
  return http.post<void>('/inventory/manual-inbound', dto, JSON_HEADERS)
}
