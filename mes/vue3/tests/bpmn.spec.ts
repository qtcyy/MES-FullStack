import { describe, it, expect } from 'vitest'
import {
  initialBpmnXml,
  validateSummary,
  errorTaskIds,
  buildAssigneeProps,
  type BpmnSummary,
} from '@/utils/bpmn'

function summary(p: Partial<BpmnSummary>): BpmnSummary {
  return { hasStart: true, hasEnd: true, userTasks: [], disconnectedCount: 0, ...p }
}

describe('initialBpmnXml', () => {
  it('含 process id=modelKey 与转义后的 name', () => {
    const xml = initialBpmnXml('orderFlow', 'A & B <test>')
    expect(xml).toContain('<bpmn:process id="orderFlow"')
    expect(xml).toContain('name="A &amp; B &lt;test&gt;"')
    expect(xml).toContain('xmlns:flowable')
    expect(xml).toContain('StartEvent_1')
  })
})

describe('validateSummary', () => {
  it('完整流程(有始有终+已配办理人用户任务)→ ok', () => {
    const r = validateSummary(
      summary({ userTasks: [{ id: 'T1', name: '审批', assignee: '${initiator}' }] }),
    )
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([])
  })
  it('缺开始/结束/用户任务都报', () => {
    const r = validateSummary(summary({ hasStart: false, hasEnd: false, userTasks: [] }))
    expect(r.ok).toBe(false)
    expect(r.issues).toContain('缺少开始事件')
    expect(r.issues).toContain('缺少结束事件')
    expect(r.issues).toContain('至少需要一个用户任务节点')
  })
  it('用户任务未命名/未配办理人各报一条', () => {
    const r = validateSummary(summary({ userTasks: [{ id: 'T1' }] }))
    expect(r.issues).toContain('用户任务「T1」未命名')
    expect(r.issues).toContain('用户任务「T1」未配置办理人')
  })
  it('存在孤立节点报数量', () => {
    const r = validateSummary(
      summary({ userTasks: [{ id: 'T1', name: 'x', assignee: 'a' }], disconnectedCount: 2 }),
    )
    expect(r.issues).toContain('存在 2 个未连接的节点')
  })
})

describe('errorTaskIds', () => {
  it('返回未命名或未配办理人的用户任务 id', () => {
    const ids = errorTaskIds(
      summary({
        userTasks: [
          { id: 'T1', name: '已配', assignee: 'a' },
          { id: 'T2', name: '' },
          { id: 'T3', name: '无办理人' },
        ],
      }),
    )
    expect(ids).toEqual(['T2', 'T3'])
  })
})

describe('buildAssigneeProps', () => {
  it('initiator → assignee=${initiator},清 candidateGroups', () => {
    expect(buildAssigneeProps('initiator')).toEqual({
      'flowable:assignee': '${initiator}',
      'flowable:candidateGroups': undefined,
    })
  })
  it('candidate → candidateGroups=roleCode,清 assignee', () => {
    expect(buildAssigneeProps('candidate', 'ROLE_MGR')).toEqual({
      'flowable:assignee': undefined,
      'flowable:candidateGroups': 'ROLE_MGR',
    })
  })
})
