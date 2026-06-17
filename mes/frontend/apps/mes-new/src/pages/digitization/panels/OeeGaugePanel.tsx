import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildGaugeOption } from '../dashboardOptions'
import { mockOeeValue } from '../dashboardMock'

export default function OeeGaugePanel() {
  return (
    <PanelFrame title="设备综合效率 OEE" badge="mock">
      <EChart option={buildGaugeOption(mockOeeValue, 'OEE')} className="h-full w-full min-h-[150px]" />
    </PanelFrame>
  )
}
