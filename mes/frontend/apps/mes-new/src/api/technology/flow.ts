import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpFlow, SpOperVo, SpFlowDtoReq } from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 工艺路线分页(表单编码) */
export function flowPage(params: PageParams) {
  return http.post<PageResult<SpFlow>>('/basedata/flow/page', params)
}

/** 级联保存(@RequestBody JSON;后端按顺序推导 sortNum/前后道/首末道/process) */
export function flowSaveProcess(body: SpFlowDtoReq) {
  return http.post<unknown>('/basedata/flow/process/add-or-update', body, JSON_HEADERS)
}

/** 删除(表单编码 {id};后端按 flow_id 级联删关系) */
export function flowDelete(id: string) {
  return http.post<unknown>('/basedata/flow/process/delete', { id })
}

/** 取有序工序链(编辑态回填) */
export function flowOpers(flowId: string) {
  return http.get<SpOperVo[]>(`/basedata/flow/process/opers/${encodeURIComponent(flowId)}`)
}

/** 工艺路线全量(下拉) */
export function flowList() {
  return http.get<SpFlow[]>('/basedata/flow/list')
}
