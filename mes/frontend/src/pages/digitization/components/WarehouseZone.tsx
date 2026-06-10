// mes/frontend/src/pages/digitization/components/WarehouseZone.tsx
import { useLoader } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import Shelf from './Shelf'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

interface Props {
  warehouse: SpWarehouse
  locations: SpWarehouseLocation[]
  positionX: number
}

const LINE_TEX = '/lib/ThreeJs/images/line.png'

const BOARD_LENGTH = 55
const BOARD_WIDTH = 24
const BOARD_HEIGHT = 2
const PILLAR_W = 2
const PILLAR_H = 25
const BOX_SIZE = 16

function ZoneBoundary({ width, depth, posX }: { width: number; depth: number; posX: number }) {
  const lineTex = useLoader(THREE.TextureLoader, LINE_TEX)
  const lineW = 8

  return (
    <group position={[posX, 1.5, 0]}>
      <mesh position={[-width / 2, 0, -depth / 2]}>
        <planeGeometry args={[lineW, depth]} />
        <meshLambertMaterial map={lineTex} transparent side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[width / 2, 0, -depth / 2]}>
        <planeGeometry args={[lineW, depth]} />
        <meshLambertMaterial map={lineTex} transparent side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -depth / 2 + lineW / 2]} rotation={[0, 0, -Math.PI / 2]}>
        <planeGeometry args={[lineW, width]} />
        <meshLambertMaterial map={lineTex} transparent side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, depth / 2 - lineW / 2]} rotation={[0, 0, -Math.PI / 2]}>
        <planeGeometry args={[lineW, width]} />
        <meshLambertMaterial map={lineTex} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function ZoneLabel({ name, posX, depth }: { name: string; posX: number; depth: number }) {
  return (
    <Text
      position={[posX, 1.3, depth / 2 - 20]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={20}
      color="#FF0000"
      name={`库区${name}`}
    >
      {name}
    </Text>
  )
}

export default function WarehouseZone({ warehouse, locations, positionX }: Props) {
  const groups = warehouse.groups || 1
  const rows = warehouse.rows || 1
  const layers = warehouse.layers || 1
  const columns = warehouse.columns || 1

  const locMap = new Map<string, SpWarehouseLocation>()
  locations.forEach((loc) => {
    const key = `${loc.groupNo || 1}-${loc.rowNo || 1}-${loc.layerNo || 1}-${loc.colNo || 1}`
    locMap.set(key, loc)
  })

  const shelfGapX = BOARD_LENGTH + 20
  const shelfGapZ = BOARD_WIDTH + 30
  const zoneWidth = columns * shelfGapX
  const zoneDepth = rows * groups * shelfGapZ

  const shelfElements: React.ReactNode[] = []

  for (let g = 0; g < groups; g++) {
    for (let r = 0; r < rows; r++) {
      const sx = positionX
      const sz = g * rows * shelfGapZ + r * shelfGapZ - (groups * rows * shelfGapZ) / 2 + shelfGapZ / 2

      const cargoes = []
      for (let l = 0; l < layers; l++) {
        for (let c = 0; c < columns; c++) {
          const key = `${g + 1}-${r + 1}-${l + 1}-${c + 1}`
          const loc = locMap.get(key)
          cargoes.push({
            code: loc?.code || '',
            locationId: loc?.id || key,
          })
        }
      }

      shelfElements.push(
        <Shelf
          key={`shelf-${g}-${r}`}
          position={[sx, 0, sz]}
          layers={layers}
          columns={columns}
          boardLength={BOARD_LENGTH}
          boardWidth={BOARD_WIDTH}
          boardHeight={BOARD_HEIGHT}
          pillarW={PILLAR_W}
          pillarH={PILLAR_H}
          boxSize={BOX_SIZE}
          cargoes={cargoes}
        />,
      )
    }
  }

  return (
    <group>
      <ZoneLabel name={warehouse.name} posX={positionX} depth={zoneDepth} />
      <ZoneBoundary width={zoneWidth} depth={zoneDepth} posX={positionX} />
      {shelfElements}
    </group>
  )
}
