import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpOper, SpProcessUnitOption } from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface OperPageParams extends PageParams {
  operDescLike?: string
}

/** 工序分页(表单编码) */
export function operPage(params: OperPageParams) {
  return http.post<PageResult<SpOper>>('/basedata/sp-oper/page', params)
}

/** 工序全量(下拉) */
export function operList() {
  return http.get<SpOper[]>('/basedata/sp-oper/list')
}

/** 新增/修改(表单编码,operCode 后端自动生成) */
export function operAddOrUpdate(record: Partial<SpOper>) {
  return http.post<string>('/basedata/sp-oper/add-or-update', record)
}

/** 删除(@RequestBody JSON {id}) */
export function operDelete(id: string) {
  return http.post<void>('/basedata/sp-oper/delete', { id }, JSON_HEADERS)
}

/** 加工单元下拉 */
export function operProcessUnits() {
  return http.get<SpProcessUnitOption[]>('/basedata/sp-oper/process-units')
}
