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
