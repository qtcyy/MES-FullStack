import type { PageReq } from '@/types/system'

/** 库存台账(对应后端 sp_inventory) */
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

/** 入库单(sp_warehouse_receipt) */
export interface SpWarehouseReceipt {
  id: string
  receiptCode: string
  sourceType?: string
  planId?: string
  orderId?: string
  orderCode?: string
  productCode?: string
  productDesc?: string
  receiptStatus?: string
  totalItems?: number
  postedItems?: number
  createTime?: string
}

/** 入库单明细(sp_warehouse_receipt_item) */
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
  postStatus?: string
  postedAt?: string
}

/** 出库单(sp_outbound_order) */
export interface SpOutboundOrder {
  id: string
  outboundCode: string
  orderId?: string
  orderCode?: string
  productCode?: string
  productDesc?: string
  outboundStatus?: string
  totalItems?: number
  postedItems?: number
  createTime?: string
}

/** 出库单明细(sp_outbound_order_item) */
export interface SpOutboundOrderItem {
  id: string
  outboundId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity: number
  postStatus?: string
  allocationDetail?: string
  postedAt?: string
}

/** 分页参数(复用项目 PageReq 基类:current + size) */
export interface ReceiptPageParams extends PageReq {
  receiptCode?: string
  receiptStatus?: string
}
export interface OutboundPageParams extends PageReq {
  outboundCode?: string
  outboundStatus?: string
}
export interface InventoryPageParams extends PageReq {
  materialCode?: string
  startDate?: string
  endDate?: string
}

/** 登账/手工入库 DTO */
export interface PostReceiptItemDTO { itemId: string; warehouseId: string; locationId: string }
export interface PostOutboundItemDTO { itemId: string }
export interface ManualInboundDTO {
  materialCode: string
  materialDesc: string
  unit: string
  warehouseId: string
  locationId: string
  quantity: number
}
