/** 流程分类 */
export interface WorkflowCategory {
  id: string
  code: string
  name: string
  descr?: string
  createTime?: string
}

export type WorkflowModelStatus = 'DRAFT' | 'PUBLISHED'

/** 流程模型(含 BPMN XML) */
export interface WorkflowModel {
  id: string
  modelKey: string
  name: string
  categoryCode?: string
  categoryName?: string
  bpmnXml: string
  status: WorkflowModelStatus
  version: number
  createTime?: string
  updateTime?: string
}
