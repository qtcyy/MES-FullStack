import { http } from '@/http/client'
import type { WorkflowEventRule } from '@/types/workflow'

// 真后端:POST /workflow/event/*(全部走 JSON)
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 某定义下的全部事件规则(JSON {definitionId}) */
export function eventList(definitionId: string) {
  return http.post<WorkflowEventRule[]>('/workflow/event/list', { definitionId }, JSON_HEADERS)
}

/** 新增/编辑事件规则(JSON;空 id 走新增) */
export function eventSave(rule: WorkflowEventRule) {
  return http.post<string>('/workflow/event/save', rule, JSON_HEADERS)
}

/** 删除事件规则(JSON {id}) */
export function eventDelete(id: string) {
  return http.post<void>('/workflow/event/delete', { id }, JSON_HEADERS)
}
