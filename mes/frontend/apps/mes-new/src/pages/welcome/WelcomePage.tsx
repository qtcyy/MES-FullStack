import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui'
import { Boxes, CheckCircle2, Clock, Factory } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const KPIS = [
  { label: '在产工单', value: '128', icon: Factory },
  { label: '今日完工', value: '86', icon: CheckCircle2 },
  { label: '待排产', value: '23', icon: Clock },
  { label: '在库物料', value: '1,204', icon: Boxes },
]

export default function WelcomePage() {
  const user = useAuthStore((s) => s.user)
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">你好,{user?.name ?? '用户'} 👋</h2>
        <p className="text-sm text-muted-foreground">欢迎使用章鱼MES 智能制造执行系统</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
