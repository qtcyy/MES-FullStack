import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { OutboundOrder, OutboundOrderItem } from '@/types/outbound'

/** 分页查询出库单 */
export function pageOutbounds(params: PageParams & { outboundCode?: string; outboundStatus?: string }) {
  return client.post('/inventory/outbound/page', params) as Promise<PageResult<OutboundOrder>>
}

/** 查询出库单明细 */
export function getItems(outboundId: string) {
  return client.get(`/inventory/outbound/${outboundId}/items`) as Promise<OutboundOrderItem[]>
}

/** 出库登账（FIFO，JSON 请求体） */
export function postOutboundItem(itemId: string) {
  return client.post('/inventory/outbound/item/post', { itemId }, {
    headers: { 'Content-Type': 'application/json' },
  })
}
