import ReactECharts from 'echarts-for-react'
import { COLORS } from '../theme'
import { gauges } from '../mockData'

const centers = ['12.5%', '37.5%', '62.5%', '87.5%']

const option = {
  series: gauges.map((g, i) => ({
    type: 'gauge',
    center: [centers[i], '52%'],
    radius: '72%',
    startAngle: 210,
    endAngle: -30,
    min: 0,
    max: g.max,
    progress: { show: true, width: 9, itemStyle: { color: g.color, shadowColor: g.color, shadowBlur: 10 } },
    axisLine: { lineStyle: { width: 9, color: [[0.6, 'rgba(45,74,110,0.6)'], [0.85, 'rgba(45,74,110,0.8)'], [1, 'rgba(45,74,110,1)']] } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    pointer: { width: 4, itemStyle: { color: g.color } },
    anchor: { show: true, size: 8, itemStyle: { color: g.color } },
    detail: { valueAnimation: true, fontSize: 15, color: g.color, offsetCenter: [0, '58%'], formatter: '{value}' },
    title: { offsetCenter: [0, '82%'], fontSize: 12, color: COLORS.textSub },
    data: [{ value: g.value, name: g.name }],
  })),
}

export default function GaugePanel() {
  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}
