import type { IPage } from '@/types/system'

/** 生产订单(复用 sp_order,生产订单相关字段) */
export interface ProductionOrder {
  id?: string
  orderCode?: string
  orderSource?: 'DEMAND' | 'FORECAST'
  scheduleMode?: 'FORWARD' | 'BACKWARD'
  bomId?: string
  bomCode?: string
  bomVersion?: string
  materiel?: string
  materielDesc?: string
  qty?: number
  planStartTime?: string
  planEndTime?: string
  customerName?: string
  contractNo?: string
  priority?: number
  orderDescription?: string
  auditStatus?: 'DRAFT' | 'APPROVING' | 'APPROVED' | 'REJECTED'
  planStatus?: 'UNCOMPUTED' | 'COMPUTED' | 'RELEASED' | 'CANCELLED' | 'DONE'
  createTime?: string
}

export interface ProductionOrderPageReq {
  current: number
  size: number
  orderCodeLike?: string
  orderSource?: string
  auditStatus?: string
}

/** 待办任务(运行时 sp_workflow_task) */
export interface WorkflowTask {
  id: string
  instanceId: string
  taskName: string
  taskKey: string
  businessType: string
  businessId: string
  assigneeUserId?: string
  assigneeUsername?: string
  candidateRoleCode?: string
  status: 'PENDING' | 'CLAIMED' | 'COMPLETED' | 'REJECTED'
  claimTime?: string
  completeTime?: string
  comment?: string
  createTime?: string
}

/** 事件轨迹 */
export interface WorkflowEvent {
  id: string
  instanceId: string
  eventType: string
  operatorUsername?: string
  eventTime?: string
  message?: string
}

export type { IPage }
