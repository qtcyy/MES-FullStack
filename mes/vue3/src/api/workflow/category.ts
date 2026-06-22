import { http } from '@/api/request'
import type { WorkflowCategory, CategoryPageParams, IPage } from '@/types/workflow'

/** 分类分页(form) */
export const categoryPage = (params: CategoryPageParams) =>
  http.post<IPage<WorkflowCategory>>('/workflow/category/page', params)

/** 全部分类(form,下拉用) */
export const categoryList = () => http.post<WorkflowCategory[]>('/workflow/category/list', {})

/** 新增/编辑(form,无 id=新增),返回 id */
export const categorySave = (record: Partial<WorkflowCategory>) =>
  http.post<string>('/workflow/category/add-or-update', record)

/** 删除(JSON) */
export const categoryDelete = (id: string) =>
  http.post<void>('/workflow/category/delete', { id }, true)
