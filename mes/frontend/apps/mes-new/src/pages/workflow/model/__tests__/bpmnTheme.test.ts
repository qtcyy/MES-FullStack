// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { colorFor, FLOW_STROKE, currentMode } from '../bpmnTheme'

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
  it('用户任务 → 蓝(暗色)', () => {
    expect(colorFor('bpmn:UserTask', 'dark')).toEqual({ stroke: '#60a5fa', fill: 'rgba(59,130,246,.20)' })
  })
})

describe('FLOW_STROKE', () => {
  it('亮色连线描边为中性灰', () => {
    expect(FLOW_STROKE.light).toBe('#64748b')
  })
  it('暗色连线描边为深灰', () => {
    expect(FLOW_STROKE.dark).toBe('#7c8699')
  })
})

describe('currentMode', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('无 .dark 类时返回 light', () => {
    document.documentElement.classList.remove('dark')
    expect(currentMode()).toBe('light')
  })
  it('有 .dark 类时返回 dark', () => {
    document.documentElement.classList.add('dark')
    expect(currentMode()).toBe('dark')
  })
})
