/** 生产订单 */
export interface SpOrder {
  id: string
  orderCode: string
  orderDescription?: string
  qty?: number
  orderType?: string
  flowId?: string
  materiel?: string
  materielDesc?: string
  planStartTime?: string
  planEndTime?: string
  statue?: number
}

/** 待派工列表行(后端返回 Map,含派工冗余字段) */
export interface DispatchableOrder {
  id: string
  orderCode: string
  orderDescription?: string
  qty?: number
  orderType?: string
  materiel?: string
  materielDesc?: string
  planStartTime?: string
  planEndTime?: string
  statue?: number
  dispatchStatus?: number | null
  workerName?: string | null
  teamName?: string | null
}

/** 派工执行入参 */
export interface SpDispatchAssign {
  orderIds: string[]
  teamId: string
  userId: string
  laborHours: number
  planStartTime?: string
  planEndTime?: string
  remark?: string
}

export interface SpTeamOption { id: string; code: string; name: string }
export interface TeamUserOption { id: string; name: string; username?: string }

/** 甘特图派工任务(订单×工序×班组×作业员) */
export interface GanttTask {
  id: string
  orderId: string
  orderCode: string
  materiel: string
  materielDesc?: string
  qty: number
  orderType: string
  orderStatue: number
  operId: string
  operName: string
  teamId: string
  teamName: string
  userId: string
  userName: string
  planStartTime?: string
  planEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  dispatchStatus: number
  progress?: number
}

/** 甘特图查询过滤(全部可选) */
export interface GanttQueryParams {
  startTime?: string
  endTime?: string
  orderCode?: string
  teamId?: string
}

/** 甘特图写操作入参 */
export interface GanttRescheduleReq { id: string; planStartTime: string; planEndTime: string }
export interface GanttStartReq { id: string; actualStartTime?: string }
export interface GanttFinishReq { id: string; actualEndTime?: string }
export interface GanttProgressReq { id: string; progress: number }
export interface GanttActualReq { id: string; actualStartTime?: string; actualEndTime?: string }
