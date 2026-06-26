import { http } from '@/api/request'
import type { WorkflowForm, FormPageParams, IPage } from '@/types/workflow'

/** 表单分页(form) */
export const formPage = (params: FormPageParams) =>
  http.post<IPage<WorkflowForm>>('/workflow/form/page', params)

/** 全部表单(form,关联弹窗下拉用) */
export const formList = () => http.post<WorkflowForm[]>('/workflow/form/list', {})

/** 新增/编辑(form,无 id=新增),返回 id */
export const formSave = (record: Partial<WorkflowForm>) =>
  http.post<string>('/workflow/form/add-or-update', record)

/** 删除(JSON) */
export const formDelete = (id: string) => http.post<void>('/workflow/form/delete', { id }, true)
