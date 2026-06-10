import ReactECharts from 'echarts-for-react'
import { COLORS, axisStyle, vGradient } from '../theme'
import { months, planData, orderData, completionRate } from '../mockData'

const option = {
  tooltip: { trigger: 'axis' as const },
  legend: {
    data: ['计划量', '订单量', '完成率(%)'],
    textStyle: { color: COLORS.textSub },
    top: 2,
  },
  grid: { left: 48, right: 48, bottom: 28, top: 38 },
  xAxis: { type: 'category', data: months, boundaryGap: true, ...axisStyle() },
  yAxis: [
    { type: 'value', name: '数量', nameTextStyle: { color: COLORS.textSub }, ...axisStyle() },
    { type: 'value', name: '%', max: 100, nameTextStyle: { color: COLORS.textSub }, ...axisStyle() },
  ],
  series: [
    {
      name: '计划量', type: 'line', data: planData, smooth: true,
      symbol: 'circle', symbolSize: 7,
      lineStyle: { color: COLORS.primary, width: 2.5, shadowColor: COLORS.primary, shadowBlur: 10 },
      itemStyle: { color: COLORS.primary, borderColor: '#fff', borderWidth: 1 },
      areaStyle: { color: vGradient('rgba(0,212,255,0.35)', 'rgba(0,212,255,0.02)') },
    },
    {
      name: '订单量', type: 'line', data: orderData, smooth: true,
      symbol: 'diamond', symbolSize: 7,
      lineStyle: { color: COLORS.cyan, width: 2.5, shadowColor: COLORS.cyan, shadowBlur: 8 },
      itemStyle: { color: COLORS.cyan },
    },
    {
      name: '完成率(%)', type: 'bar', yAxisIndex: 1, data: completionRate, barWidth: 9,
      itemStyle: { color: vGradient(COLORS.green, '#2b8a3e'), borderRadius: [4, 4, 0, 0] },
    },
  ],
}

export default function TrendChart() {
  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'canvas' }} />
}
