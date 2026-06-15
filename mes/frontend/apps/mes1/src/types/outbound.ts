/** 出库单 */
export interface OutboundOrder {
  id: string
  outboundCode: string
  orderId?: string | null
  orderCode?: string
  productCode?: string
  productDesc?: string
  outboundStatus?: string
  totalItems?: number
  postedItems?: number
  createTime?: string
}

/** 出库单明细 */
export interface OutboundOrderItem {
  id: string
  outboundId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity?: number
  postStatus?: string
  allocationDetail?: string | null
  postedAt?: string | null
}

/** 出库单状态映射 */
export const OUTBOUND_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: 'blue' },
  partial: { text: '部分出库', color: 'orange' },
  completed: { text: '已完成', color: 'green' },
}

/** 出库明细状态映射 */
export const OUTBOUND_ITEM_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待登账', color: 'default' },
  posted: { text: '已登账', color: 'green' },
}
