import { describe, it, expect } from 'vitest'
import { filterTransferItems, excludeSelected } from '../transfer'

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
