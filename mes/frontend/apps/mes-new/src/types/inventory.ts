import type { PageParams } from '@/types/api'

export type ReceiptStatus = 'pending' | 'partial' | 'completed'
export type OutboundStatus = 'pending' | 'partial' | 'completed'
export type PostStatus = 'pending' | 'posted'

/** 入库单主表 sp_warehouse_receipt */
export interface SpWarehouseReceipt {
  id: string
  receiptCode: string
  sourceType?: string
  planId?: string
  orderId?: string
  orderCode?: string
  productCode?: string
  productDesc?: string
  receiptStatus: ReceiptStatus
  totalItems: number
  postedItems: number
  createTime?: string
  updateTime?: string
}

/** 入库单明细 sp_warehouse_receipt_item */
export interface SpWarehouseReceiptItem {
  id: string
  receiptId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity: number
  warehouseId?: string
  warehouseName?: string
  locationId?: string
  locationCode?: string
  postStatus: PostStatus
  postedAt?: string
}

/** 出库单主表 sp_outbound_order */
export interface SpOutboundOrder {
  id: string
  outboundCode: string
  orderId?: string
  orderCode?: string
  productCode?: string
  productDesc?: string
  outboundStatus: OutboundStatus
  totalItems: number
  postedItems: number
  createTime?: string
  updateTime?: string
}

/** 出库单明细 sp_outbound_order_item */
export interface SpOutboundOrderItem {
  id: string
  outboundId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity: number
  postStatus: PostStatus
  allocationDetail?: string
  postedAt?: string
}

/** 库存台账(库位级) sp_inventory */
export interface SpInventory {
  id: string
  materialCode: string
  materialDesc?: string
  unit?: string
  warehouseId?: string
  warehouseName?: string
  locationId?: string
  locationCode?: string
  quantity: number
  status?: string
  lastInboundTime?: string
}

/** 分页参数 */
export interface ReceiptPageParams extends PageParams {
  receiptCode?: string
  receiptStatus?: ReceiptStatus
}
export interface OutboundPageParams extends PageParams {
  outboundCode?: string
  outboundStatus?: OutboundStatus
}
export interface InventoryPageParams extends PageParams {
  materialCode?: string
  startDate?: string
  endDate?: string
}

/** 写入 DTO(JSON 体) */
export interface PostReceiptItemDTO {
  itemId: string
  warehouseId: string
  locationId: string
}
export interface PostOutboundItemDTO {
  itemId: string
}
export interface ManualInboundDTO {
  materialCode: string
  materialDesc?: string
  unit?: string
  warehouseId: string
  locationId: string
  quantity: number
}
