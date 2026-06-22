import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type {
  SpWarehouseReceipt,
  SpWarehouseReceiptItem,
  ReceiptPageParams,
  PostReceiptItemDTO,
} from '@/types/inventory'

/** 入库单分页(form 编码) */
export const pageReceipts = (params: ReceiptPageParams) =>
  http.post<IPage<SpWarehouseReceipt>>('/inventory/receipt/page', params)

/** 单张入库单明细(GET) */
export const receiptItems = (receiptId: string) =>
  http.get<SpWarehouseReceiptItem[]>(`/inventory/receipt/${encodeURIComponent(receiptId)}/items`)

/** 入库登账(JSON 体) */
export const postReceiptItem = (dto: PostReceiptItemDTO) =>
  http.post<void>('/inventory/receipt/item/post', dto, true)
