import { describe, it, expect } from 'vitest'
import { initialBpmnXml, validateSummary, buildAssigneeProps, errorTaskIds, type BpmnSummary } from '../bpmnUtils'

function summary(userTasks: BpmnSummary['userTasks']): BpmnSummary {
  return { hasStart: true, hasEnd: true, userTasks, disconnectedCount: 0 }
}

describe('errorTaskIds', () => {
  it('未命名的任务被标记', () => {
    expect(errorTaskIds(summary([{ id: 'T1', assignee: '${initiator}' }]))).toEqual(['T1'])
  })
  it('未配置办理人的任务被标记', () => {
    expect(errorTaskIds(summary([{ id: 'T2', name: '审批' }]))).toEqual(['T2'])
  })
  it('名称为纯空白视为未命名', () => {
    expect(errorTaskIds(summary([{ id: 'T3', name: '   ', candidateGroups: 'role_a' }]))).toEqual(['T3'])
  })
  it('完整配置的任务不被标记', () => {
    expect(errorTaskIds(summary([{ id: 'T4', name: '审批', assignee: '${initiator}' }]))).toEqual([])
  })
  it('混合：只返回有问题的 id', () => {
    const ids = errorTaskIds(
      summary([
        { id: 'A', name: '好', candidateGroups: 'r1' },
        { id: 'B', name: '坏' },
      ]),
    )
    expect(ids).toEqual(['B'])
  })
  it('空任务列表返回空数组', () => {
    expect(errorTaskIds(summary([]))).toEqual([])
  })
  it('保留多个问题任务的顺序', () => {
    const ids = errorTaskIds(
      summary([
        { id: 'X' },
        { id: 'Y', name: '完整', assignee: '${initiator}' },
        { id: 'Z', name: '   ' },
      ]),
    )
    expect(ids).toEqual(['X', 'Z'])
  })
})

describe('initialBpmnXml', () => {
  it('process id=modelKey、含 name 与开始事件', () => {
    const xml = initialBpmnXml('orderRecord', '生产订单审批流程')
    expect(xml).toContain('id="orderRecord"')
    expect(xml).toContain('name="生产订单审批流程"')
    expect(xml).toContain('bpmn:startEvent')
    expect(xml).toContain('xmlns:flowable')
  })
  it('转义 name 中的双引号', () => {
    expect(initialBpmnXml('k', 'a"b')).toContain('name="a&quot;b"')
  })
  it('转义 name 中的 & 与 < > (避免非良构 XML)', () => {
    expect(initialBpmnXml('k', '下单&发货 <急>')).toContain('name="下单&amp;发货 &lt;急&gt;"')
  })
})

const fullSummary: BpmnSummary = {
  hasStart: true,
  hasEnd: true,
  userTasks: [
    { id: 'UserTask_1', name: '计划员发起', assignee: '${initiator}' },
    { id: 'UserTask_2', name: '生产主管审批', candidateGroups: 'prod_manager' },
  ],
  disconnectedCount: 0,
}

describe('validateSummary', () => {
  it('完整定义 → ok,无问题', () => {
    const r = validateSummary(fullSummary)
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([])
  })
  it('缺开始/结束 → 报对应问题', () => {
    const r = validateSummary({ ...fullSummary, hasStart: false, hasEnd: false })
    expect(r.ok).toBe(false)
    expect(r.issues).toContain('缺少开始事件')
    expect(r.issues).toContain('缺少结束事件')
  })
  it('无用户任务 → 报问题', () => {
    const r = validateSummary({ ...fullSummary, userTasks: [] })
    expect(r.issues).toContain('至少需要一个用户任务节点')
  })
  it('用户任务未命名/未配办理人 → 报问题', () => {
    const r = validateSummary({
      ...fullSummary,
      userTasks: [{ id: 'UserTask_9' }],
    })
    expect(r.issues).toContain('用户任务「UserTask_9」未命名')
    expect(r.issues).toContain('用户任务「UserTask_9」未配置办理人')
  })
  it('有孤立节点 → 报数量', () => {
    expect(validateSummary({ ...fullSummary, disconnectedCount: 2 }).issues).toContain(
      '存在 2 个未连接的节点',
    )
  })
})

describe('buildAssigneeProps', () => {
  it('流程发起人 → assignee=${initiator},清空候选组', () => {
    expect(buildAssigneeProps('initiator')).toEqual({
      'flowable:assignee': '${initiator}',
      'flowable:candidateGroups': undefined,
    })
  })
  it('候选组 → candidateGroups=角色code,清空 assignee', () => {
    expect(buildAssigneeProps('candidate', 'prod_manager')).toEqual({
      'flowable:assignee': undefined,
      'flowable:candidateGroups': 'prod_manager',
    })
  })
  it('候选组无角色 → candidateGroups undefined', () => {
    expect(buildAssigneeProps('candidate')).toEqual({
      'flowable:assignee': undefined,
      'flowable:candidateGroups': undefined,
    })
  })
})
