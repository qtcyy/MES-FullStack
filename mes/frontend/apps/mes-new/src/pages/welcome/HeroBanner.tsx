import { useAuthStore } from '@/stores/authStore'
import { greetingByHour } from './welcomeData'
import type { DashboardOverview } from '@/types/digitization'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function todayLabel(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`
}

interface HeroBannerProps {
  overview: DashboardOverview | undefined
  isFallback: boolean
}

export default function HeroBanner({ overview, isFallback }: HeroBannerProps) {
  const user = useAuthStore((s) => s.user)
  const now = new Date()
  const greeting = greetingByHour(now.getHours())
  const k = overview?.kpi
  const trend = overview?.monthlyTrend
  const lastCompleted = trend && trend.length ? trend[trend.length - 1].completedCount : 0
  const pills: string[] = overview
    ? [
        `生产工单 ${k?.orderCount ?? 0}`,
        `本月完工 ${lastCompleted}`,
        `设备总数 ${k?.deviceCount ?? 0}`,
        `在库物料 ${k?.materielCount ?? 0}`,
        `工艺路线 ${k?.flowCount ?? 0}`,
      ]
    : []
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 text-white shadow-[var(--shadow-brand)]"
      style={{ background: '#16233f' }}
    >
      <span className="welcome-aurora welcome-aurora-1" aria-hidden />
      <span className="welcome-aurora welcome-aurora-2" aria-hidden />
      <span className="welcome-aurora welcome-aurora-3" aria-hidden />
      <div className="relative z-10">
        <h2 className="text-2xl font-semibold tracking-tight">
          {greeting}，{user?.name ?? '用户'} 👋
        </h2>
        <p className="mt-1 text-sm text-white/70">
          {todayLabel(now)} · 欢迎使用章鱼MES 智能制造执行系统
          {isFallback ? ' · 离线示例数据' : ''}
        </p>
        {pills.length > 0 && (
          <div className="relative mt-4 overflow-hidden">
            <div className="flex w-max gap-3 [animation:welcome-marquee_26s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:[animation:none]">
              {[...pills, ...pills].map((p, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 backdrop-blur"
                >
                  <span className="size-1.5 rounded-full bg-[var(--brand-to)]" aria-hidden />
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
