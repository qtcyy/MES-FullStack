import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { WarehouseReceipt, WarehouseReceiptItem, PostItemDTO } from '@/types/inventory'

/** 分页查询入库单 */
export function pageReceipts(params: PageParams & { receiptCode?: string; receiptStatus?: string }) {
  return client.post('/inventory/receipt/page', params) as Promise<PageResult<WarehouseReceipt>>
}

/** 查询入库单明细 */
export function getItems(receiptId: string) {
  return client.get(`/inventory/receipt/${receiptId}/items`) as Promise<WarehouseReceiptItem[]>
}

/** 入库登账（单条，JSON 请求体） */
export function postItem(dto: PostItemDTO) {
  return client.post('/inventory/receipt/item/post', dto, {
    headers: { 'Content-Type': 'application/json' },
  })
}
