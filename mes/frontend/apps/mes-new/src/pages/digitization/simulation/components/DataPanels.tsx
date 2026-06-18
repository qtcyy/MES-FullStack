import type { WarehouseStat } from '../simulationModel'

export default function DataPanels({ perWarehouse }: { perWarehouse: WarehouseStat[] }) {
  if (perWarehouse.length === 0) return null
  return (
    <div className="mes-panels">
      {perWarehouse.map((w) => {
        const pct = w.locationCount > 0 ? Math.round((w.occupiedCount / w.locationCount) * 100) : 0
        return (
          <div key={w.id} className="mes-panels__item">
            <div>
              {w.name} · {w.occupiedCount}/{w.locationCount}（{pct}%）
            </div>
            <div className="mes-panels__bar">
              <div className="mes-panels__fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
