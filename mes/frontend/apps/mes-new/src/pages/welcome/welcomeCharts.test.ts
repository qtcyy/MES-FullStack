import { describe, it, expect } from 'vitest'
import {
  mix, donutPalette, buildWelcomeTrendOption, buildWelcomeDonutOption,
} from './welcomeCharts'
import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'

describe('mix', () => {
  it('黑白对半 → 灰', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
  it('t=0 返回 a,t=1 返回 b', () => {
    expect(mix('#2f7cff', '#ffffff', 0)).toBe('#2f7cff')
    expect(mix('#2f7cff', '#ffffff', 1)).toBe('#ffffff')
  })
})

describe('donutPalette', () => {
  it('返回 5 色,首色为主色', () => {
    const p = donutPalette('#2f7cff')
    expect(p).toHaveLength(5)
    expect(p[0]).toBe('#2f7cff')
  })
})

describe('buildWelcomeTrendOption', () => {
  const trend: MonthlyTrendPoint[] = [
    { month: '2025-11', orderCount: 10, totalQty: 100, completedCount: 8 },
    { month: '2025-12', orderCount: 12, totalQty: 120, completedCount: 11 },
  ]
  it('x 轴标签为 M月,两条 series', () => {
    const opt = buildWelcomeTrendOption(trend) as {
      xAxis: { data: string[] }; series: unknown[]
    }
    expect(opt.xAxis.data).toEqual(['11月', '12月'])
    expect(opt.series).toHaveLength(2)
  })
})

describe('buildWelcomeDonutOption', () => {
  it('扇区数量与输入一致', () => {
    const items: NameValue[] = [
      { name: 'A', value: 1 }, { name: 'B', value: 2 }, { name: 'C', value: 3 },
    ]
    const opt = buildWelcomeDonutOption(items, 'cyan') as {
      series: { data: unknown[] }[]
    }
    expect(opt.series[0].data).toHaveLength(3)
  })
})
