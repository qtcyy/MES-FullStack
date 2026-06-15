import './dashboard/dashboard.css'
import { COLORS } from './dashboard/theme'
import DashboardHeader from './dashboard/DashboardHeader'
import KpiBar from './dashboard/KpiBar'
import PanelFrame from './dashboard/PanelFrame'
import TrendChart from './dashboard/charts/TrendChart'
import FactoryBarChart from './dashboard/charts/FactoryBarChart'
import WorkshopBarChart from './dashboard/charts/WorkshopBarChart'
import QualityAreaChart from './dashboard/charts/QualityAreaChart'
import RegionDonutChart from './dashboard/charts/RegionDonutChart'
import GaugePanel from './dashboard/charts/GaugePanel'

// 漂浮粒子（固定 8 个，避免 Math.random 影响 SSR/可复现；用静态分布）
const PARTICLES = [
  { left: '8%', delay: '0s', dur: '13s' },
  { left: '21%', delay: '3s', dur: '16s' },
  { left: '35%', delay: '6s', dur: '12s' },
  { left: '48%', delay: '1.5s', dur: '15s' },
  { left: '62%', delay: '4.5s', dur: '14s' },
  { left: '75%', delay: '2s', dur: '17s' },
  { left: '86%', delay: '7s', dur: '13s' },
  { left: '94%', delay: '5s', dur: '15s' },
]

const colStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minHeight: 0,
}

export default function PlanDashboard() {
  return (
    <div
      style={{
        // 负边距抵消 AdminLayout Content 的 padding:24，实现满屏出血
        margin: -24,
        width: 'calc(100% + 48px)',
        height: 'calc(100% + 48px)',
        background: COLORS.bgGradient,
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr',
        gap: 10,
        padding: 14,
      }}
    >
      {/* 背景层：网格 + 粒子 */}
      <div className="dash-grid-bg" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="dash-particle"
          style={{ left: p.left, bottom: 0, animationDelay: p.delay, animationDuration: p.dur }}
        />
      ))}

      {/* 第1行：标题栏 */}
      <DashboardHeader />

      {/* 第2行：KPI 卡排 */}
      <KpiBar />

      {/* 第3行：三列 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr 1fr',
          gap: 12,
          minHeight: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* 左列 */}
        <div style={colStyle}>
          <PanelFrame title="各工厂产量" delay={0.1} style={{ flex: 1 }}>
            <FactoryBarChart />
          </PanelFrame>
          <PanelFrame title="各车间产量" delay={0.2} style={{ flex: 1 }}>
            <WorkshopBarChart />
          </PanelFrame>
        </div>

        {/* 中列 */}
        <div style={colStyle}>
          <PanelFrame title="年度计划与工单趋势" delay={0.15} style={{ flex: 1.5 }}>
            <TrendChart />
          </PanelFrame>
          <PanelFrame title="良品率与不良率趋势" delay={0.25} style={{ flex: 1 }}>
            <QualityAreaChart />
          </PanelFrame>
        </div>

        {/* 右列 */}
        <div style={colStyle}>
          <PanelFrame title="地区产量对比" delay={0.2} style={{ flex: 1 }}>
            <RegionDonutChart />
          </PanelFrame>
          <PanelFrame title="设备仪表盘" delay={0.3} style={{ flex: 1 }}>
            <GaugePanel />
          </PanelFrame>
        </div>
      </div>
    </div>
  )
}
