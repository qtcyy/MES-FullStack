import ReactECharts from 'echarts-for-react'
import { COLORS, axisStyle, vGradient } from '../theme'
import { workshops, workshopOutput } from '../mockData'

const palette = [COLORS.purple, COLORS.cyan, COLORS.green, COLORS.orange, COLORS.primary, COLORS.red, '#845ef7', '#20c997']

const option = {
  tooltip: { trigger: 'axis' as const },
  grid: { left: 40, right: 16, bottom: 24, top: 16 },
  xAxis: { type: 'category', data: workshops, ...axisStyle() },
  yAxis: { type: 'value', ...axisStyle() },
  series: [
    {
      type: 'bar',
      barWidth: '50%',
      data: workshopOutput.map((v, i) => ({
        value: v,
        itemStyle: { color: vGradient(palette[i % palette.length], '#1c2a4a'), borderRadius: [4, 4, 0, 0] },
      })),
    },
  ],
}

export default function WorkshopBarChart() {
  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}
