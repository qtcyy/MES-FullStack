import { describe, it, expect } from 'vitest'
import { buildTree, collectSubtreeIds, mergeCheckedMenuIds, buildUserPayload, partitionDict, collectParentIds } from '@/utils/systemTree'

describe('buildTree', () => {
  it('平铺→树(rootId 默认 0)', () => {
    const flat = [
      { id: '1', parentId: '0', name: 'A' },
      { id: '2', parentId: '1', name: 'A-1' },
      { id: '3', parentId: '0', name: 'B' },
    ]
    const tree = buildTree(flat)
    expect(tree).toHaveLength(2)
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children![0].id).toBe('2')
  })
})
describe('collectSubtreeIds', () => {
  it('收集自身 + 全部后代', () => {
    const flat = [
      { id: '1', parentId: '0' }, { id: '2', parentId: '1' }, { id: '3', parentId: '2' }, { id: '4', parentId: '0' },
    ]
    expect([...collectSubtreeIds(flat, '1')].sort()).toEqual(['1', '2', '3'])
  })
})
describe('mergeCheckedMenuIds', () => {
  it('合并勾选+半选并去重', () => {
    expect(mergeCheckedMenuIds(['a', 'b'], ['b', 'c']).sort()).toEqual(['a', 'b', 'c'])
  })
})
describe('buildUserPayload', () => {
  it('编辑且密码空→剔除 password', () => {
    const out = buildUserPayload({ id: '1', username: 'u', password: '' }, true)
    expect(out).not.toHaveProperty('password')
  })
  it('新增→保留 password', () => {
    const out = buildUserPayload({ username: 'u', password: '123' }, false)
    expect(out.password).toBe('123')
  })
})
describe('partitionDict', () => {
  it('拆出类型(parentId=0)与按类型分组的项', () => {
    const rows = [
      { id: 't1', parentId: '0', name: '性别' },
      { id: 'i1', parentId: 't1', name: '男' },
      { id: 'i2', parentId: 't1', name: '女' },
    ]
    const { types, itemsByType } = partitionDict(rows)
    expect(types.map((t) => t.id)).toEqual(['t1'])
    expect(itemsByType['t1']).toHaveLength(2)
  })
})

describe('collectParentIds', () => {
  it('父节点 id 被收集,叶子节点 id 不被收集', () => {
    const tree = [
      {
        id: 'p1',
        children: [
          { id: 'c1', children: [] },
          { id: 'c2' },
        ],
      },
      { id: 'p2', children: [] },
    ]
    const parents = collectParentIds(tree)
    // p1 有非空 children → 是父节点
    expect(parents.has('p1')).toBe(true)
    // c1 children 为空数组 → 不是父节点
    expect(parents.has('c1')).toBe(false)
    // c2 无 children → 不是父节点
    expect(parents.has('c2')).toBe(false)
    // p2 children 为空数组 → 不是父节点
    expect(parents.has('p2')).toBe(false)
  })

  it('多层嵌套:中间层父节点全部被收集', () => {
    const tree = [
      {
        id: 'root',
        children: [
          {
            id: 'mid',
            children: [
              { id: 'leaf1' },
              { id: 'leaf2' },
            ],
          },
        ],
      },
    ]
    const parents = collectParentIds(tree)
    // root 和 mid 都是父节点
    expect(parents.has('root')).toBe(true)
    expect(parents.has('mid')).toBe(true)
    // leaf1/leaf2 是叶子
    expect(parents.has('leaf1')).toBe(false)
    expect(parents.has('leaf2')).toBe(false)
    // 共 2 个父节点
    expect(parents.size).toBe(2)
  })

  it('空树返回空集合', () => {
    expect(collectParentIds([]).size).toBe(0)
  })

  it('只含叶子节点(无 children)返回空集合', () => {
    const tree = [{ id: 'a' }, { id: 'b' }]
    expect(collectParentIds(tree).size).toBe(0)
  })
})
