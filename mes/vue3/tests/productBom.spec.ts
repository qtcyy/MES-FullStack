import { describe, it, expect } from 'vitest'
import {
  findBomNode,
  pickBomSubtree,
  canWriteBom,
  buildBomNodePayload,
  validateBomNode,
  buildBomItemPayload,
  validateBomItem,
  materielToItem,
} from '@/utils/productBom'
import type { BomTreeNode } from '@/types/technology'

const forest: BomTreeNode[] = [
  {
    id: 'r1', nodeName: '产品A', level: 0, status: 'draft', version: 'V1.0',
    children: [
      { id: 'c1', nodeName: '半成品B', level: 1, status: 'draft', children: [
        { id: 'g1', nodeName: '组件C', level: 2, status: 'draft', children: [] },
      ] },
    ],
  },
  { id: 'r2', nodeName: '产品X', level: 0, status: 'locked', version: 'V2.0', children: [] },
]

describe('findBomNode', () => {
  it('在树内深搜命中孙节点', () => {
    expect(findBomNode(forest[0], 'g1')?.nodeName).toBe('组件C')
  })
  it('未命中返回 undefined', () => {
    expect(findBomNode(forest[0], 'nope')).toBeUndefined()
  })
})

describe('pickBomSubtree', () => {
  it('从森林按根 id 取子树', () => {
    expect(pickBomSubtree(forest, 'r2')?.nodeName).toBe('产品X')
  })
  it('可取到非根 id 的子树', () => {
    expect(pickBomSubtree(forest, 'c1')?.nodeName).toBe('半成品B')
  })
  it('未命中返回 undefined', () => {
    expect(pickBomSubtree(forest, 'zzz')).toBeUndefined()
  })
})

describe('canWriteBom', () => {
  it('draft 可写', () => expect(canWriteBom('draft')).toBe(true))
  it('locked 只读', () => expect(canWriteBom('locked')).toBe(false))
  it('undefined 视为可写', () => expect(canWriteBom(undefined)).toBe(true))
})

describe('buildBomNodePayload', () => {
  it('create-root:带 productCode,剥空串,sortOrder 数值化', () => {
    const p = buildBomNodePayload(
      { productCode: 'FG-001', nodeName: '产品A', remark: '', sortOrder: '2' as unknown as number },
      { mode: 'create-root' },
    )
    expect(p).toEqual({ productCode: 'FG-001', nodeName: '产品A', sortOrder: 2 })
  })
  it('add-child:带 parentId,不带 productCode', () => {
    const p = buildBomNodePayload(
      { nodeName: '半成品B' }, { mode: 'add-child', parentId: 'r1' },
    )
    expect(p).toEqual({ nodeName: '半成品B', parentId: 'r1' })
  })
  it('edit:带 id', () => {
    const p = buildBomNodePayload(
      { id: 'c1', nodeName: '半成品B2' }, { mode: 'edit' },
    )
    expect(p).toEqual({ id: 'c1', nodeName: '半成品B2' })
  })
})

describe('validateBomNode', () => {
  it('nodeName 必填', () => {
    expect(validateBomNode({ nodeName: '' }, 'add-child')).toBe('请输入节点名称')
  })
  it('create-root 需要 productCode', () => {
    expect(validateBomNode({ nodeName: '产品A' }, 'create-root')).toBe('请选择产品物料')
  })
  it('create-root 齐全通过', () => {
    expect(validateBomNode({ nodeName: '产品A', productCode: 'FG-001' }, 'create-root')).toBeNull()
  })
  it('add-child 有 nodeName 即通过', () => {
    expect(validateBomNode({ nodeName: '半成品B' }, 'add-child')).toBeNull()
  })
})

describe('buildBomItemPayload', () => {
  it('quantity 数值化,unit/itemType 兜底,带 bomId', () => {
    const p = buildBomItemPayload({
      bomId: 'c1', materialCode: 'M-1', materialDesc: '螺丝',
      quantity: '3' as unknown as number, unit: '', sortOrder: undefined,
    })
    expect(p).toEqual({
      bomId: 'c1', itemType: 'material', materialCode: 'M-1',
      materialDesc: '螺丝', quantity: 3, unit: '个',
    })
  })
  it('编辑保留 id 与已填 unit/itemType', () => {
    const p = buildBomItemPayload({
      id: 'i1', bomId: 'c1', itemType: 'bom_ref', materialCode: 'M-2',
      quantity: 2, unit: '箱',
    })
    expect(p.id).toBe('i1')
    expect(p.unit).toBe('箱')
    expect(p.itemType).toBe('bom_ref')
  })
})

describe('validateBomItem', () => {
  it('materialCode 必填', () => {
    expect(validateBomItem({ materialCode: '', quantity: 1 })).toBe('请选择物料')
  })
  it('quantity 须 ≥ 0.01', () => {
    expect(validateBomItem({ materialCode: 'M-1', quantity: 0 })).toBe('用量必须大于 0')
  })
  it('齐全通过', () => {
    expect(validateBomItem({ materialCode: 'M-1', quantity: 1.5 })).toBeNull()
  })
  it('负数用量被拒', () => {
    expect(validateBomItem({ materialCode: 'M-1', quantity: -1 })).toBe('用量必须大于 0')
  })
})

describe('materielToItem', () => {
  it('物料映射为行项目字段,unit 兜底', () => {
    expect(materielToItem({ id: 'x', materiel: 'M-1', materielDesc: '螺丝' })).toEqual({
      materialCode: 'M-1', materialDesc: '螺丝', unit: '个',
    })
  })
  it('保留物料单位', () => {
    expect(materielToItem({ id: 'x', materiel: 'M-2', materielDesc: '箱', unit: '箱' }).unit).toBe('箱')
  })
})
