import { useCountUp } from '../useCountUp'
import { formatCount } from '../dashboardOptions'
import type { DashboardKpi } from '@/types/digitization'

function KpiCard({ label, value }: { label: string; value: number }) {
  const n = useCountUp(value)
  return (
    <div className="ds-kpi">
      <div className="ds-kpi__num">{formatCount(n)}</div>
      <div className="ds-kpi__label">{label}</div>
    </div>
  )
}

export default function KpiStrip({ kpi }: { kpi: DashboardKpi }) {
  return (
    <div className="ds-kpis">
      <KpiCard label="订单总数" value={kpi.orderCount} />
      <KpiCard label="设备总数" value={kpi.deviceCount} />
      <KpiCard label="物料总数" value={kpi.materielCount} />
      <KpiCard label="工艺路线" value={kpi.flowCount} />
    </div>
  )
}
