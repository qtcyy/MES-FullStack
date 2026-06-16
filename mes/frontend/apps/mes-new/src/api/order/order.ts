import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpOrder } from '@/types/order'

export interface OrderPageParams extends PageParams {
  orderCodeLike?: string
  materielLike?: string
}

/** 订单分页(表单编码) */
export function orderPage(params: OrderPageParams) {
  return http.post<PageResult<SpOrder>>('/order/release/page', params)
}

export function orderGetById(id: string) {
  return http.get<SpOrder>(`/order/release/get-by-id?id=${encodeURIComponent(id)}`)
}

/** 新增/修改(表单编码;新建后端置 statue=0) */
export function orderAddOrUpdate(record: Partial<SpOrder>) {
  return http.post<void>('/order/release/add-or-update', record)
}

/** 删除(表单编码 {id}) */
export function orderDelete(id: string) {
  return http.post<void>('/order/release/delete', { id })
}
