import { http } from '@/http/client'
import type { PageResult } from '@/types/api'
import type { WorkflowModel } from '@/types/workflow'

// 真后端:POST /workflow/model/*(page form 编码;XML 体大,save/delete/publish 走 JSON;取单个走 GET)
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

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

/** 模型分页(form 编码) */
export function modelPage(params: ModelPageParams) {
  return http.post<PageResult<WorkflowModel>>('/workflow/model/page', params)
}

/** 取单个模型(含 bpmnXml;GET /workflow/model/{id}) */
export function modelGet(id: string) {
  return http.get<WorkflowModel>(`/workflow/model/${id}`)
}

/** 新建/保存设计(JSON;空 id 走新建,状态 DRAFT) */
export function modelSave(dto: ModelSaveDTO) {
  return http.post<string>('/workflow/model/save', dto, JSON_HEADERS)
}

/** 删除(JSON {id}) */
export function modelDelete(id: string) {
  return http.post<void>('/workflow/model/delete', { id }, JSON_HEADERS)
}

/** 发布到分类(JSON;置 PUBLISHED + 回填分类) */
export function modelPublish(dto: ModelPublishDTO) {
  return http.post<void>('/workflow/model/publish', dto, JSON_HEADERS)
}
