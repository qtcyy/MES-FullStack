import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@workspace/ui'
import { ArrowLeft } from 'lucide-react'
import { useQuery$ } from '@/http/hooks'
import { fetchOverview } from '@/api/digitization/dashboard'
import { formatClock } from './dashboardOptions'
import type { DashboardKpi } from '@/types/digitization'
import KpiStrip from './panels/KpiStrip'
import OrderStatusPanel from './panels/OrderStatusPanel'
import DeviceStatusPanel from './panels/DeviceStatusPanel'
import OrderTrendPanel from './panels/OrderTrendPanel'
import OrderTypePanel from './panels/OrderTypePanel'
import OeeGaugePanel from './panels/OeeGaugePanel'
import QualityTrendPanel from './panels/QualityTrendPanel'
import WorkshopOutputPanel from './panels/WorkshopOutputPanel'
import './dashboard.css'

const REFRESH_MS = 30000
const EMPTY_KPI: DashboardKpi = { orderCount: 0, deviceCount: 0, materielCount: 0, flowCount: 0 }

export default function PlanDashboard() {
  const navigate = useNavigate()
  const { data, loading, refetch } = useQuery$(['digitization', 'overview'], fetchOverview)
  const [now, setNow] = useState<Date>(() => new Date())

  // 实时时钟
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // 30s 轮询刷新真实数据
  useEffect(() => {
    const t = setInterval(() => refetch(), REFRESH_MS)
    return () => clearInterval(t)
  }, [refetch])

  return (
    <div className="mes-dashboard">
      <header className="ds-header">
        <h1 className="ds-title">章鱼师兄 · 生产数字化大屏</h1>
        <div className="ds-header__right">
          <span className="ds-clock">{formatClock(now)}</span>
          <Button variant="outline" size="sm" onClick={() => navigate('/welcome')}>
            <ArrowLeft className="size-4" />
            返回
          </Button>
        </div>
      </header>

      <KpiStrip kpi={data?.kpi ?? EMPTY_KPI} />

      <div className="ds-grid">
        <div className="ds-col">
          <OrderStatusPanel data={data?.orderStatus ?? []} />
          <DeviceStatusPanel data={data?.deviceStatus ?? []} />
        </div>
        <div className="ds-col">
          <OrderTrendPanel data={data?.monthlyTrend ?? []} />
          <QualityTrendPanel />
        </div>
        <div className="ds-col">
          <OeeGaugePanel />
          <OrderTypePanel data={data?.orderType ?? []} />
          <WorkshopOutputPanel />
        </div>
      </div>

      {loading && !data && <div className="ds-loading">加载中…</div>}
    </div>
  )
}
