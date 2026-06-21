import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type { SpOrder, OrderPageReq } from '@/types/order'

/** 工单分页（form） */
export const orderPage = (req: OrderPageReq) =>
  http.post<IPage<SpOrder>>('/order/release/page', req)

/** 按 id 取工单（GET） */
export const orderGetById = (id: string) =>
  http.get<SpOrder>('/order/release/get-by-id', { id })

/** 新增/更新（form，无 id=新增） */
export const orderAddOrUpdate = (dto: Partial<SpOrder>) =>
  http.post<void>('/order/release/add-or-update', dto)

/** 删除（form，后端物理删） */
export const orderDelete = (id: string) =>
  http.post<void>('/order/release/delete', { id })
