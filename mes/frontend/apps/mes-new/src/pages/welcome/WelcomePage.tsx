import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@workspace/ui'
import { Boxes, CheckCircle2, Clock, Factory, ClipboardList, Package, Workflow, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Stagger, StaggerItem } from '@/components/motion/Stagger'
import { useCountUp } from '@/pages/digitization/useCountUp'
import { useAuthStore } from '@/stores/authStore'

interface Kpi { label: string; value: number; icon: LucideIcon }
const KPIS: Kpi[] = [
  { label: '在产工单', value: 128, icon: Factory },
  { label: '今日完工', value: 86, icon: CheckCircle2 },
  { label: '待排产', value: 23, icon: Clock },
  { label: '在库物料', value: 1204, icon: Boxes },
]

const QUICK = [
  { label: '生产订单', to: '/order/production', icon: ClipboardList },
  { label: '物料管理', to: '/basedata/materile', icon: Package },
  { label: '工艺路线', to: '/technology/flow', icon: Workflow },
  { label: '用户管理', to: '/system/user', icon: Users },
]

function KpiCard({ kpi }: { kpi: Kpi }) {
  const n = useCountUp(kpi.value)
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-[var(--shadow-pop)]">
      <span className="absolute inset-y-0 left-0 w-1 bg-brand-gradient" aria-hidden />
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{kpi.label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
            {Math.round(n).toLocaleString()}
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
          <kpi.icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  )
}

export default function WelcomePage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      {/* 渐变问候横幅 */}
      <div className="relative overflow-hidden rounded-xl bg-brand-gradient p-6 text-white shadow-[var(--shadow-brand)]">
        <div className="relative z-10">
          <h2 className="text-2xl font-semibold tracking-tight">你好,{user?.name ?? '用户'} 👋</h2>
          <p className="mt-1 text-sm text-white/80">欢迎使用章鱼MES 智能制造执行系统</p>
        </div>
        <span className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10" aria-hidden />
        <span className="pointer-events-none absolute -bottom-10 right-24 size-28 rounded-full bg-white/10" aria-hidden />
      </div>

      {/* KPI 卡（梯级入场 + 数字滚动） */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <StaggerItem key={kpi.label}>
            <KpiCard kpi={kpi} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* 快捷入口 */}
      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">快捷入口</p>
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK.map((q) => (
            <StaggerItem key={q.to}>
              <button
                type="button"
                onClick={() => navigate(q.to)}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
                  <q.icon className="size-5" />
                </span>
                <span className="text-sm">{q.label}</span>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </div>
  )
}
