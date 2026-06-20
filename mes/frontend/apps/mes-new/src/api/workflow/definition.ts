import { http } from '@/http/client'
import type { PageResult } from '@/types/api'
import type { WorkflowDefinition } from '@/types/workflow'

// 真后端:流程定义由模型发布动作落库;page form 编码,set-* 走 JSON
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface DefinitionPageParams {
  current: number
  size: number
  name?: string
}

/** 定义分页(仅已发布;form 编码) */
export function definitionPage(params: DefinitionPageParams) {
  return http.post<PageResult<WorkflowDefinition>>('/workflow/definition/page', params)
}

/** 启用/停用(JSON {id, enabled}) */
export function definitionSetEnabled(id: string, enabled: boolean) {
  return http.post<void>('/workflow/definition/set-enabled', { id, enabled }, JSON_HEADERS)
}

/** 关联/清除流程表单(JSON {id, formKey};formKey 为 null 清除) */
export function definitionSetForm(id: string, formKey: string | null) {
  return http.post<void>('/workflow/definition/set-form', { id, formKey }, JSON_HEADERS)
}
