import type { SceneStats } from '../simulationModel'

export default function Hud({ stats }: { stats: SceneStats }) {
  const pct = Math.round(stats.occupancyRate * 100)
  return (
    <div className="mes-hud">
      <div className="mes-hud__stat">
        仓库数 <b>{stats.warehouseCount}</b>
      </div>
      <div className="mes-hud__stat">
        库位数 <b>{stats.locationCount}</b>
      </div>
      <div className="mes-hud__stat">
        占用率 <b>{pct}%</b>
      </div>
    </div>
  )
}
