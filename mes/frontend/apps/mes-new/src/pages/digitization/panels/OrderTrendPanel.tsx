import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildOrderTrendOption } from '../dashboardOptions'
import type { MonthlyTrendPoint } from '@/types/digitization'

export default function OrderTrendPanel({ data }: { data: MonthlyTrendPoint[] }) {
  return (
    <PanelFrame title="月度订单趋势" badge="real">
      {data.length ? (
        <EChart option={buildOrderTrendOption(data)} className="h-full w-full min-h-[200px]" />
      ) : (
        <div className="ds-empty">暂无数据</div>
      )}
    </PanelFrame>
  )
}
