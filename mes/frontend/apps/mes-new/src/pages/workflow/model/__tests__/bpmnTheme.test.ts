import { describe, it, expect } from 'vitest'
import { colorFor } from '../bpmnTheme'

describe('colorFor', () => {
  it('开始事件 → 绿(亮色)', () => {
    expect(colorFor('bpmn:StartEvent', 'light')).toEqual({ stroke: '#059669', fill: '#d1fae5' })
  })
  it('结束事件 → 红(暗色)', () => {
    expect(colorFor('bpmn:EndEvent', 'dark')).toEqual({ stroke: '#fb7185', fill: 'rgba(244,63,94,.18)' })
  })
  it('用户任务 → 蓝(亮色)', () => {
    expect(colorFor('bpmn:UserTask', 'light')).toEqual({ stroke: '#2563eb', fill: '#dbeafe' })
  })
  it('普通任务也按任务着色', () => {
    expect(colorFor('bpmn:Task', 'light')?.stroke).toBe('#2563eb')
  })
  it('网关 → 琥珀(亮色)', () => {
    expect(colorFor('bpmn:ExclusiveGateway', 'light')).toEqual({ stroke: '#d97706', fill: '#fef3c7' })
  })
  it('未覆盖类型返回 null(保留默认渲染)', () => {
    expect(colorFor('bpmn:SubProcess', 'light')).toBeNull()
    expect(colorFor(undefined, 'light')).toBeNull()
  })
})
