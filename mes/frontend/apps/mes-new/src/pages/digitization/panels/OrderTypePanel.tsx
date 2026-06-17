import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildBarOption } from '../dashboardOptions'
import type { NameValue } from '@/types/digitization'

export default function OrderTypePanel({ data }: { data: NameValue[] }) {
  return (
    <PanelFrame title="工单类型分布" badge="real">
      {data.length ? (
        <EChart option={buildBarOption(data)} className="h-full w-full min-h-[140px]" />
      ) : (
        <div className="ds-empty">暂无数据</div>
      )}
    </PanelFrame>
  )
}
