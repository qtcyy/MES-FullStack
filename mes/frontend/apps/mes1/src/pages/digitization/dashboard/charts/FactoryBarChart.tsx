import { useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { ECharts } from 'echarts'
import { COLORS, axisStyle, vGradient } from '../theme'
import { factories, factoryOutput } from '../mockData'
import { useRotatingHighlight } from '../useRotatingHighlight'

const option = {
  tooltip: { trigger: 'axis' as const },
  grid: { left: 40, right: 16, bottom: 24, top: 16 },
  xAxis: { type: 'category', data: factories, ...axisStyle() },
  yAxis: { type: 'value', ...axisStyle() },
  series: [
    {
      type: 'bar',
      data: factoryOutput,
      barWidth: '45%',
      itemStyle: { color: vGradient(COLORS.primary, COLORS.primaryDeep), borderRadius: [6, 6, 0, 0] },
      emphasis: { itemStyle: { color: vGradient('#7fffd4', COLORS.primary), shadowColor: COLORS.primary, shadowBlur: 16 } },
    },
  ],
}

export default function FactoryBarChart() {
  const instRef = useRef<ECharts | null>(null)
  const active = useRotatingHighlight(factories.length)

  useEffect(() => {
    const inst = instRef.current
    if (!inst) return
    inst.dispatchAction({ type: 'downplay', seriesIndex: 0 })
    inst.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: active })
  }, [active])

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height: '100%' }}
      onChartReady={(inst: ECharts) => { instRef.current = inst }}
    />
  )
}
