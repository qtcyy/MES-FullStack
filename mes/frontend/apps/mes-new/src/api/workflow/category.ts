import { http } from '@/http/client'
import type { PageResult } from '@/types/api'
import type { WorkflowCategory } from '@/types/workflow'

// 真后端:POST /workflow/category/*(page/list/add-or-update form 编码;delete 走 JSON)
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface CategoryPageParams {
  current: number
  size: number
  code?: string
  name?: string
}

/** 分类分页(form 编码) */
export function categoryPage(params: CategoryPageParams) {
  return http.post<PageResult<WorkflowCategory>>('/workflow/category/page', params)
}

/** 全部分类(发布弹窗下拉用) */
export function categoryList() {
  return http.post<WorkflowCategory[]>('/workflow/category/list', {})
}

/** 新增/编辑(form 编码;空 id 走新增) */
export function categoryAddOrUpdate(record: WorkflowCategory) {
  return http.post<string>('/workflow/category/add-or-update', record)
}

/** 删除(JSON {id}) */
export function categoryDelete(id: string) {
  return http.post<void>('/workflow/category/delete', { id }, JSON_HEADERS)
}
