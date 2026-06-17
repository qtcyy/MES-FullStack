import { http } from '@/http/client'
import type { PageResult } from '@/types/api'
import type {
  SpWarehouseReceipt,
  SpWarehouseReceiptItem,
  ReceiptPageParams,
  PostReceiptItemDTO,
} from '@/types/inventory'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 分页查询入库单(form 编码) */
export function pageReceipts(params: ReceiptPageParams) {
  return http.post<PageResult<SpWarehouseReceipt>>('/inventory/receipt/page', params)
}

/** 查询单张入库单明细 */
export function receiptItems(receiptId: string) {
  return http.get<SpWarehouseReceiptItem[]>(`/inventory/receipt/${receiptId}/items`)
}

/** 入库登账(JSON 体) */
export function postReceiptItem(dto: PostReceiptItemDTO) {
  return http.post<void>('/inventory/receipt/item/post', dto, JSON_HEADERS)
}
