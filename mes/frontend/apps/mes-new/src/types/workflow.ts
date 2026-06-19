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

export type WorkflowFormType = 'URL'

/** 流程表单（mock） */
export interface WorkflowForm {
  id: string
  name: string
  formKey: string
  formType: WorkflowFormType
  titleScript: string
  pcUrlScript: string
  mobileUrlScript: string
  skipSameAssignee: boolean
  createTime?: string
}

/** 流程定义 = 已发布模型派生 + mock 附加状态 */
export interface WorkflowDefinition {
  id: string // = modelId
  processKey: string // = modelKey
  processName: string
  categoryCode?: string
  categoryName?: string
  version: number
  enabled: boolean
  formKey?: string
  createTime?: string
}

export type WorkflowEventTrigger = 'START' | 'TASK_COMPLETE' | 'END' | 'REJECT'
export type WorkflowEventActionType = 'SET_AUDIT_STATUS' | 'SCRIPT'
export type OrderAuditStatus = 'DRAFT' | 'APPROVING' | 'APPROVED' | 'REJECTED'

/** 流程事件规则（mock，按 definitionId 归属） */
export interface WorkflowEventRule {
  id: string
  definitionId: string
  name?: string
  trigger: WorkflowEventTrigger
  businessType: string // 'ORDER_APPROVAL'
  actionType: WorkflowEventActionType
  targetStatus?: OrderAuditStatus
  script?: string
  enabled: boolean
  createTime?: string
}

/** 事件规则草稿（无 id/createTime，保存时再补） */
export type WorkflowEventRuleDraft = Omit<WorkflowEventRule, 'id' | 'createTime'>
