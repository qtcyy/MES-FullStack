import { http } from '@/api/request'
import type { SpComponent, ComponentPageReq, IPage } from '@/types/basedata'

export const componentPage = (req: ComponentPageReq) =>
  http.post<IPage<SpComponent>>('/basedata/component/page', req)

export const componentAddOrUpdate = (dto: Partial<SpComponent>) =>
  http.post<string>('/basedata/component/add-or-update', dto)

export const componentDelete = (id: string) =>
  http.post<void>('/basedata/component/delete', { id }, true)
