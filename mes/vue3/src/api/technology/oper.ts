import { http } from '@/api/request'
import type { SpOper, OperPageReq, SpProcessUnitOption, IPage } from '@/types/technology'

export const operPage = (req: OperPageReq) =>
  http.post<IPage<SpOper>>('/basedata/sp-oper/page', req)

export const operList = () => http.get<SpOper[]>('/basedata/sp-oper/list')

export const operAddOrUpdate = (dto: Partial<SpOper>) =>
  http.post<string>('/basedata/sp-oper/add-or-update', dto)

/** 删除工序(JSON 端点,第三参 true 走 application/json) */
export const operDelete = (id: string) =>
  http.post<void>('/basedata/sp-oper/delete', { id }, true)

export const operProcessUnits = () =>
  http.get<SpProcessUnitOption[]>('/basedata/sp-oper/process-units')
