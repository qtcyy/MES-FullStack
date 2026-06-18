import type { Observable } from 'rxjs'
import type { PageResult } from '@/types/api'
import type { WorkflowModel } from '@/types/workflow'
import { ok, readList, writeList, paginate, genId, nowStr } from './mockStore'

// 下周期真后端:POST /workflow/model/* (XML 体大,save/delete/publish 走 JSON)
const KEY = 'wf_models'

export interface ModelPageParams {
  current: number
  size: number
  name?: string
  modelKey?: string
}

export interface ModelSaveDTO {
  id?: string
  modelKey: string
  name: string
  bpmnXml: string
}

export interface ModelPublishDTO {
  id: string
  categoryCode: string
  categoryName: string
}

/** 模型分页(真后端 form 编码) */
export function modelPage(params: ModelPageParams): Observable<PageResult<WorkflowModel>> {
  let all = readList<WorkflowModel>(KEY)
  if (params.name) all = all.filter((m) => m.name.includes(params.name!))
  if (params.modelKey) all = all.filter((m) => m.modelKey.includes(params.modelKey!))
  all = [...all].sort((a, b) => (b.updateTime ?? '').localeCompare(a.updateTime ?? ''))
  return ok(paginate(all, params.current, params.size))
}

/** 取单个模型(含 bpmnXml;真后端 GET /workflow/model/{id}) */
export function modelGet(id: string): Observable<WorkflowModel | undefined> {
  return ok(readList<WorkflowModel>(KEY).find((m) => m.id === id))
}

/** 新建/保存设计(真后端 JSON;空 id 走新建,状态 DRAFT) */
export function modelSave(dto: ModelSaveDTO): Observable<string> {
  const all = readList<WorkflowModel>(KEY)
  const ts = nowStr()
  if (dto.id) {
    const idx = all.findIndex((m) => m.id === dto.id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], name: dto.name, modelKey: dto.modelKey, bpmnXml: dto.bpmnXml, updateTime: ts }
    }
    writeList(KEY, all)
    return ok(dto.id)
  }
  const id = genId()
  all.push({
    id,
    modelKey: dto.modelKey,
    name: dto.name,
    bpmnXml: dto.bpmnXml,
    status: 'DRAFT',
    version: 1,
    createTime: ts,
    updateTime: ts,
  })
  writeList(KEY, all)
  return ok(id)
}

/** 删除(真后端 JSON {id}) */
export function modelDelete(id: string): Observable<void> {
  writeList(
    KEY,
    readList<WorkflowModel>(KEY).filter((m) => m.id !== id),
  )
  return ok(undefined as unknown as void)
}

/** 发布到分类(真后端 JSON;置 PUBLISHED + 回填分类) */
export function modelPublish(dto: ModelPublishDTO): Observable<void> {
  const all = readList<WorkflowModel>(KEY)
  const idx = all.findIndex((m) => m.id === dto.id)
  if (idx >= 0) {
    all[idx] = {
      ...all[idx],
      status: 'PUBLISHED',
      categoryCode: dto.categoryCode,
      categoryName: dto.categoryName,
      updateTime: nowStr(),
    }
    writeList(KEY, all)
  }
  return ok(undefined as unknown as void)
}
