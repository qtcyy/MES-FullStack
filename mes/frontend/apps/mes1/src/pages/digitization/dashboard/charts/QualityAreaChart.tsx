import ReactECharts from 'echarts-for-react'
import { COLORS, axisStyle, vGradient } from '../theme'
import { months, yieldRate, defectRate } from '../mockData'

const option = {
  tooltip: { trigger: 'axis' as const },
  legend: { data: ['良品率(%)', '不良率(%)'], textStyle: { color: COLORS.textSub }, top: 2 },
  grid: { left: 44, right: 24, bottom: 24, top: 34 },
  xAxis: { type: 'category', data: months, ...axisStyle() },
  yAxis: { type: 'value', max: 100, ...axisStyle() },
  series: [
    {
      name: '良品率(%)', type: 'line', data: yieldRate, smooth: true,
      lineStyle: { color: COLORS.green, width: 2.5, shadowColor: COLORS.green, shadowBlur: 8 },
      itemStyle: { color: COLORS.green },
      areaStyle: { color: vGradient('rgba(81,207,102,0.4)', 'rgba(81,207,102,0.02)') },
    },
    {
      name: '不良率(%)', type: 'line', data: defectRate, smooth: true,
      lineStyle: { color: COLORS.red, width: 2.5, shadowColor: COLORS.red, shadowBlur: 8 },
      itemStyle: { color: COLORS.red },
      areaStyle: { color: vGradient('rgba(240,62,62,0.4)', 'rgba(240,62,62,0.02)') },
    },
  ],
}

export default function QualityAreaChart() {
  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}
