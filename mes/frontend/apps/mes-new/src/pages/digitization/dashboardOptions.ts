import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'

/** ECharts option(松散结构,EChart 容器内 cast 为 echarts 类型) */
export type EChartOption = Record<string, unknown>

const PALETTE = ['#2fe0ff', '#46d68a', '#f5a623', '#f0506e', '#9775fa', '#3bc9db', '#5fd8ff', '#ffd43b']
const AXIS_COLOR = '#3a6ea5'
const TEXT_COLOR = '#9fd2ff'
const SPLIT_COLOR = 'rgba(30,90,158,0.25)'

export function pickPalette(index: number): string {
  return PALETTE[index % PALETTE.length]
}

/** 整数千分位 */
export function formatCount(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 'yyyy-MM' → 'M月';非法输入回显原值 */
export function trendMonthLabel(month: string): string {
  const m = Number(month.slice(5, 7))
  return m >= 1 && m <= 12 ? `${m}月` : month
}

export function trendMonths(trend: MonthlyTrendPoint[]): string[] {
  return trend.map((t) => trendMonthLabel(t.month))
}

export function trendOrderCounts(trend: MonthlyTrendPoint[]): number[] {
  return trend.map((t) => t.orderCount)
}

export function trendCompletedCounts(trend: MonthlyTrendPoint[]): number[] {
  return trend.map((t) => t.completedCount)
}

/** Date → 'yyyy-MM-dd HH:mm:ss'(补零) */
export function formatClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const baseGrid = { left: 8, right: 12, top: 28, bottom: 8, containLabel: true }
const catAxis = (data: string[]) => ({
  type: 'category',
  data,
  axisLine: { lineStyle: { color: AXIS_COLOR } },
  axisLabel: { color: TEXT_COLOR, fontSize: 10 },
})
const valAxis = (extra: Record<string, unknown> = {}) => ({
  type: 'value',
  axisLine: { lineStyle: { color: AXIS_COLOR } },
  axisLabel: { color: TEXT_COLOR, fontSize: 10 },
  splitLine: { lineStyle: { color: SPLIT_COLOR } },
  ...extra,
})

/** 环形饼图 */
export function buildPieOption(items: NameValue[]): EChartOption {
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: TEXT_COLOR, fontSize: 10 } },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '44%'],
        label: { color: TEXT_COLOR, fontSize: 10 },
        data: items.map((it, i) => ({
          name: it.name,
          value: it.value,
          itemStyle: { color: pickPalette(i) },
        })),
      },
    ],
  }
}

/** 竖柱图 */
export function buildBarOption(items: NameValue[]): EChartOption {
  return {
    tooltip: { trigger: 'axis' },
    grid: { ...baseGrid, top: 16 },
    xAxis: catAxis(items.map((it) => it.name)),
    yAxis: valAxis(),
    series: [
      {
        type: 'bar',
        barWidth: '50%',
        data: items.map((it, i) => ({ value: it.value, itemStyle: { color: pickPalette(i) } })),
      },
    ],
  }
}

/** 月度订单趋势:订单数(柱) + 完成数(线) */
export function buildOrderTrendOption(trend: MonthlyTrendPoint[]): EChartOption {
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['订单数', '完成数'], top: 0, textStyle: { color: TEXT_COLOR, fontSize: 10 } },
    grid: baseGrid,
    xAxis: catAxis(trendMonths(trend)),
    yAxis: valAxis(),
    series: [
      { name: '订单数', type: 'bar', barWidth: '40%', itemStyle: { color: '#1366b0' }, data: trendOrderCounts(trend) },
      {
        name: '完成数',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#2fe0ff' },
        areaStyle: { color: 'rgba(47,224,255,0.12)' },
        data: trendCompletedCounts(trend),
      },
    ],
  }
}

/** 仪表盘 0-100 */
export function buildGaugeOption(value: number, title: string): EChartOption {
  return {
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 100,
        radius: '90%',
        center: ['50%', '58%'],
        progress: { show: true, width: 10 },
        axisLine: { lineStyle: { width: 10, color: [[0.6, '#f0506e'], [0.85, '#f5a623'], [1, '#46d68a']] } },
        axisLabel: { color: TEXT_COLOR, fontSize: 8 },
        pointer: { width: 4 },
        detail: { valueAnimation: true, formatter: '{value}%', color: '#5fd8ff', fontSize: 16, offsetCenter: [0, '72%'] },
        title: { color: TEXT_COLOR, fontSize: 10, offsetCenter: [0, '92%'] },
        data: [{ value, name: title }],
      },
    ],
  }
}

/** 面积折线图(多条) */
export function buildAreaOption(
  months: string[],
  series: { name: string; data: number[]; color: string }[],
): EChartOption {
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: series.map((s) => s.name), top: 0, textStyle: { color: TEXT_COLOR, fontSize: 10 } },
    grid: baseGrid,
    xAxis: { ...catAxis(months), boundaryGap: false },
    yAxis: valAxis({ max: 100 }),
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      itemStyle: { color: s.color },
      areaStyle: { color: `${s.color}22` },
      data: s.data,
    })),
  }
}
