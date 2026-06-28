import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'
import type { EChartOption } from '@/pages/digitization/dashboardOptions'
import { ACCENTS, getAccent, type AccentName } from './accents'

const TEXT = '#64748b'
const AXIS = '#cbd5e1'
const SPLIT = 'rgba(100,116,139,0.12)'

/** 'yyyy-MM' → 'M月';非法回显原值 */
function monthLabel(month: string): string {
  const m = Number(month.slice(5, 7))
  return m >= 1 && m <= 12 ? `${m}月` : month
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** 线性混色:t=0 取 a,t=1 取 b */
export function mix(a: string, b: string, t: number): string {
  const pa = hexToRgb(a)
  const pb = hexToRgb(b)
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t)
  const r = ch(pa.r, pb.r)
  const g = ch(pa.g, pb.g)
  const bl = ch(pa.b, pb.b)
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

/** 由主色派生同色系(不同明度)扇区色 */
export function donutPalette(base: string): string[] {
  return [
    base,
    mix(base, '#ffffff', 0.28),
    mix(base, '#ffffff', 0.52),
    mix(base, '#0f172a', 0.22),
    mix(base, '#ffffff', 0.72),
  ]
}

/** 浅色版生产趋势:工单数 + 完工数 两条面积折线 */
export function buildWelcomeTrendOption(trend: MonthlyTrendPoint[]): EChartOption {
  return {
    color: [ACCENTS.blue.color, ACCENTS.emerald.color],
    tooltip: { trigger: 'axis' },
    legend: { data: ['工单数', '完工数'], top: 0, textStyle: { color: TEXT, fontSize: 11 }, icon: 'circle' },
    grid: { left: 8, right: 12, top: 32, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.map((t) => monthLabel(t.month)),
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { color: TEXT, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: TEXT, fontSize: 11 },
      splitLine: { lineStyle: { color: SPLIT } },
    },
    series: [
      {
        name: '工单数', type: 'line', smooth: true, showSymbol: false,
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(47,124,255,0.14)' },
        data: trend.map((t) => t.orderCount),
      },
      {
        name: '完工数', type: 'line', smooth: true, showSymbol: false,
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(16,185,129,0.12)' },
        data: trend.map((t) => t.completedCount),
      },
    ],
  }
}

/** 浅色版环形图;围绕给定强调色生成同色系扇区 */
export function buildWelcomeDonutOption(items: NameValue[], accent: AccentName): EChartOption {
  const palette = donutPalette(getAccent(accent).color)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { color: TEXT, fontSize: 11 }, icon: 'circle' },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: items.map((it, i) => ({
          name: it.name,
          value: it.value,
          itemStyle: { color: palette[i % palette.length] },
        })),
      },
    ],
  }
}
