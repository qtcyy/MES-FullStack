import { describe, it, expect } from 'vitest'
import { buildTree } from '@/utils/tree'

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
