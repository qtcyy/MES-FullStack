import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type { WorkflowModel, ModelSaveDTO, ModelPublishDTO, ModelPageParams } from '@/types/workflow'

/** 模型分页(form;name/modelKey LIKE,update_time 倒序) */
export const modelPage = (params: ModelPageParams) =>
  http.post<IPage<WorkflowModel>>('/workflow/model/page', params)

/** 取单个模型(含 bpmnXml;GET) */
export const modelGet = (id: string) =>
  http.get<WorkflowModel>(`/workflow/model/${encodeURIComponent(id)}`)

/** 新建/保存设计(JSON;空 id 走新建 DRAFT) */
export const modelSave = (dto: ModelSaveDTO) =>
  http.post<string>('/workflow/model/save', dto, true)

/** 删除(JSON {id};已发布级联清定义+事件规则) */
export const modelDelete = (id: string) =>
  http.post<void>('/workflow/model/delete', { id }, true)

/** 发布到分类(JSON;置 PUBLISHED + upsert 定义) */
export const modelPublish = (dto: ModelPublishDTO) =>
  http.post<void>('/workflow/model/publish', dto, true)
