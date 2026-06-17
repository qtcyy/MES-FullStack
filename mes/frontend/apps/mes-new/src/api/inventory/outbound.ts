import { http } from '@/http/client'
import type { PageResult } from '@/types/api'
import type {
  SpOutboundOrder,
  SpOutboundOrderItem,
  OutboundPageParams,
  PostOutboundItemDTO,
} from '@/types/inventory'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 分页查询出库单(form 编码) */
export function pageOutbounds(params: OutboundPageParams) {
  return http.post<PageResult<SpOutboundOrder>>('/inventory/outbound/page', params)
}

/** 查询单张出库单明细 */
export function outboundItems(outboundId: string) {
  return http.get<SpOutboundOrderItem[]>(`/inventory/outbound/${outboundId}/items`)
}

/** 出库登账 FIFO(JSON 体) */
export function postOutboundItem(dto: PostOutboundItemDTO) {
  return http.post<void>('/inventory/outbound/item/post', dto, JSON_HEADERS)
}
