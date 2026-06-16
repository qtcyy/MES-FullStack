import { describe, it, expect } from 'vitest'
import { materielToItem, pickRootSubtree } from '../productBom'
import type { BomTreeNode } from '@/types/technology'
import type { Materiel } from '@/types/basedata'

describe('materielToItem', () => {
  it('materiel 映射为 materialCode(拼写转换)并带出描述/单位', () => {
    const m = { id: '1', materiel: 'P001', materielDesc: '产品A', unit: '台', deleted: '0' } as Materiel
    expect(materielToItem(m)).toEqual({ materialCode: 'P001', materialDesc: '产品A', unit: '台' })
  })
  it('单位缺省回退为 个', () => {
    const m = { id: '1', materiel: 'P001', materielDesc: '产品A', deleted: '0' } as Materiel
    expect(materielToItem(m).unit).toBe('个')
  })
})

describe('pickRootSubtree', () => {
  const tree: BomTreeNode[] = [
    { id: 'r1', nodeName: '根1', children: [{ id: 'c1', nodeName: '子1', children: [], itemCount: 0 }], itemCount: 1 },
    { id: 'r2', nodeName: '根2', children: [], itemCount: 0 },
  ]
  it('命中顶层根', () => expect(pickRootSubtree(tree, 'r2')?.nodeName).toBe('根2'))
  it('深度命中子节点', () => expect(pickRootSubtree(tree, 'c1')?.nodeName).toBe('子1'))
  it('未命中返回 undefined', () => expect(pickRootSubtree(tree, 'x')).toBeUndefined())
})
