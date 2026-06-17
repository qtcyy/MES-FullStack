import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildPieOption } from '../dashboardOptions'
import type { NameValue } from '@/types/digitization'

export default function DeviceStatusPanel({ data }: { data: NameValue[] }) {
  return (
    <PanelFrame title="设备状态分布" badge="real">
      {data.length ? (
        <EChart option={buildPieOption(data)} className="h-full w-full min-h-[150px]" />
      ) : (
        <div className="ds-empty">暂无数据</div>
      )}
    </PanelFrame>
  )
}
