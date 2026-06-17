import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildBarOption } from '../dashboardOptions'
import { mockWorkshop } from '../dashboardMock'

export default function WorkshopOutputPanel() {
  return (
    <PanelFrame title="各车间产量" badge="mock">
      <EChart option={buildBarOption(mockWorkshop)} className="h-full w-full min-h-[140px]" />
    </PanelFrame>
  )
}
