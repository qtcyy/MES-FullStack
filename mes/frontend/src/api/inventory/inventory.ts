import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { InventoryRecord } from '@/types/inventory'

/** 分页查询库存明细 */
export function pageInventory(
  params: PageParams & { materialCode?: string; startDate?: string; endDate?: string },
) {
  return client.post('/inventory/page', params) as Promise<PageResult<InventoryRecord>>
}
