// src/utils/workflow.ts —— 工作流配置纯函数(校验/payload/枚举标签/示例规则)
import type {
  WorkflowCategory,
  WorkflowForm,
  WorkflowEventRule,
  EventTrigger,
  EventAction,
  AuditStatus,
} from '@/types/workflow'

/** 审计/只读字段,构造 payload 时剥除 */
const AUDIT_FIELDS = ['createTime', 'updateTime', 'createUsername', 'updateUsername'] as const

/** 通用:剥审计字段 + 空串/空值;保留 boolean false 与 id */
function stripPayload<T extends Record<string, unknown>>(form: T): Partial<T> {
  const out: Record<string, unknown> = {}
  Object.entries(form).forEach(([k, v]) => {
    if ((AUDIT_FIELDS as readonly string[]).includes(k)) return
    if (v === undefined || v === null || v === '') return
    out[k] = v
  })
  return out as Partial<T>
}

const CODE_RE = /^[A-Za-z0-9_]+$/
const FORM_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/

/** 校验流程分类;返回首条错误文案,合法返回空串 */
export function validateCategory(form: Partial<WorkflowCategory>): string {
  if (!form.code?.trim()) return '请输入分类编码'
  if (!form.name?.trim()) return '请输入分类名称'
  if (!CODE_RE.test(form.code)) return '编码须为字母/数字/下划线'
  return ''
}

/** 校验流程表单;返回首条错误文案,合法返回空串 */
export function validateForm(form: Partial<WorkflowForm>): string {
  if (!form.name?.trim()) return '请输入表单名称'
  if (!form.formKey?.trim()) return '请输入表单 key'
  if (!FORM_KEY_RE.test(form.formKey)) return '表单 key 须字母开头(字母/数字/下划线)'
  return ''
}

/** 校验事件规则;返回首条错误文案,合法返回空串 */
export function validateEventRule(rule: Partial<WorkflowEventRule>): string {
  if (!rule.trigger) return '请选择触发时机'
  if (!rule.actionType) return '请选择动作类型'
  if (rule.actionType === 'SET_AUDIT_STATUS' && !rule.targetStatus) return '请选择目标审批状态'
  if (rule.actionType === 'SCRIPT' && !rule.script?.trim()) return '请输入业务脚本'
  return ''
}

/** 流程分类 payload */
export function buildCategoryPayload(form: Partial<WorkflowCategory>): Partial<WorkflowCategory> {
  return stripPayload(form)
}

/** 流程表单 payload(skipSameAssignee 为 boolean,即便 false 也保留) */
export function buildFormPayload(form: Partial<WorkflowForm>): Partial<WorkflowForm> {
  const out = stripPayload(form) as Partial<WorkflowForm>
  out.skipSameAssignee = form.skipSameAssignee ?? false
  return out
}

/** 事件规则 payload(enabled 为 boolean 保留) */
export function buildEventPayload(rule: Partial<WorkflowEventRule>): Partial<WorkflowEventRule> {
  const out = stripPayload(rule) as Partial<WorkflowEventRule>
  out.enabled = rule.enabled ?? true
  return out
}

// ── 枚举标签 ──────────────────────────────────────────────────────────
const TRIGGER_LABEL: Record<EventTrigger, string> = {
  START: '流程启动',
  TASK_COMPLETE: '任务完成',
  END: '流程结束',
  REJECT: '流程驳回',
}
const ACTION_LABEL: Record<EventAction, string> = {
  SET_AUDIT_STATUS: '设置审批状态',
  SCRIPT: '执行脚本',
}
const AUDIT_STATUS_LABEL: Record<AuditStatus, string> = {
  DRAFT: '草稿',
  APPROVING: '审批中',
  APPROVED: '审批通过',
  REJECTED: '审批驳回',
}

export function triggerLabel(t?: EventTrigger): string {
  if (!t) return ''
  return TRIGGER_LABEL[t] ?? t
}
export function actionLabel(a?: EventAction): string {
  if (!a) return ''
  return ACTION_LABEL[a] ?? a
}
export function auditStatusLabel(s?: AuditStatus | null): string {
  if (!s) return ''
  return AUDIT_STATUS_LABEL[s] ?? s
}

// ── 下拉选项常量 ──────────────────────────────────────────────────────
export interface Option<V = string> {
  value: V
  label: string
}

export const TRIGGER_OPTIONS: Option<EventTrigger>[] = (
  ['START', 'TASK_COMPLETE', 'END', 'REJECT'] as EventTrigger[]
).map((v) => ({ value: v, label: TRIGGER_LABEL[v] }))

export const ACTION_OPTIONS: Option<EventAction>[] = (
  ['SET_AUDIT_STATUS', 'SCRIPT'] as EventAction[]
).map((v) => ({ value: v, label: ACTION_LABEL[v] }))

export const AUDIT_STATUS_OPTIONS: Option<AuditStatus>[] = (
  ['DRAFT', 'APPROVING', 'APPROVED', 'REJECTED'] as AuditStatus[]
).map((v) => ({ value: v, label: AUDIT_STATUS_LABEL[v] }))

/** 「填入示例」三条规则:发起→审批中 / 结束→通过 / 驳回→驳回 */
export function sampleEventRules(definitionId: string): WorkflowEventRule[] {
  const mk = (
    name: string,
    trigger: EventTrigger,
    targetStatus: AuditStatus,
  ): WorkflowEventRule => ({
    definitionId,
    name,
    trigger,
    businessType: 'ORDER_APPROVAL',
    actionType: 'SET_AUDIT_STATUS',
    targetStatus,
    enabled: true,
  })
  return [
    mk('发起即审批中', 'START', 'APPROVING'),
    mk('通过置审批通过', 'END', 'APPROVED'),
    mk('驳回置审批驳回', 'REJECT', 'REJECTED'),
  ]
}

/** 表单脚本默认模板(新增表单时一键填充,可选用) */
export function defaultFormScripts(): Pick<
  WorkflowForm,
  'titleScript' | 'pcUrlScript' | 'mobileUrlScript'
> {
  return {
    titleScript: '生产订单审批 - ${orderCode}',
    pcUrlScript: '/order/detail?id=${businessId}',
    mobileUrlScript: '/mobile/order/detail?id=${businessId}',
  }
}
