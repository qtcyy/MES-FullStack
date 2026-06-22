import { describe, it, expect } from 'vitest'
import {
  validateCategory,
  validateForm,
  validateEventRule,
  buildCategoryPayload,
  buildFormPayload,
  buildEventPayload,
  triggerLabel,
  actionLabel,
  auditStatusLabel,
  sampleEventRules,
  TRIGGER_OPTIONS,
  ACTION_OPTIONS,
  AUDIT_STATUS_OPTIONS,
} from '@/utils/workflow'
import type { WorkflowEventRule } from '@/types/workflow'

describe('validateCategory', () => {
  it('编码必填', () => {
    expect(validateCategory({ code: '', name: '审批' })).toBe('请输入分类编码')
  })
  it('名称必填', () => {
    expect(validateCategory({ code: 'ORDER', name: '' })).toBe('请输入分类名称')
  })
  it('编码须字母数字下划线', () => {
    expect(validateCategory({ code: '订单-1', name: '审批' })).toBe('编码须为字母/数字/下划线')
  })
  it('合法返回空串', () => {
    expect(validateCategory({ code: 'ORDER_1', name: '审批' })).toBe('')
  })
})

describe('validateForm', () => {
  it('名称必填', () => {
    expect(validateForm({ name: '', formKey: 'orderForm' })).toBe('请输入表单名称')
  })
  it('formKey 必填', () => {
    expect(validateForm({ name: '订单表单', formKey: '' })).toBe('请输入表单 key')
  })
  it('formKey 须字母开头', () => {
    expect(validateForm({ name: '订单表单', formKey: '1order' })).toBe('表单 key 须字母开头(字母/数字/下划线)')
  })
  it('formKey 不允许中划线', () => {
    expect(validateForm({ name: '订单表单', formKey: 'order-form' })).toBe('表单 key 须字母开头(字母/数字/下划线)')
  })
  it('合法返回空串', () => {
    expect(validateForm({ name: '订单表单', formKey: 'orderForm1' })).toBe('')
  })
})

describe('validateEventRule', () => {
  const base: Partial<WorkflowEventRule> = { definitionId: 'd1', trigger: 'START', actionType: 'SET_AUDIT_STATUS' }
  it('触发时机必填', () => {
    expect(validateEventRule({ ...base, trigger: undefined })).toBe('请选择触发时机')
  })
  it('动作类型必填', () => {
    expect(validateEventRule({ ...base, actionType: undefined })).toBe('请选择动作类型')
  })
  it('SET_AUDIT_STATUS 须有目标状态', () => {
    expect(validateEventRule({ ...base, actionType: 'SET_AUDIT_STATUS', targetStatus: null })).toBe('请选择目标审批状态')
  })
  it('SCRIPT 须有脚本', () => {
    expect(validateEventRule({ ...base, actionType: 'SCRIPT', script: '' })).toBe('请输入业务脚本')
  })
  it('SET_AUDIT_STATUS 合法', () => {
    expect(validateEventRule({ ...base, actionType: 'SET_AUDIT_STATUS', targetStatus: 'APPROVING' })).toBe('')
  })
  it('SCRIPT 合法', () => {
    expect(validateEventRule({ ...base, actionType: 'SCRIPT', script: 'doSomething()' })).toBe('')
  })
})

describe('buildCategoryPayload', () => {
  it('剥空串与审计字段、保留 id', () => {
    const p = buildCategoryPayload({ id: 'c1', code: 'ORDER', name: '审批', descr: '', createTime: 'x', updateTime: 'y' })
    expect(p).toEqual({ id: 'c1', code: 'ORDER', name: '审批' })
  })
  it('新增无 id', () => {
    expect(buildCategoryPayload({ code: 'A', name: 'B' }).id).toBeUndefined()
  })
})

describe('buildFormPayload', () => {
  it('保留 boolean skipSameAssignee、剥审计字段', () => {
    const p = buildFormPayload({ name: '表单', formKey: 'f1', formType: 'URL', skipSameAssignee: false, titleScript: '', createTime: 'x' })
    expect(p).toEqual({ name: '表单', formKey: 'f1', formType: 'URL', skipSameAssignee: false })
  })
})

describe('buildEventPayload', () => {
  it('剥审计字段、保留 trigger/enabled', () => {
    const p = buildEventPayload({ definitionId: 'd1', trigger: 'END', businessType: 'ORDER_APPROVAL', actionType: 'SET_AUDIT_STATUS', targetStatus: 'APPROVED', script: null, enabled: true, createTime: 'x' })
    expect(p).toEqual({ definitionId: 'd1', trigger: 'END', businessType: 'ORDER_APPROVAL', actionType: 'SET_AUDIT_STATUS', targetStatus: 'APPROVED', enabled: true })
  })
})

describe('枚举标签', () => {
  it('triggerLabel', () => {
    expect(triggerLabel('START')).toBe('流程启动')
    expect(triggerLabel('END')).toBe('流程结束')
    expect(triggerLabel('XX' as never)).toBe('XX')
  })
  it('actionLabel', () => {
    expect(actionLabel('SET_AUDIT_STATUS')).toBe('设置审批状态')
    expect(actionLabel('SCRIPT')).toBe('执行脚本')
  })
  it('auditStatusLabel', () => {
    expect(auditStatusLabel('APPROVING')).toBe('审批中')
    expect(auditStatusLabel(undefined)).toBe('')
  })
})

describe('sampleEventRules', () => {
  it('返回三条带 definitionId 的示例规则', () => {
    const rules = sampleEventRules('def-1')
    expect(rules).toHaveLength(3)
    expect(rules.every((r) => r.definitionId === 'def-1')).toBe(true)
    expect(rules.every((r) => r.businessType === 'ORDER_APPROVAL')).toBe(true)
    expect(rules.every((r) => r.enabled === true)).toBe(true)
    expect(rules.map((r) => r.trigger)).toEqual(['START', 'END', 'REJECT'])
    expect(rules.map((r) => r.targetStatus)).toEqual(['APPROVING', 'APPROVED', 'REJECTED'])
  })
})

describe('选项常量', () => {
  it('TRIGGER_OPTIONS', () => {
    expect(TRIGGER_OPTIONS.map((o) => o.value)).toEqual(['START', 'TASK_COMPLETE', 'END', 'REJECT'])
  })
  it('ACTION_OPTIONS', () => {
    expect(ACTION_OPTIONS.map((o) => o.value)).toEqual(['SET_AUDIT_STATUS', 'SCRIPT'])
  })
  it('AUDIT_STATUS_OPTIONS', () => {
    expect(AUDIT_STATUS_OPTIONS.map((o) => o.value)).toEqual(['DRAFT', 'APPROVING', 'APPROVED', 'REJECTED'])
  })
})
