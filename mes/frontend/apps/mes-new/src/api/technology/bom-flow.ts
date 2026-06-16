import { http } from '@/http/client'
import type { SpProductBom, SpFlow, BomFlowNodeVO, FlowOperItem } from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 产品根(parent_id IS NULL) */
export function bomFlowProducts() {
  return http.get<SpProductBom[]>('/technology/bom-flow/products')
}

/** 某产品根下全部节点(扁平,含 bomFlow/flow/opers) */
export function bomFlowList(rootId: string) {
  return http.get<BomFlowNodeVO[]>(`/technology/bom-flow/list/${encodeURIComponent(rootId)}`)
}

/** 全部工艺路线(下拉) */
export function bomFlowFlows() {
  return http.get<SpFlow[]>('/technology/bom-flow/flows')
}

/** 某工艺路线的工序链预览 */
export function bomFlowOpers(flowId: string) {
  return http.get<FlowOperItem[]>(`/technology/bom-flow/opers/${encodeURIComponent(flowId)}`)
}

/** 绑定/换绑(JSON)→ 新绑定 id */
export function bomFlowBind(body: { bomId: string; flowId: string; remark?: string }) {
  return http.post<string>('/technology/bom-flow/bind', body, JSON_HEADERS)
}

/** 解绑(JSON {bomId}) */
export function bomFlowUnbind(bomId: string) {
  return http.post<null>('/technology/bom-flow/unbind', { bomId }, JSON_HEADERS)
}

/** 改备注(JSON {id,remark};id 为绑定行 id) */
export function bomFlowUpdateRemark(id: string, remark: string) {
  return http.post<null>('/technology/bom-flow/update-remark', { id, remark }, JSON_HEADERS)
}

/** 锁定整产品工艺(需 BOM 根已锁定) */
export function bomFlowLock(rootId: string) {
  return http.post<null>(`/technology/bom-flow/lock/${encodeURIComponent(rootId)}`, {}, JSON_HEADERS)
}
