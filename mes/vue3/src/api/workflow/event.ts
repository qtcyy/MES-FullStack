import { http } from '@/api/request'
import type { WorkflowEventRule } from '@/types/workflow'

/** 某定义下全部事件规则(JSON) */
export const eventList = (definitionId: string) =>
  http.post<WorkflowEventRule[]>('/workflow/event/list', { definitionId }, true)

/** 新增/编辑事件规则(JSON,无 id=新增),返回 id */
export const eventSave = (rule: Partial<WorkflowEventRule>) =>
  http.post<string>('/workflow/event/save', rule, true)

/** 删除事件规则(JSON) */
export const eventDelete = (id: string) => http.post<void>('/workflow/event/delete', { id }, true)
