// src/types/workflow.ts —— 工作流配置模块(分类/表单/定义/事件)类型
import type { IPage } from '@/types/system'

export type { IPage }

/** 流程分类(sp_workflow_category) */
export interface WorkflowCategory {
  id?: string
  /** 分类编码(唯一) */
  code: string
  name: string
  descr?: string
  createTime?: string
  updateTime?: string
}

/** 流程表单(sp_workflow_form) */
export interface WorkflowForm {
  id?: string
  name: string
  /** 表单 key(字母开头,唯一) */
  formKey: string
  /** 目前仅 URL */
  formType: 'URL'
  /** 流程标题生成脚本 */
  titleScript?: string
  /** PC 表单地址脚本 */
  pcUrlScript?: string
  /** 手机表单地址脚本 */
  mobileUrlScript?: string
  /** 是否跳过相同处理人 */
  skipSameAssignee: boolean
  createTime?: string
  updateTime?: string
}

/** 流程定义(sp_workflow_definition);由模型发布派生,id = model.id */
export interface WorkflowDefinition {
  id: string
  categoryCode?: string
  categoryName?: string
  /** = 模型 modelKey */
  processKey: string
  processName: string
  enabled: boolean
  /** 关联的流程表单 key,可为 null(清除关联) */
  formKey?: string | null
  version: number
  createTime?: string
  updateTime?: string
}

/** 事件触发时机 */
export type EventTrigger = 'START' | 'TASK_COMPLETE' | 'END' | 'REJECT'
/** 事件动作类型 */
export type EventAction = 'SET_AUDIT_STATUS' | 'SCRIPT'
/** 目标审批状态 */
export type AuditStatus = 'DRAFT' | 'APPROVING' | 'APPROVED' | 'REJECTED'

/**
 * 流程事件规则(sp_workflow_event_rule)。
 * ⚠️ `trigger` 是后端 API 暴露名(@JsonProperty("trigger")),
 *    对应 Java 字段 triggerType / DB 列 trigger_type(避开 SQL 保留字)。
 *    前端读写一律用 trigger。
 */
export interface WorkflowEventRule {
  id?: string
  definitionId: string
  name?: string
  trigger: EventTrigger
  businessType: string
  actionType: EventAction
  /** SET_AUDIT_STATUS 时有效 */
  targetStatus?: AuditStatus | null
  /** SCRIPT 时有效 */
  script?: string | null
  enabled: boolean
  createTime?: string
  updateTime?: string
}

/** 分页参数 */
export interface CategoryPageParams {
  current: number
  size: number
  code?: string
  name?: string
}
export interface FormPageParams {
  current: number
  size: number
  name?: string
  formKey?: string
}
export interface DefinitionPageParams {
  current: number
  size: number
  name?: string
}
