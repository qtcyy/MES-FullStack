import { describe, it, expect } from 'vitest'
import {
  FORM_KEY_REGEX,
  defaultEventRules,
  DEFAULT_TITLE_SCRIPT,
  DEFAULT_PC_URL_SCRIPT,
  DEFAULT_MOBILE_URL_SCRIPT,
} from '../formUtils'

describe('FORM_KEY_REGEX', () => {
  it('合法 key 通过', () => {
    expect(FORM_KEY_REGEX.test('orderRecord')).toBe(true)
    expect(FORM_KEY_REGEX.test('a_1')).toBe(true)
  })
  it('非法 key 拒绝', () => {
    expect(FORM_KEY_REGEX.test('1abc')).toBe(false)
    expect(FORM_KEY_REGEX.test('order-record')).toBe(false)
    expect(FORM_KEY_REGEX.test('')).toBe(false)
  })
})

describe('脚本模板常量', () => {
  it('三个默认脚本均非空', () => {
    expect(DEFAULT_TITLE_SCRIPT.trim()).not.toBe('')
    expect(DEFAULT_PC_URL_SCRIPT.trim()).not.toBe('')
    expect(DEFAULT_MOBILE_URL_SCRIPT.trim()).not.toBe('')
  })
})

describe('defaultEventRules', () => {
  it('返回三条生产订单审批示例(启动/通过/驳回)', () => {
    const rules = defaultEventRules('DEF1')
    expect(rules).toHaveLength(3)
    expect(rules.every((r) => r.definitionId === 'DEF1')).toBe(true)
    expect(rules.every((r) => r.businessType === 'ORDER_APPROVAL')).toBe(true)
    expect(rules.every((r) => r.actionType === 'SET_AUDIT_STATUS')).toBe(true)
    expect(rules.map((r) => r.trigger)).toEqual(['START', 'END', 'REJECT'])
    expect(rules.map((r) => r.targetStatus)).toEqual(['APPROVING', 'APPROVED', 'REJECTED'])
    expect(rules.every((r) => r.enabled)).toBe(true)
  })
})
