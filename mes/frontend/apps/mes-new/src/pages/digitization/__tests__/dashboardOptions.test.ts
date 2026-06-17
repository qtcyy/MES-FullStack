import { describe, it, expect } from 'vitest'
import {
  formatCount,
  pickPalette,
  trendMonthLabel,
  trendMonths,
  trendOrderCounts,
  trendCompletedCounts,
  formatClock,
  buildPieOption,
  buildBarOption,
  buildOrderTrendOption,
  buildGaugeOption,
  buildAreaOption,
} from '../dashboardOptions'
import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'

const trend: MonthlyTrendPoint[] = [
  { month: '2026-05', orderCount: 10, totalQty: 100, completedCount: 6 },
  { month: '2026-06', orderCount: 12, totalQty: 130, completedCount: 9 },
]
const items: NameValue[] = [
  { name: '创建', value: 3 },
  { name: '进行中', value: 5 },
]

describe('formatCount', () => {
  it('千分位', () => { expect(formatCount(1234567)).toBe('1,234,567') })
  it('0', () => { expect(formatCount(0)).toBe('0') })
  it('小于千', () => { expect(formatCount(999)).toBe('999') })
  it('取整', () => { expect(formatCount(1234.7)).toBe('1,235') })
})

describe('pickPalette', () => {
  it('索引取色', () => { expect(pickPalette(0)).toBe('#2fe0ff') })
  it('循环取色', () => { expect(pickPalette(8)).toBe(pickPalette(0)) })
})

describe('trend transforms', () => {
  it('trendMonthLabel: 2026-06 → 6月', () => { expect(trendMonthLabel('2026-06')).toBe('6月') })
  it('trendMonthLabel: 2026-01 → 1月', () => { expect(trendMonthLabel('2026-01')).toBe('1月') })
  it('trendMonthLabel: 非法输入回显', () => {
    expect(trendMonthLabel('2026-06-17')).toBe('6月')
    expect(trendMonthLabel('bad')).toBe('bad')
  })
  it('trendMonths', () => { expect(trendMonths(trend)).toEqual(['5月', '6月']) })
  it('trendOrderCounts', () => { expect(trendOrderCounts(trend)).toEqual([10, 12]) })
  it('trendCompletedCounts', () => { expect(trendCompletedCounts(trend)).toEqual([6, 9]) })
})

describe('formatClock', () => {
  it('补零格式化', () => {
    expect(formatClock(new Date(2026, 5, 17, 14, 3, 8))).toBe('2026-06-17 14:03:08')
  })
})

describe('option builders', () => {
  it('buildPieOption: series data 长度=输入', () => {
    const opt = buildPieOption(items) as { series: { data: unknown[] }[] }
    expect(opt.series[0].data).toHaveLength(2)
  })
  it('buildPieOption: data[0] 映射 name/value', () => {
    const opt = buildPieOption(items) as { series: { data: { name: string; value: number }[] }[] }
    expect(opt.series[0].data[0].name).toBe('创建')
    expect(opt.series[0].data[0].value).toBe(3)
  })
  it('buildBarOption: xAxis data 长度=输入', () => {
    const opt = buildBarOption(items) as { xAxis: { data: unknown[] } }
    expect(opt.xAxis.data).toHaveLength(2)
  })
  it('buildBarOption: xAxis.data[0] 映射 name', () => {
    const opt = buildBarOption(items) as { xAxis: { data: string[] } }
    expect(opt.xAxis.data[0]).toBe('创建')
  })
  it('buildOrderTrendOption: 双 series + x轴长度=输入', () => {
    const opt = buildOrderTrendOption(trend) as { series: unknown[]; xAxis: { data: unknown[] } }
    expect(opt.series).toHaveLength(2)
    expect(opt.xAxis.data).toHaveLength(2)
  })
  it('buildGaugeOption: 值落入 series.data[0].value', () => {
    const opt = buildGaugeOption(87.2, 'OEE') as { series: { data: { value: number }[] }[] }
    expect(opt.series[0].data[0].value).toBe(87.2)
  })
  it('buildAreaOption: series 数=传入条数', () => {
    const opt = buildAreaOption(['1月', '2月'], [
      { name: '良品率', data: [98, 99], color: '#46d68a' },
    ]) as { series: unknown[] }
    expect(opt.series).toHaveLength(1)
  })
})
