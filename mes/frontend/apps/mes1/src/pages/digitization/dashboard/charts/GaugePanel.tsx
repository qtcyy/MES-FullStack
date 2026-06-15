import { useEffect, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { COLORS } from '../theme'
import { gauges, type GaugeDatum } from '../mockData'

/** 根据容器宽度决定仪表盘数量 */
function gaugeCount(w: number): number {
  if (w <= 0) return 2 // 初始未知，给默认值
  if (w < 420) return 2
  if (w < 620) return 3
  return 4
}

/** 等间距中心点百分比 */
function buildCenters(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${(100 / n) * (i + 0.5)}%`)
}

function buildOption(visible: GaugeDatum[], count: number) {
  const centers = buildCenters(count)
  const radius = count <= 2 ? '68%' : count === 3 ? '70%' : '72%'

  return {
    series: visible.map((g, i) => ({
      type: 'gauge' as const,
      center: [centers[i], '52%'],
      radius,
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
}

export default function GaugePanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const count = gaugeCount(width)
  const visible = useMemo(() => gauges.slice(0, count), [count])
  const option = useMemo(() => buildOption(visible, count), [visible, count])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
