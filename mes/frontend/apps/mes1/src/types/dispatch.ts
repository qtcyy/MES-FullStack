/** 派工记录 */
export interface OrderDispatch {
  id: string
  orderId: string
  teamId: string
  userId: string
  laborHours?: number
  dispatchStatus?: number
  planStartTime?: string
  planEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  remark?: string
  workerName?: string
  teamName?: string
}

/** 带派工信息的工单行 */
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
  laborHours?: number | null
}

/** 派工请求 DTO */
export interface DispatchAssignDTO {
  orderIds: string[]
  teamId: string
  userId: string
  laborHours: number
  planStartTime?: string
  planEndTime?: string
  remark?: string
}

/** 派工状态映射 */
export const DISPATCH_STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '已下发', color: 'blue' },
  1: { text: '已派工', color: 'green' },
  2: { text: '已开工', color: 'orange' },
  3: { text: '已完工', color: 'cyan' },
  4: { text: '待检验', color: 'gold' },
  5: { text: '废补', color: 'red' },
}
