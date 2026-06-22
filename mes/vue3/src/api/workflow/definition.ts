import { http } from '@/api/request'
import type { WorkflowDefinition, DefinitionPageParams, IPage } from '@/types/workflow'

/** 定义分页(form,仅已发布) */
export const definitionPage = (params: DefinitionPageParams) =>
  http.post<IPage<WorkflowDefinition>>('/workflow/definition/page', params)

/** 启用/停用(JSON) */
export const definitionSetEnabled = (id: string, enabled: boolean) =>
  http.post<void>('/workflow/definition/set-enabled', { id, enabled }, true)

/** 关联/清除表单(JSON,formKey 为 null 表示清除) */
export const definitionSetForm = (id: string, formKey: string | null) =>
  http.post<void>('/workflow/definition/set-form', { id, formKey }, true)
