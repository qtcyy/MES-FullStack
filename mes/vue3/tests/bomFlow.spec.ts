import { describe, it, expect } from 'vitest'
import {
  buildBomNodeTree,
  canWriteBomFlow,
  buildBindPayload,
  flowOperRows,
} from '@/utils/bomFlow'
import type { BomFlowNodeVO, FlowOperItem } from '@/types/technology'

const flat: BomFlowNodeVO[] = [
  { bomNode: { id: 'r1', nodeName: '产品A', level: 0, status: 'draft', sortOrder: 0 } },
  {
    bomNode: { id: 'c2', nodeName: '组件B', parentId: 'r1', level: 1, status: 'draft', sortOrder: 2 },
    bomFlow: { id: 'bf2', bomId: 'c2', flowId: 'f9', status: 'draft' },
    flow: { id: 'f9', flow: 'FLOW-9', flowDesc: '装配线' },
  },
  { bomNode: { id: 'c1', nodeName: '组件A', parentId: 'r1', level: 1, status: 'draft', sortOrder: 1 } },
]

describe('buildBomNodeTree', () => {
  it('按 parentId 建树,根含两个子', () => {
    const tree = buildBomNodeTree(flat)
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('r1')
    expect(tree[0].children).toHaveLength(2)
  })
  it('同级按 sortOrder 升序(组件A 在前)', () => {
    const tree = buildBomNodeTree(flat)
    expect(tree[0].children.map((n) => n.id)).toEqual(['c1', 'c2'])
  })
  it('展平 bomNode 字段并挂 flow 到顶层', () => {
    const tree = buildBomNodeTree(flat)
    const c2 = tree[0].children.find((n) => n.id === 'c2')!
    expect(c2.nodeName).toBe('组件B')
    expect(c2.flow?.flow).toBe('FLOW-9')
  })
  it('parentId 指向不存在节点时作为根', () => {
    const orphan: BomFlowNodeVO[] = [
      { bomNode: { id: 'x', nodeName: '孤儿', parentId: 'ghost', status: 'draft' } },
    ]
    expect(buildBomNodeTree(orphan)).toHaveLength(1)
  })
})

describe('canWriteBomFlow', () => {
  it('全 draft 可写', () => {
    expect(canWriteBomFlow('draft', 'draft', 'draft')).toBe(true)
  })
  it('根锁定不可写', () => {
    expect(canWriteBomFlow('locked', 'draft', 'draft')).toBe(false)
  })
  it('绑定锁定不可写', () => {
    expect(canWriteBomFlow('draft', 'locked', 'draft')).toBe(false)
  })
  it('节点锁定不可写', () => {
    expect(canWriteBomFlow('draft', 'draft', 'locked')).toBe(false)
  })
  it('绑定状态 undefined 视为 draft 可写', () => {
    expect(canWriteBomFlow('draft', undefined, 'draft')).toBe(true)
  })
})

describe('buildBindPayload', () => {
  it('无备注只带 bomId/flowId', () => {
    expect(buildBindPayload('b1', 'f1')).toEqual({ bomId: 'b1', flowId: 'f1' })
  })
  it('带备注且 trim', () => {
    expect(buildBindPayload('b1', 'f1', '  急件 ')).toEqual({ bomId: 'b1', flowId: 'f1', remark: '急件' })
  })
  it('空白备注剥除', () => {
    expect(buildBindPayload('b1', 'f1', '   ')).toEqual({ bomId: 'b1', flowId: 'f1' })
  })
})

describe('flowOperRows', () => {
  const opers: FlowOperItem[] = [
    { relation: { id: 'r1', sortNum: 1, operType: 'firstOper', oper: 'OPR-1' }, oper: { id: 'o1', operDesc: '下料' } },
    { relation: { id: 'r2', sortNum: 2, operType: 'lastOper', oper: 'OPR-2' }, oper: { id: 'o2', operDesc: '装配' } },
  ]
  it('映射序号/描述/标记', () => {
    expect(flowOperRows(opers)).toEqual([
      { seq: 1, operDesc: '下料', mark: '首道' },
      { seq: 2, operDesc: '装配', mark: '末道' },
    ])
  })
  it('oper 缺失回落 relation.oper', () => {
    const rows = flowOperRows([{ relation: { id: 'r3', sortNum: 1, oper: 'OPR-9' } }])
    expect(rows[0].operDesc).toBe('OPR-9')
    expect(rows[0].mark).toBe('')
  })
  it('空/undefined 返回空数组', () => {
    expect(flowOperRows(undefined)).toEqual([])
    expect(flowOperRows([])).toEqual([])
  })
})
