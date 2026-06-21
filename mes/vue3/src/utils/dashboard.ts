import type { EChartsOption } from 'echarts'
import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'

/** 大屏固定深色科技色板(kiosk 始终深色,不随站点主题切换) */
export const SCREEN_PALETTE = {
  series: ['#36e0ff', '#5b8cff', '#7d5bff', '#34e3b0', '#ffc24b', '#ff6b6b'],
  text: '#c7d6f5',
  textDim: '#8aa0c4',
  axis: 'rgba(120,160,220,0.25)',
  split: 'rgba(120,160,220,0.12)',
  tooltipBg: '#0d1530',
  tooltipBorder: 'rgba(120,160,220,0.3)',
}

/** 分布为空(无项或全 0)时返回 true,用于面板空态占位 */
export function isEmptyDist(data: NameValue[]): boolean {
  return !data.length || data.every((d) => !d.value)
}

const tooltipBase = {
  backgroundColor: SCREEN_PALETTE.tooltipBg,
  borderColor: SCREEN_PALETTE.tooltipBorder,
  textStyle: { color: SCREEN_PALETTE.text },
}

/** 环形饼(订单状态/设备状态/工单类型 共用) */
export function buildDonutOption(title: string, data: NameValue[]): EChartsOption {
  return {
    color: SCREEN_PALETTE.series,
    title: {
      text: title,
      left: 'center',
      top: 4,
      textStyle: { color: SCREEN_PALETTE.text, fontSize: 14 },
    },
    tooltip: { trigger: 'item', ...tooltipBase, formatter: '{b}: {c} ({d}%)' },
    legend: {
      bottom: 0,
      textStyle: { color: SCREEN_PALETTE.textDim },
      icon: 'circle',
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '52%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: SCREEN_PALETTE.tooltipBg, borderWidth: 2 },
        label: { color: SCREEN_PALETTE.textDim },
        data,
      },
    ],
  }
}

/** 按 yyyy-MM 升序(返回新数组,不改原数组) */
export function sortTrendByMonth(points: MonthlyTrendPoint[]): MonthlyTrendPoint[] {
  return [...points].sort((a, b) => a.month.localeCompare(b.month))
}

/** 近12月趋势:订单数/总数量/完工数 三折线 */
export function buildTrendOption(points: MonthlyTrendPoint[]): EChartsOption {
  const sorted = sortTrendByMonth(points)
  const months = sorted.map((p) => p.month)
  const mkLine = (name: string, vals: number[], color: string) => ({
    name,
    type: 'line' as const,
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    data: vals,
    lineStyle: { width: 2, color },
    itemStyle: { color },
  })
  return {
    color: SCREEN_PALETTE.series,
    tooltip: { trigger: 'axis', ...tooltipBase },
    legend: {
      top: 4,
      data: ['订单数', '总数量', '完工数'],
      textStyle: { color: SCREEN_PALETTE.textDim },
    },
    grid: { top: 40, left: 48, right: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: SCREEN_PALETTE.axis } },
      axisLabel: { color: SCREEN_PALETTE.textDim },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: SCREEN_PALETTE.axis } },
      axisLabel: { color: SCREEN_PALETTE.textDim },
      splitLine: { lineStyle: { color: SCREEN_PALETTE.split } },
    },
    series: [
      mkLine('订单数', sorted.map((p) => p.orderCount), SCREEN_PALETTE.series[0]),
      mkLine('总数量', sorted.map((p) => p.totalQty), SCREEN_PALETTE.series[1]),
      mkLine('完工数', sorted.map((p) => p.completedCount), SCREEN_PALETTE.series[3]),
    ],
  } as EChartsOption
}
