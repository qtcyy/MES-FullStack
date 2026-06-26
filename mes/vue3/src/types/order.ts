// src/types/order.ts —— 计划模块（工单/派工/甘特）类型

/** 生产订单（sp_order） */
export interface SpOrder {
  id?: string
  orderCode?: string
  orderDescription?: string
  qty?: number
  /** P=量产 A=验证 F=返工 */
  orderType?: string
  flowId?: string
  materiel?: string
  materielDesc?: string
  /** yyyy-MM-dd HH:mm:ss */
  planStartTime?: string
  planEndTime?: string
  /** 0待派工 1已派工 2进行中 3结束 4终结 */
  statue?: number
  createTime?: string
  updateTime?: string
}

/** 工单分页查询请求 */
export interface OrderPageReq {
  current: number
  size: number
  orderCodeLike?: string
  materielLike?: string
}

/** 派工列表行（含派工元信息） */
export interface DispatchableOrder extends SpOrder {
  dispatchStatus?: number | null
  workerName?: string | null
  teamName?: string | null
}

/** 派工分页请求 */
export interface DispatchPageReq {
  current: number
  size: number
  orderCode?: string
}

/** 派工提交体（JSON） */
export interface SpDispatchAssign {
  orderIds: string[]
  teamId: string
  userId: string
  laborHours: number
  planStartTime?: string
  planEndTime?: string
  remark?: string
}

export interface SpTeamOption {
  id: string
  code?: string
  name: string
}
export interface TeamUserOption {
  id: string
  name: string
  username?: string
}

/** 甘特只读聚合任务（GanttTaskVO） */
export interface GanttTask {
  id: string
  orderId: string
  orderCode: string
  materiel?: string
  materielDesc?: string
  qty?: number
  orderType?: string
  orderStatue?: number
  operId?: string
  operName?: string
  teamId?: string
  teamName?: string
  userId?: string
  userName?: string
  planStartTime?: string
  planEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  /** 1派工 2开工 3完工 */
  dispatchStatus: number
  progress?: number
}

export interface GanttQueryParams {
  startTime?: string
  endTime?: string
  orderCode?: string
  teamId?: string
}

/** 甘特写请求 DTO（均 JSON） */
export interface GanttReschedule { id: string; planStartTime: string; planEndTime: string }
export interface GanttStart { id: string; actualStartTime?: string }
export interface GanttFinish { id: string; actualEndTime?: string }
export interface GanttProgress { id: string; progress: number }
export interface GanttActual { id: string; actualStartTime?: string; actualEndTime?: string }
