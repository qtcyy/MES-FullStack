import type { Observable } from 'rxjs'
import type { PageResult } from '@/types/api'
import type { WorkflowCategory } from '@/types/workflow'
import { ok, readList, writeList, paginate, genId, nowStr } from './mockStore'

// 下周期真后端:POST /workflow/category/* (page/add-or-update form 编码;delete/list 见各注)
const KEY = 'wf_categories'

export interface CategoryPageParams {
  current: number
  size: number
  code?: string
  name?: string
}

/** 分类分页(真后端 form 编码) */
export function categoryPage(params: CategoryPageParams): Observable<PageResult<WorkflowCategory>> {
  let all = readList<WorkflowCategory>(KEY)
  if (params.code) all = all.filter((c) => c.code.includes(params.code!))
  if (params.name) all = all.filter((c) => c.name.includes(params.name!))
  all = [...all].sort((a, b) => (b.createTime ?? '').localeCompare(a.createTime ?? ''))
  return ok(paginate(all, params.current, params.size))
}

/** 全部分类(发布弹窗下拉用;真后端 POST /workflow/category/list) */
export function categoryList(): Observable<WorkflowCategory[]> {
  return ok(readList<WorkflowCategory>(KEY))
}

/** 新增/编辑(真后端 form 编码;空 id 走新增) */
export function categoryAddOrUpdate(record: WorkflowCategory): Observable<string> {
  const all = readList<WorkflowCategory>(KEY)
  if (record.id) {
    const idx = all.findIndex((c) => c.id === record.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...record }
    writeList(KEY, all)
    return ok(record.id)
  }
  const id = genId()
  all.push({ ...record, id, createTime: nowStr() })
  writeList(KEY, all)
  return ok(id)
}

/** 删除(真后端 JSON {id}) */
export function categoryDelete(id: string): Observable<void> {
  writeList(
    KEY,
    readList<WorkflowCategory>(KEY).filter((c) => c.id !== id),
  )
  return ok(undefined as unknown as void)
}
