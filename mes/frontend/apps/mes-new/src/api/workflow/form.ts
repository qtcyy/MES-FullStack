import type { Observable } from 'rxjs'
import type { PageResult } from '@/types/api'
import type { WorkflowForm } from '@/types/workflow'
import { ok, readList, writeList, paginate, genId, nowStr } from './mockStore'

// 下周期真后端:POST /workflow/form/* (page/add-or-update form 编码;delete/list 见各注)
const KEY = 'wf_forms'

export interface FormPageParams {
  current: number
  size: number
  name?: string
  formKey?: string
}

/** 表单分页 */
export function formPage(params: FormPageParams): Observable<PageResult<WorkflowForm>> {
  let all = readList<WorkflowForm>(KEY)
  if (params.name) all = all.filter((f) => f.name.includes(params.name!))
  if (params.formKey) all = all.filter((f) => f.formKey.includes(params.formKey!))
  all = [...all].sort((a, b) => (b.createTime ?? '').localeCompare(a.createTime ?? ''))
  return ok(paginate(all, params.current, params.size))
}

/** 全部表单(关联弹窗下拉用) */
export function formList(): Observable<WorkflowForm[]> {
  return ok(readList<WorkflowForm>(KEY))
}

/** 新增/编辑(空 id 走新增) */
export function formAddOrUpdate(record: WorkflowForm): Observable<string> {
  const all = readList<WorkflowForm>(KEY)
  if (record.id) {
    const idx = all.findIndex((f) => f.id === record.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...record }
    writeList(KEY, all)
    return ok(record.id)
  }
  const id = genId()
  all.push({ ...record, id, createTime: nowStr() })
  writeList(KEY, all)
  return ok(id)
}

/** 删除 */
export function formDelete(id: string): Observable<void> {
  writeList(
    KEY,
    readList<WorkflowForm>(KEY).filter((f) => f.id !== id),
  )
  return ok(undefined as unknown as void)
}
