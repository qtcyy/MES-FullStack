import { useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { ECharts } from 'echarts'
import { COLORS } from '../theme'
import { regionNorth, regionEast, regionSouth, type NameValue } from '../mockData'
import { useRotatingHighlight } from '../useRotatingHighlight'

function donutOption(title: string, data: NameValue[], colors: string[]) {
  return {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    title: { text: title, left: 'center', bottom: 4, textStyle: { color: COLORS.textSub, fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: false,
        label: { show: true, color: COLORS.textSub, formatter: '{d}%', fontSize: 10 },
        labelLine: { length: 6, length2: 6, lineStyle: { color: COLORS.axis } },
        itemStyle: { borderColor: COLORS.bgSolid, borderWidth: 2 },
        emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,212,255,0.6)' }, scale: true, scaleSize: 6 },
        data,
        color: colors,
      },
    ],
  }
}

const charts = [
  { title: '华北', data: regionNorth, colors: ['#4a90d9', '#3bc9db', '#51cf66'] },
  { title: '华东', data: regionEast, colors: ['#f59f00', '#f76707', '#f03e3e'] },
  { title: '华南', data: regionSouth, colors: ['#9775fa', '#845ef7', '#20c997'] },
]

export default function RegionDonutChart() {
  const refs = useRef<(ECharts | null)[]>([])
  const active = useRotatingHighlight(3)

  useEffect(() => {
    refs.current.forEach((inst) => {
      if (!inst) return
      inst.dispatchAction({ type: 'downplay', seriesIndex: 0 })
      inst.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: active })
    })
  }, [active])

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {charts.map((c, i) => (
        <div key={c.title} style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <ReactECharts
            option={donutOption(c.title, c.data, c.colors)}
            style={{ width: '100%', height: '100%' }}
            onChartReady={(inst: ECharts) => { refs.current[i] = inst }}
          />
        </div>
      ))}
    </div>
  )
}
