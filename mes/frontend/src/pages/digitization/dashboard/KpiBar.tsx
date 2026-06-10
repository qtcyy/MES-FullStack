import KpiCard from './KpiCard'
import { kpis } from './mockData'

export default function KpiBar() {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '4px 24px' }}>
      {kpis.map((k, i) => (
        <KpiCard key={k.key} datum={k} index={i} />
      ))}
    </div>
  )
}
