// mes/frontend/src/pages/digitization/Simulation3D.tsx
import { useEffect, useState, useMemo } from 'react'
import { Spin, Empty } from 'antd'
import { Canvas } from '@react-three/fiber'
import * as whApi from '@/api/basedata/warehouse'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import SceneSetup from './components/SceneSetup'
import WarehouseBuilding from './components/WarehouseBuilding'
import WarehouseZone from './components/WarehouseZone'
import DataPanels from './components/DataPanels'
import Billboard from './components/Billboard'

function LoadingOverlay() {
  return (
    <div style={{
      position: 'absolute', top: 60, left: '50%', zIndex: 20,
      transform: 'translateX(-50%)',
    }}>
      <Spin tip="加载仓库数据..." />
    </div>
  )
}

function InfoBar({ warehouses, locationCount }: { warehouses: SpWarehouse[]; locationCount: number }) {
  return (
    <div style={{
      position: 'absolute', top: 12, left: 16, zIndex: 10,
      color: '#fff', fontSize: 14, background: 'rgba(0,0,0,0.5)',
      padding: '8px 16px', borderRadius: 6, lineHeight: 1.8,
    }}>
      <div>仓库数: <b>{warehouses.length}</b> | 总库位数: <b>{locationCount}</b></div>
      {warehouses.map((w) => (
        <span key={w.id} style={{ marginRight: 16 }}>
          {w.name} — {w.groups}组×{w.rows}排×{w.layers}层×{w.columns}列
        </span>
      ))}
    </div>
  )
}

export default function Simulation3D() {
  const [warehouses, setWarehouses] = useState<SpWarehouse[]>([])
  const [allLocations, setAllLocations] = useState<Map<string, SpWarehouseLocation[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    whApi.getList().then((data: any) => {
      if (cancelled) return
      const list: SpWarehouse[] = Array.isArray(data) ? data : []
      setWarehouses(list)

      // Fetch locations for all warehouses in parallel
      if (list.length > 0) {
        Promise.all(
          list.map((w) =>
            whApi.getLocations(w.id).then((locs: any) => [w.id, Array.isArray(locs) ? locs : []] as const),
          ),
        ).then((results) => {
          if (!cancelled) {
            const map = new Map<string, SpWarehouseLocation[]>()
            results.forEach(([id, locs]) => map.set(id as string, locs as SpWarehouseLocation[]))
            setAllLocations(map)
            setLoading(false)
          }
        }).catch(() => {
          if (!cancelled) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  // Compute zone positions — spread warehouse zones along X axis
  const zonePositions = useMemo(() => {
    const pos: { wh: SpWarehouse; x: number }[] = []
    let currentX = 0
    const ZONE_GAP = 100

    for (const wh of warehouses) {
      const columns = wh.columns || 1
      const zoneW = columns * (55 + 20) // BOARD_LENGTH + shelfGapX
      pos.push({ wh, x: currentX })
      currentX += zoneW + ZONE_GAP
    }

    return pos
  }, [warehouses])

  // Compute building dimensions based on total warehouse span
  const buildingDims = useMemo(() => {
    const totalSpan = zonePositions.length > 0
      ? zonePositions[zonePositions.length - 1].x + 200
      : 2600
    return {
      width: Math.max(2600, totalSpan),
      depth: 1400,
      height: 200,
    }
  }, [zonePositions])

  const totalLocations = useMemo(
    () => {
      let count = 0
      allLocations.forEach((locs) => { count += locs.length })
      return count
    },
    [allLocations],
  )

  const warehouseStats = useMemo(
    () => warehouses.map((w) => ({ name: w.name, count: allLocations.get(w.id)?.length || 0 })),
    [warehouses, allLocations],
  )

  if (!loading && warehouses.length === 0) {
    return (
      <div style={{ width: '100%', height: 'calc(100vh - 100px)', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1a1a2e' }}>
        <Empty description="暂无仓库数据，请先在基础数据中添加仓库" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 100px)', background: '#4682B4', position: 'relative' }}>
      {loading && <LoadingOverlay />}
      <InfoBar warehouses={warehouses} locationCount={totalLocations} />

      <Canvas
        camera={{ position: [0, 200, 600], fov: 45, near: 0.1, far: 10000 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneSetup />
        <WarehouseBuilding
          width={buildingDims.width}
          depth={buildingDims.depth}
          height={buildingDims.height}
        />
        <Billboard />
        {zonePositions.map(({ wh, x }) => (
          <WarehouseZone
            key={wh.id}
            warehouse={wh}
            locations={allLocations.get(wh.id) || []}
            positionX={x}
          />
        ))}
        <DataPanels warehouses={warehouseStats} />
      </Canvas>
    </div>
  )
}
