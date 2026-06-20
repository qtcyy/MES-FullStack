import { http } from '@/api/request'
import type { SpFlow, FlowPageReq, SpFlowDtoReq, SpOperVo, IPage } from '@/types/technology'

export const flowPage = (req: FlowPageReq) =>
  http.post<IPage<SpFlow>>('/basedata/flow/page', req)

export const flowList = () => http.get<SpFlow[]>('/basedata/flow/list')

/** 保存工艺路线+工序链(JSON 端点,第三参 true) */
export const flowSaveProcess = (dto: SpFlowDtoReq) =>
  http.post<void>('/basedata/flow/process/add-or-update', dto, true)

/** 删除工艺路线(级联删关系,form 编码) */
export const flowDelete = (id: string) =>
  http.post<void>('/basedata/flow/process/delete', { id })

/** 取路线下有序工序链(编辑回填) */
export const flowOpers = (flowId: string) =>
  http.get<SpOperVo[]>(`/basedata/flow/process/opers/${flowId}`)
