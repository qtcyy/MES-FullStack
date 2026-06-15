import { describe, it, expect } from 'vitest'
import {
  buildTree,
  flattenTreeForSelect,
  getCheckState,
  toggleNode,
  collectGrantedIds,
  type CheckTreeNode,
} from '@/utils/tree'

describe('buildTree', () => {
  it('扁平含 parentId 列表构建为嵌套树,parentId 不命中者作根', () => {
    const items = [
      { id: '1', parentId: '0', name: 'A' },
      { id: '2', parentId: '1', name: 'A-1' },
      { id: '3', parentId: '1', name: 'A-2' },
      { id: '4', parentId: '', name: 'B' },
    ]
    const tree = buildTree(items)
    expect(tree).toHaveLength(2) // A(parentId '0' 无对应节点→根) + B
    const a = tree.find((n) => n.id === '1')!
    expect(a.children.map((c) => c.id)).toEqual(['2', '3'])
    expect(tree.find((n) => n.id === '4')!.children).toEqual([])
  })

  it('乱序输入也能正确挂接', () => {
    const items = [
      { id: '2', parentId: '1' },
      { id: '1', parentId: '0' },
    ]
    const tree = buildTree(items)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.children[0]!.id).toBe('2')
  })
})

describe('flattenTreeForSelect', () => {
  const nodes = [
    { id: '1', name: 'A', children: [{ id: '2', name: 'A-1', children: [{ id: '3', name: 'A-1-1' }] }] },
    { id: '4', name: 'B' },
  ]

  it('深度优先扁平化,按层级用全角空格缩进 label', () => {
    const opts = flattenTreeForSelect(nodes)
    expect(opts.map((o) => o.value)).toEqual(['1', '2', '3', '4'])
    expect(opts[0]!.label).toBe('A')
    expect(opts[1]!.label).toBe('　A-1')
    expect(opts[2]!.label).toBe('　　A-1-1')
  })

  it('excludeId 同时排除该节点及其全部子孙(防自环)', () => {
    const opts = flattenTreeForSelect(nodes, { excludeId: '1' })
    expect(opts.map((o) => o.value)).toEqual(['4'])
  })
})

describe('勾选级联', () => {
  const tree: CheckTreeNode[] = [
    { id: 'p', children: [{ id: 'c1' }, { id: 'c2' }] },
    { id: 'leaf' },
  ]

  it('getCheckState:全选子→父 checked;部分→indeterminate;全不选→unchecked', () => {
    expect(getCheckState(tree[0]!, new Set(['c1', 'c2']))).toBe('checked')
    expect(getCheckState(tree[0]!, new Set(['c1']))).toBe('indeterminate')
    expect(getCheckState(tree[0]!, new Set())).toBe('unchecked')
    expect(getCheckState(tree[1]!, new Set(['leaf']))).toBe('checked')
  })

  it('toggleNode:勾选父则连带全部子孙;再次切换则全清', () => {
    const after = toggleNode(tree[0]!, new Set())
    expect(after.has('p')).toBe(true)
    expect(after.has('c1')).toBe(true)
    expect(after.has('c2')).toBe(true)
    const cleared = toggleNode(tree[0]!, after)
    expect(cleared.has('p')).toBe(false)
    expect(cleared.has('c1')).toBe(false)
  })

  it('collectGrantedIds:含半选祖先(被授权叶子的祖先一并返回)', () => {
    // 仅勾选 c1 → p 半选;授权集应含 p 与 c1,不含 c2/leaf
    const granted = collectGrantedIds(tree, new Set(['c1']))
    expect(new Set(granted)).toEqual(new Set(['p', 'c1']))
  })

  it('collectGrantedIds:父全选时返回父+全部子孙', () => {
    const granted = collectGrantedIds(tree, new Set(['c1', 'c2']))
    expect(new Set(granted)).toEqual(new Set(['p', 'c1', 'c2']))
  })
})
