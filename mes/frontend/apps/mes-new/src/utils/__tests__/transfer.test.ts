import { describe, it, expect } from 'vitest'
import { filterTransferItems, excludeSelected, moveItem } from '../transfer'

describe('filterTransferItems', () => {
  const items = [
    { id: '1', primary: 'CNC-01', secondary: '数控机床' },
    { id: '2', primary: 'LASER-02', secondary: '激光切割' },
  ]
  it('空关键字返回全部', () => {
    expect(filterTransferItems(items, '')).toHaveLength(2)
    expect(filterTransferItems(items, '   ')).toHaveLength(2)
  })
  it('匹配 primary(大小写不敏感)', () => {
    expect(filterTransferItems(items, 'cnc')).toEqual([items[0]])
  })
  it('匹配 secondary', () => {
    expect(filterTransferItems(items, '激光')).toEqual([items[1]])
  })
  it('无匹配返回空', () => {
    expect(filterTransferItems(items, 'xyz')).toHaveLength(0)
  })
})

describe('excludeSelected', () => {
  const all = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('排除已选 id', () => {
    expect(excludeSelected(all, ['b'])).toEqual([{ id: 'a' }, { id: 'c' }])
  })
  it('空已选返回全部', () => {
    expect(excludeSelected(all, [])).toHaveLength(3)
  })
})

describe('moveItem', () => {
  const list = ['a', 'b', 'c', 'd']
  it('向后移动', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })
  it('向前移动', () => {
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })
  it('同位返回原序副本(新数组实例)', () => {
    const r = moveItem(list, 1, 1)
    expect(r).toEqual(list)
    expect(r).not.toBe(list)
  })
  it('越界返回原序副本', () => {
    expect(moveItem(list, -1, 2)).toEqual(list)
    expect(moveItem(list, 0, 9)).toEqual(list)
  })
})
