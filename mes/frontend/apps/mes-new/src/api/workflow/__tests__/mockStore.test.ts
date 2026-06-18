import { describe, it, expect } from 'vitest'
import { paginate } from '../mockStore'

describe('paginate', () => {
  const data = Array.from({ length: 13 }, (_, i) => i + 1)

  it('第一页按 size 切片,pages 向上取整', () => {
    const r = paginate(data, 1, 5)
    expect(r.records).toEqual([1, 2, 3, 4, 5])
    expect(r.total).toBe(13)
    expect(r.size).toBe(5)
    expect(r.current).toBe(1)
    expect(r.pages).toBe(3)
  })

  it('末页只返回剩余记录', () => {
    expect(paginate(data, 3, 5).records).toEqual([11, 12, 13])
  })

  it('current 超出范围被夹到末页', () => {
    expect(paginate(data, 99, 5).current).toBe(3)
  })

  it('current 小于 1 被夹到第一页', () => {
    expect(paginate(data, 0, 5).current).toBe(1)
  })

  it('空数据返回 total=0/pages=1/records=[]', () => {
    const r = paginate([], 1, 5)
    expect(r.records).toEqual([])
    expect(r.total).toBe(0)
    expect(r.pages).toBe(1)
  })
})
