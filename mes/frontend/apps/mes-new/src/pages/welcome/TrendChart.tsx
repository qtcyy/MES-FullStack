import EChart from '@/components/EChart'
import { buildWelcomeTrendOption } from './welcomeCharts'
import type { MonthlyTrendPoint } from '@/types/digitization'

export default function TrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        暂无数据
      </div>
    )
  }
  return (
    <div role="img" aria-label="生产趋势折线图" className="h-[280px] w-full">
      <EChart option={buildWelcomeTrendOption(data)} className="h-full w-full" />
    </div>
  )
}
