import type { ReactNode } from 'react'
import { Factory, Cpu, Boxes, Workflow, TrendingUp, ListChecks, ChartPie, Zap, History, Megaphone } from 'lucide-react'
import Reveal from '@/components/motion/Reveal'
import { Stagger, StaggerItem } from '@/components/motion/Stagger'
import HeroBanner from './HeroBanner'
import MetricCard from './MetricCard'
import BentoCell from './BentoCell'
import TrendChart from './TrendChart'
import StatusDonut from './StatusDonut'
import TodoPanel from './TodoPanel'
import QuickActions from './QuickActions'
import RecentVisits from './RecentVisits'
import AnnouncementPanel from './AnnouncementPanel'
import { useWelcomeOverview } from './useWelcomeOverview'
import { MOCK_TODOS } from './welcomeMock'
import { getAccent, type AccentName } from './accents'

/** 「真实」数据标签 */
function RealTag() {
  return (
    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
      真实
    </span>
  )
}

/** 「示例」占位标签 */
function MockTag() {
  return (
    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
      示例
    </span>
  )
}

/** 计数徽标 */
function CountBadge({ n, accent }: { n: number; accent: AccentName }) {
  const a = getAccent(accent)
  return (
    <span
      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold"
      style={{ background: a.bg, color: a.color }}
    >
      {n}
    </span>
  )
}

/** 统一的格子布局包裹:StaggerItem + col-span */
function Cell({ span, children }: { span: string; children: ReactNode }) {
  return <StaggerItem className={span}>{children}</StaggerItem>
}

export default function WelcomePage() {
  const { overview, isFallback } = useWelcomeOverview()
  const kpi = overview?.kpi

  return (
    <div className="space-y-4">
      <Reveal>
        <HeroBanner overview={overview} isFallback={isFallback} />
      </Reveal>

      <Stagger className="grid grid-cols-12 gap-4">
        {/* 特征带:生产趋势(8) + 待办(4) */}
        <Cell span="col-span-12 lg:col-span-8">
          <BentoCell accent="blue" title="生产趋势 · 月度" icon={TrendingUp} extra={isFallback ? <MockTag /> : <RealTag />}>
            <TrendChart data={overview?.monthlyTrend ?? []} />
          </BentoCell>
        </Cell>
        <Cell span="col-span-12 lg:col-span-4">
          <BentoCell accent="violet" title="待办 / 待审批" icon={ListChecks} extra={<CountBadge n={MOCK_TODOS.length} accent="violet" />}>
            <TodoPanel />
          </BentoCell>
        </Cell>

        {/* KPI 四连 */}
        <Cell span="col-span-6 lg:col-span-3">
          <MetricCard label="生产工单" value={kpi?.orderCount ?? 0} icon={Factory} accent="blue" />
        </Cell>
        <Cell span="col-span-6 lg:col-span-3">
          <MetricCard label="设备总数" value={kpi?.deviceCount ?? 0} icon={Cpu} accent="cyan" />
        </Cell>
        <Cell span="col-span-6 lg:col-span-3">
          <MetricCard label="在库物料" value={kpi?.materielCount ?? 0} icon={Boxes} accent="emerald" />
        </Cell>
        <Cell span="col-span-6 lg:col-span-3">
          <MetricCard label="工艺路线" value={kpi?.flowCount ?? 0} icon={Workflow} accent="violet" />
        </Cell>

        {/* 三环图 */}
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="cyan" title="订单状态" icon={ChartPie} extra={isFallback ? <MockTag /> : <RealTag />}>
            <StatusDonut data={overview?.orderStatus ?? []} accent="cyan" ariaLabel="订单状态分布" />
          </BentoCell>
        </Cell>
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="blue" title="设备状态" icon={ChartPie} extra={isFallback ? <MockTag /> : <RealTag />}>
            <StatusDonut data={overview?.deviceStatus ?? []} accent="blue" ariaLabel="设备状态分布" />
          </BentoCell>
        </Cell>
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="emerald" title="订单类型" icon={ChartPie} extra={isFallback ? <MockTag /> : <RealTag />}>
            <StatusDonut data={overview?.orderType ?? []} accent="emerald" ariaLabel="订单类型分布" />
          </BentoCell>
        </Cell>

        {/* 三工具格 */}
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="blue" title="快捷入口" icon={Zap}>
            <QuickActions />
          </BentoCell>
        </Cell>
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="amber" title="最近访问" icon={History}>
            <RecentVisits />
          </BentoCell>
        </Cell>
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="amber" title="系统公告 / 动态" icon={Megaphone} extra={<MockTag />}>
            <AnnouncementPanel />
          </BentoCell>
        </Cell>
      </Stagger>
    </div>
  )
}
