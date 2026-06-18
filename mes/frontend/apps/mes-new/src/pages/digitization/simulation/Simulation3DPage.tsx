import { useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import { Button } from '@workspace/ui'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useSimulationScene } from './useSimulationScene'
import SceneSetup from './components/SceneSetup'
import WarehouseBuilding from './components/WarehouseBuilding'
import Billboard from './components/Billboard'
import WarehouseZone from './components/WarehouseZone'
import Hud from './components/Hud'
import HeatLegend from './components/HeatLegend'
import DataPanels from './components/DataPanels'
import FullscreenButton from './components/FullscreenButton'
import LocationDetailSheet from './components/LocationDetailSheet'
import './simulation.css'

export default function Simulation3DPage() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const { model, loading, error, refetch } = useSimulationScene()
  const [pickedId, setPickedId] = useState<string | null>(null)

  const hasData = !!model && model.warehouses.length > 0

  const buildingDims = useMemo(() => {
    const zp = model?.zonePositions ?? []
    const totalSpan = zp.length > 0 ? zp[zp.length - 1].x + 200 : 2600
    return { width: Math.max(2600, totalSpan), depth: 1400, height: 200 }
  }, [model])

  const picked = useMemo(() => {
    if (!pickedId || !model) return { location: null, warehouse: null, inventory: null }
    const location = model.locationById.get(pickedId) ?? null
    const warehouse = location ? model.warehouseById.get(location.warehouseId) ?? null : null
    const inventory = model.inventoryByLoc.get(pickedId) ?? null
    return { location, warehouse, inventory }
  }, [pickedId, model])

  return (
    <div ref={containerRef} className="mes-sim">
      <div className="mes-sim__topbar">
        <HeatLegend />
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="size-4" />
          刷新
        </Button>
        <FullscreenButton targetRef={containerRef} />
        <Button variant="outline" size="sm" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="size-4" />
          返回
        </Button>
      </div>

      {hasData && <Hud stats={model.stats} />}
      {hasData && <DataPanels perWarehouse={model.stats.perWarehouse} />}

      {loading && !model && <div className="mes-sim__overlay">加载仓库数据…</div>}
      {!!error && (
        <div className="mes-sim__overlay mes-sim__overlay--error">
          加载失败
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            重试
          </Button>
        </div>
      )}
      {!loading && model && model.warehouses.length === 0 && (
        <div className="mes-sim__overlay">暂无仓库数据，请先在基础数据中添加仓库</div>
      )}

      {hasData && (
        <Canvas camera={{ position: [0, 200, 600], fov: 45, near: 0.1, far: 10000 }} gl={{ antialias: true }}>
          <SceneSetup />
          <WarehouseBuilding width={buildingDims.width} depth={buildingDims.depth} height={buildingDims.height} />
          <Billboard />
          {model.zonePositions.map(({ wh, x }) => (
            <WarehouseZone
              key={wh.id}
              warehouse={wh}
              locations={model.locationsByWh.get(wh.id) ?? []}
              positionX={x}
              occupancyByLoc={model.occupancyByLoc}
              globalMax={model.globalMax}
              onPick={setPickedId}
            />
          ))}
        </Canvas>
      )}

      <LocationDetailSheet
        open={pickedId !== null}
        onOpenChange={(o) => {
          if (!o) setPickedId(null)
        }}
        location={picked.location}
        warehouse={picked.warehouse}
        inventory={picked.inventory}
      />
    </div>
  )
}
