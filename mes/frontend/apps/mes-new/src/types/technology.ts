/** 工序(sp_oper) */
export interface SpOper {
  id: string
  oper?: string
  operCode?: string
  operDesc: string
  processUnitId?: string
  laborHours?: number
  manufacturingCycle?: number
  generatePlan?: string
  remark?: string
}

/** 加工单元下拉项 */
export interface SpProcessUnitOption {
  id: string
  code: string
  name: string
}

/** 工艺路线(sp_flow) */
export interface SpFlow {
  id: string
  flow: string
  flowDesc?: string
  /** 后端自动生成的工序链字符串,分隔符 "->" */
  process?: string
}

/** 流程-工序穿梭对象 */
export interface SpOperVo {
  value: string
  title: string
}

/** 工艺路线级联保存入参 */
export interface SpFlowDtoReq {
  id?: string
  flow: string
  flowDesc?: string
  spOperVoList: SpOperVo[]
}
