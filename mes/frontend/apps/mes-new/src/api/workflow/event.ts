import type { Observable } from 'rxjs'
import type { WorkflowEventRule } from '@/types/workflow'
import { ok, readList, writeList, genId, nowStr } from './mockStore'

// 下周期真后端:POST /workflow/event/*
const KEY = 'wf_event_rules'

/** 某定义下的全部事件规则 */
export function eventList(definitionId: string): Observable<WorkflowEventRule[]> {
  return ok(readList<WorkflowEventRule>(KEY).filter((r) => r.definitionId === definitionId))
}

/** 新增/编辑事件规则(空 id 走新增) */
export function eventSave(rule: WorkflowEventRule): Observable<string> {
  const all = readList<WorkflowEventRule>(KEY)
  if (rule.id) {
    const idx = all.findIndex((r) => r.id === rule.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...rule }
    writeList(KEY, all)
    return ok(rule.id)
  }
  const id = genId()
  all.push({ ...rule, id, createTime: nowStr() })
  writeList(KEY, all)
  return ok(id)
}

/** 删除事件规则 */
export function eventDelete(id: string): Observable<void> {
  writeList(
    KEY,
    readList<WorkflowEventRule>(KEY).filter((r) => r.id !== id),
  )
  return ok(undefined as unknown as void)
}
