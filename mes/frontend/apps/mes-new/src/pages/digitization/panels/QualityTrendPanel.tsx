import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildAreaOption } from '../dashboardOptions'
import { mockQuality } from '../dashboardMock'

export default function QualityTrendPanel() {
  const option = buildAreaOption(mockQuality.months, [
    { name: '良品率', data: mockQuality.yieldRate, color: '#46d68a' },
    { name: '不良率', data: mockQuality.defectRate, color: '#f0506e' },
  ])
  return (
    <PanelFrame title="良品率 / 不良率趋势" badge="mock">
      <EChart option={option} className="h-full w-full min-h-[160px]" />
    </PanelFrame>
  )
}
