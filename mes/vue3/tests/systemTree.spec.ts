import { describe, it, expect } from 'vitest'
import { buildTree, collectSubtreeIds, mergeCheckedMenuIds, buildUserPayload, partitionDict } from '@/utils/systemTree'

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
