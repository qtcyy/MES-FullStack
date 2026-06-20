import { http } from '@/http/client'
import type { PageResult } from '@/types/api'
import type { WorkflowForm } from '@/types/workflow'

// 真后端:POST /workflow/form/*(page/list/add-or-update form 编码;delete 走 JSON)
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface FormPageParams {
  current: number
  size: number
  name?: string
  formKey?: string
}

/** 表单分页 */
export function formPage(params: FormPageParams) {
  return http.post<PageResult<WorkflowForm>>('/workflow/form/page', params)
}

/** 全部表单(关联弹窗下拉用) */
export function formList() {
  return http.post<WorkflowForm[]>('/workflow/form/list', {})
}

/** 新增/编辑(空 id 走新增) */
export function formAddOrUpdate(record: WorkflowForm) {
  return http.post<string>('/workflow/form/add-or-update', record)
}

/** 删除(JSON {id}) */
export function formDelete(id: string) {
  return http.post<void>('/workflow/form/delete', { id }, JSON_HEADERS)
}
