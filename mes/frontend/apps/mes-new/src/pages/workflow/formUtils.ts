import type {
  OrderAuditStatus,
  WorkflowEventActionType,
  WorkflowEventRuleDraft,
  WorkflowEventTrigger,
} from '@/types/workflow'

/** 表单 key：字母开头，仅字母/数字/下划线 */
export const FORM_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/

/** 默认脚本模板（新建表单预填，便于演示；mock 不执行） */
export const DEFAULT_TITLE_SCRIPT = '生产订单审批 - ${orderCode}'
export const DEFAULT_PC_URL_SCRIPT = '/order/detail?id=${businessId}'
export const DEFAULT_MOBILE_URL_SCRIPT = '/mobile/order/detail?id=${businessId}'

/** 脚本可用变量提示 */
export const SCRIPT_VARIABLES: { token: string; label: string }[] = [
  { token: '${orderCode}', label: '订单号' },
  { token: '${businessId}', label: '业务主键' },
  { token: '${businessType}', label: '业务类型' },
  { token: '${initiator}', label: '发起人' },
  { token: '${processName}', label: '流程名' },
]

/** 触发时机 / 动作 / 审批状态 选项（label 映射，UI 与展示共用） */
export const TRIGGER_OPTIONS: { value: WorkflowEventTrigger; label: string }[] = [
  { value: 'START', label: '流程启动' },
  { value: 'TASK_COMPLETE', label: '任务完成' },
  { value: 'END', label: '流程结束(通过)' },
  { value: 'REJECT', label: '流程驳回' },
]

export const ACTION_OPTIONS: { value: WorkflowEventActionType; label: string }[] = [
  { value: 'SET_AUDIT_STATUS', label: '设置审批状态' },
  { value: 'SCRIPT', label: '执行脚本' },
]

export const AUDIT_STATUS_OPTIONS: { value: OrderAuditStatus; label: string }[] = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'APPROVING', label: '审批中' },
  { value: 'APPROVED', label: '审批通过' },
  { value: 'REJECTED', label: '审批驳回' },
]

export function triggerLabel(t: WorkflowEventTrigger): string {
  return TRIGGER_OPTIONS.find((o) => o.value === t)?.label ?? t
}
export function auditStatusLabel(s?: OrderAuditStatus): string {
  return AUDIT_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? (s ?? '')
}

/** 纯函数：生产订单审批的三条预置事件规则草稿 */
export function defaultEventRules(definitionId: string): WorkflowEventRuleDraft[] {
  const base = { definitionId, businessType: 'ORDER_APPROVAL', actionType: 'SET_AUDIT_STATUS' as const, enabled: true }
  return [
    { ...base, name: '发起即审批中', trigger: 'START' as const, targetStatus: 'APPROVING' as const },
    { ...base, name: '通过置审批通过', trigger: 'END' as const, targetStatus: 'APPROVED' as const },
    { ...base, name: '驳回置审批驳回', trigger: 'REJECT' as const, targetStatus: 'REJECTED' as const },
  ]
}
