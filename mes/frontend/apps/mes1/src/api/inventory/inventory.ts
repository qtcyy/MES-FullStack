import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { InventoryRecord, ManualInboundDTO } from '@/types/inventory'

/** 分页查询库存明细 */
export function pageInventory(
  params: PageParams & { materialCode?: string; startDate?: string; endDate?: string },
) {
  return client.post('/inventory/page', params) as Promise<PageResult<InventoryRecord>>
}

/** 手动入库（JSON 请求体） */
export function manualInbound(dto: ManualInboundDTO) {
  return client.post('/inventory/manual-inbound', dto, {
    headers: { 'Content-Type': 'application/json' },
  })
}
