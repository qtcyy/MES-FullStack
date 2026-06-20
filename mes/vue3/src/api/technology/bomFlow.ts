import { http } from '@/api/request'
import type {
  SpProductBom,
  SpFlow,
  BomFlowNodeVO,
  FlowOperItem,
} from '@/types/technology'

/** 产品根列表(GET) — 所有 parent_id 为空的根 BOM */
export const bomFlowProducts = () =>
  http.get<SpProductBom[]>('/technology/bom-flow/products')

/** 某产品根下全部节点+绑定(GET,扁平) */
export const bomFlowList = (rootId: string) =>
  http.get<BomFlowNodeVO[]>(`/technology/bom-flow/list/${encodeURIComponent(rootId)}`)

/** 工艺路线全表(GET,绑定下拉用) */
export const bomFlowFlows = () =>
  http.get<SpFlow[]>('/technology/bom-flow/flows')

/**
 * 某工艺路线工序链预览(GET)。
 * 注:契约端点,当前页面未直接消费——工序链已随 `bomFlowList` 响应内联返回(opers 字段);
 * 保留作完整 API 镜像,供将来独立查询场景复用。
 */
export const bomFlowOpers = (flowId: string) =>
  http.get<FlowOperItem[]>(`/technology/bom-flow/opers/${encodeURIComponent(flowId)}`)

/** 绑定/换绑(JSON),返回新绑定 id */
export const bomFlowBind = (body: { bomId: string; flowId: string; remark?: string }) =>
  http.post<string>('/technology/bom-flow/bind', body, true)

/** 解绑(JSON) */
export const bomFlowUnbind = (bomId: string) =>
  http.post<void>('/technology/bom-flow/unbind', { bomId }, true)

/** 锁定整树工艺(JSON,需 BOM 根已锁定) */
export const bomFlowLock = (rootId: string) =>
  http.post<void>(`/technology/bom-flow/lock/${encodeURIComponent(rootId)}`, {}, true)
