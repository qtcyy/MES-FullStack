import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type { ProductionOrder, ProductionOrderPageReq } from '@/types/plan'

export const productionOrderPage = (req: ProductionOrderPageReq) =>
  http.post<IPage<ProductionOrder>>('/plan/order/page', req)

export const productionOrderGetById = (id: string) =>
  http.get<ProductionOrder>('/plan/order/get-by-id', { id })

export const productionOrderSave = (record: Partial<ProductionOrder>) =>
  http.post<string>('/plan/order/add-or-update', record)

export const productionOrderDelete = (id: string) =>
  http.post<void>('/plan/order/delete', { id })
