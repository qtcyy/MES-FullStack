import { useEffect, useState } from 'react'
import { Select, Spin, Empty } from 'antd'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as whApi from '@/api/basedata/warehouse'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

const COLORS = ['#4a90d9', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#409eff']

interface SceneProps {
  warehouse: SpWarehouse
  locations: SpWarehouseLocation[]
}

function WarehouseScene({ warehouse, locations }: SceneProps) {
  const groups = warehouse.groups || 1
  const rows = warehouse.rows || 1
  const layers = warehouse.layers || 1
  const columns = warehouse.columns || 1

  // Build lookup: group_no -> row_no -> layer_no -> col_no -> location code
  const locMap = new Map<string, string>()
  locations.forEach((loc) => {
    locMap.set(`${loc.groupNo}-${loc.rowNo}-${loc.layerNo}-${loc.colNo}`, loc.code)
  })

  // Generate shelf positions based on warehouse spec
  const shelves: { pos: [number, number, number]; groupIdx: number; color: string; label: string }[] = []
  let i = 0
  const spacingX = 3  // space between columns
  const spacingZ = 4  // space between rows + aisle
  const spacingY = 3  // layer height
  const groupGap = 6  // extra gap between groups

  for (let g = 1; g <= groups; g++) {
    for (let r = 1; r <= rows; r++) {
      for (let l = 1; l <= layers; l++) {
        for (let c = 1; c <= columns; c++) {
          const x = (c - 1) * spacingX - ((columns - 1) * spacingX) / 2
          const y = (l - 1) * spacingY + 1.5
          const z = (r - 1) * spacingZ + (g - 1) * (rows * spacingZ + groupGap) - (groups * rows * spacingZ) / 4
          const label = locMap.get(`${g}-${r}-${l}-${c}`) || ''
          shelves.push({
            pos: [x, y, z],
            groupIdx: g - 1,
            color: COLORS[(g - 1) % COLORS.length],
            label,
          })
          i++
        }
      }
    }
  }

  const floorSize = Math.max(50, i * 1.5)

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-10, 5, -5]} intensity={0.4} />

      <Grid args={[floorSize, floorSize]} cellSize={1} cellThickness={0.6}
        cellColor="#6a6a8a" sectionSize={5} sectionThickness={1.2} sectionColor="#9a9abf" />

      {shelves.map((s, i) => (
        <mesh key={i} position={s.pos} castShadow receiveShadow>
          <boxGeometry args={[2, 2.5, 2]} />
          <meshStandardMaterial color={s.color} roughness={0.3} metalness={0.1} />
        </mesh>
      ))}

      <OrbitControls enableDamping target={[0, layers * 1.5, 0]} />
    </>
  )
}

export default function Simulation3D() {
  const [warehouses, setWarehouses] = useState<SpWarehouse[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [locations, setLocations] = useState<SpWarehouseLocation[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    whApi.getList().then((data: any) => {
      const list = Array.isArray(data) ? data : []
      setWarehouses(list)
      if (list.length > 0) {
        setSelectedId(list[0].id)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedId) {
      setLoading(true)
      whApi.getLocations(selectedId).then((data: any) => {
        setLocations(Array.isArray(data) ? data : [])
      }).finally(() => setLoading(false))
    }
  }, [selectedId])

  const selectedWh = warehouses.find((w) => w.id === selectedId)

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 150px)', background: '#1a1a2e', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Select
          value={selectedId}
          onChange={setSelectedId}
          style={{ width: 280 }}
          placeholder="选择库房"
          options={warehouses.map((w) => ({ label: `${w.name} (${w.code})`, value: w.id }))}
        />
        {selectedWh && (
          <span style={{ color: '#ccc', fontSize: 14 }}>
            规格: {selectedWh.groups}组 × {selectedWh.rows}排 × {selectedWh.layers}层 × {selectedWh.columns}列
            &nbsp;|&nbsp;库位: {locations.length} 个
          </span>
        )}
      </div>

      {selectedId ? (
        <Spin spinning={loading} wrapperClassName="full-spin">
          <Canvas camera={{ position: [20, 15, 20], fov: 60 }} shadows gl={{ antialias: true }}>
            {selectedWh && <WarehouseScene warehouse={selectedWh} locations={locations} />}
          </Canvas>
        </Spin>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Empty description="暂无库房数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )}
    </div>
  )
}
