import { http } from '@/http/client'
import type { SpOperStep } from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 某工序的步骤列表(按序号升序) */
export function operStepList(operId: string) {
  return http.get<SpOperStep[]>('/basedata/sp-oper-step/list', { params: { operId } })
}

/** 新增/修改单条步骤(表单编码;step_no 由后端维护) */
export function operStepAddOrUpdate(record: Partial<SpOperStep>) {
  return http.post<string>('/basedata/sp-oper-step/add-or-update', record)
}

/** 删除(@RequestBody JSON {id},与 sp-oper/delete 一致) */
export function operStepDelete(id: string) {
  return http.post<void>('/basedata/sp-oper-step/delete', { id }, JSON_HEADERS)
}

/** 重排步骤顺序(@RequestBody JSON {operId, ids};拖拽 / 上下移共用) */
export function operStepReorder(operId: string, ids: string[]) {
  return http.post<void>('/basedata/sp-oper-step/reorder', { operId, ids }, JSON_HEADERS)
}
