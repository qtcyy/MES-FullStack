import type { LucideIcon } from 'lucide-react'
import { useCountUp } from '@/pages/digitization/useCountUp'
import { getAccent, type AccentName } from './accents'

interface MetricCardProps {
  label: string
  value: number
  icon: LucideIcon
  accent: AccentName
}

/** KPI 卡:数字滚动 + 强调色。须由外层 StaggerItem 提供 col-span 与入场。 */
export default function MetricCard({ label, value, icon: Icon, accent }: MetricCardProps) {
  const n = useCountUp(value)
  const a = getAccent(accent)
  return (
    <div className="group relative flex h-full items-center justify-between overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: a.color }} aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums" style={{ color: a.color }}>
          {Math.round(n).toLocaleString()}
        </p>
      </div>
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: a.bg, color: a.color }}
      >
        <Icon className="size-5" />
      </span>
    </div>
  )
}
