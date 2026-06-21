import { describe, it, expect } from 'vitest'
import {
  buildDonutOption,
  buildTrendOption,
  sortTrendByMonth,
  isEmptyDist,
} from '@/utils/dashboard'
import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'

const dist: NameValue[] = [
  { name: '已下发', value: 3 },
  { name: '已派工', value: 5 },
]

describe('isEmptyDist', () => {
  it('空数组为空', () => {
    expect(isEmptyDist([])).toBe(true)
  })
  it('全 0 值视为空', () => {
    expect(isEmptyDist([{ name: 'a', value: 0 }])).toBe(true)
  })
  it('有正值不为空', () => {
    expect(isEmptyDist(dist)).toBe(false)
  })
})

describe('buildDonutOption', () => {
  it('标题与单一 pie 系列,数据透传', () => {
    const opt = buildDonutOption('订单状态', dist) as Record<string, any>
    expect(opt.title.text).toBe('订单状态')
    expect(opt.series).toHaveLength(1)
    expect(opt.series[0].type).toBe('pie')
    expect(opt.series[0].data).toEqual(dist)
  })
  it('环形(radius 为内外双值)', () => {
    const opt = buildDonutOption('设备状态', dist) as Record<string, any>
    expect(Array.isArray(opt.series[0].radius)).toBe(true)
    expect(opt.series[0].radius).toHaveLength(2)
  })
})

describe('sortTrendByMonth', () => {
  it('按 yyyy-MM 升序,跨年正确', () => {
    const pts: MonthlyTrendPoint[] = [
      { month: '2026-01', orderCount: 1, totalQty: 0, completedCount: 0 },
      { month: '2025-12', orderCount: 2, totalQty: 0, completedCount: 0 },
    ]
    expect(sortTrendByMonth(pts).map((p) => p.month)).toEqual(['2025-12', '2026-01'])
  })
  it('不改原数组', () => {
    const pts: MonthlyTrendPoint[] = [
      { month: '2026-02', orderCount: 0, totalQty: 0, completedCount: 0 },
      { month: '2026-01', orderCount: 0, totalQty: 0, completedCount: 0 },
    ]
    sortTrendByMonth(pts)
    expect(pts[0].month).toBe('2026-02')
  })
})

describe('buildTrendOption', () => {
  it('x 轴为排序后的月份,三条折线系列', () => {
    const pts: MonthlyTrendPoint[] = [
      { month: '2026-02', orderCount: 2, totalQty: 20, completedCount: 1 },
      { month: '2026-01', orderCount: 1, totalQty: 10, completedCount: 1 },
    ]
    const opt = buildTrendOption(pts) as Record<string, any>
    expect(opt.xAxis.data).toEqual(['2026-01', '2026-02'])
    expect(opt.series).toHaveLength(3)
    expect(opt.series.map((s: any) => s.name)).toEqual(['订单数', '总数量', '完工数'])
    expect(opt.series[0].data).toEqual([1, 2])
    expect(opt.series[1].data).toEqual([10, 20])
    expect(opt.series[2].data).toEqual([1, 1])
  })
})
