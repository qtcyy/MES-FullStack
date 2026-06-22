import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type {
  SpOutboundOrder,
  SpOutboundOrderItem,
  OutboundPageParams,
  PostOutboundItemDTO,
} from '@/types/inventory'

/** 出库单分页(form 编码) */
export const pageOutbounds = (params: OutboundPageParams) =>
  http.post<IPage<SpOutboundOrder>>('/inventory/outbound/page', params)

/** 单张出库单明细(GET) */
export const outboundItems = (outboundId: string) =>
  http.get<SpOutboundOrderItem[]>(`/inventory/outbound/${encodeURIComponent(outboundId)}/items`)

/** 出库登账 FIFO(JSON 体,只需 itemId) */
export const postOutboundItem = (dto: PostOutboundItemDTO) =>
  http.post<void>('/inventory/outbound/item/post', dto, true)
