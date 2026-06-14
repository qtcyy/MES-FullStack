/** 入库单 */
export interface WarehouseReceipt {
  id: string
  receiptCode: string
  sourceType?: string
  planId?: string | null
  orderId?: string | null
  orderCode?: string
  productCode?: string
  productDesc?: string
  receiptStatus?: string
  totalItems?: number
  postedItems?: number
  createTime?: string
}

/** 入库单明细 */
export interface WarehouseReceiptItem {
  id: string
  receiptId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity?: number
  warehouseId?: string | null
  warehouseName?: string | null
  locationId?: string | null
  locationCode?: string | null
  postStatus?: string
  postedAt?: string | null
}

/** 库存台账记录 */
export interface InventoryRecord {
  id: string
  materialCode: string
  materialDesc?: string
  unit?: string
  warehouseId?: string
  warehouseName?: string
  locationId?: string
  locationCode?: string
  quantity?: number
  status?: string
  lastInboundTime?: string
}

/** 登账请求 DTO */
export interface PostItemDTO {
  itemId: string
  warehouseId: string
  locationId: string
}

/** 手动入库 DTO */
export interface ManualInboundDTO {
  materialCode: string
  materialDesc?: string
  unit?: string
  warehouseId: string
  locationId: string
  quantity: number
}

/** 入库单状态映射 */
export const RECEIPT_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: 'blue' },
  partial: { text: '部分登账', color: 'orange' },
  completed: { text: '已完成', color: 'green' },
}

/** 明细登账状态映射 */
export const ITEM_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待登账', color: 'default' },
  posted: { text: '已登账', color: 'green' },
}

/** 库存状态映射 */
export const INVENTORY_STATUS_MAP: Record<string, { text: string; color: string }> = {
  available: { text: '可用', color: 'green' },
}
