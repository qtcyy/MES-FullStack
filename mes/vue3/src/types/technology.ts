import type { PageReq, IPage } from '@/types/system'

export type { IPage }

/** 工序(对应 sp_oper) */
export interface SpOper {
  id: string
  oper?: string                // 工序名(后端用 operCode 同值填充)
  operCode?: string            // 工序编号 OPR-XXX(后端自动生成)
  operDesc: string             // 工序描述(必填)
  processUnitId?: string       // 加工单元 id(可空)
  laborHours?: number          // 工时(分钟)
  manufacturingCycle?: number  // 制造周期(分钟),须 > laborHours
  generatePlan?: string        // '0' 否 / '1' 是
  remark?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 工序分页请求 */
export interface OperPageReq extends PageReq {
  operDescLike?: string
}

/** 加工单元下拉选项(对应 sp_process_unit,取 id + name) */
export interface SpProcessUnitOption {
  id: string
  code?: string
  name: string
  type?: string
}

/** 工艺路线(对应 sp_flow) */
export interface SpFlow {
  id: string
  flow: string         // 流程代码
  flowDesc?: string    // 流程/线体描述
  process?: string     // 工序链串(后端生成,只读,形如 A->B->C)
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 工艺路线分页请求 */
export type FlowPageReq = PageReq

/** 穿梭框/关系 VO(后端 SpOperVo) value=工序id, title=工序编码 */
export interface SpOperVo {
  value: string
  title: string
}

/** 工艺路线级联保存入参(后端 SpFlowDto) */
export interface SpFlowDtoReq {
  id?: string
  flow: string
  flowDesc?: string
  spOperVoList: SpOperVo[]   // 有序,顺序即执行顺序
}

/** 通用穿梭框项 */
export interface TransferItem {
  id: string
  primary: string       // 主显(工序描述)
  secondary?: string    // 次显(工序编码)
}
