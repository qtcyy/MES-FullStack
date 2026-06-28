import EChart from '@/components/EChart'
import { buildWelcomeDonutOption } from './welcomeCharts'
import type { NameValue } from '@/types/digitization'
import type { AccentName } from './accents'

interface StatusDonutProps {
  data: NameValue[]
  accent: AccentName
}

export default function StatusDonut({ data, accent }: StatusDonutProps) {
  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        暂无数据
      </div>
    )
  }
  return <EChart option={buildWelcomeDonutOption(data, accent)} className="h-[220px] w-full" />
}
