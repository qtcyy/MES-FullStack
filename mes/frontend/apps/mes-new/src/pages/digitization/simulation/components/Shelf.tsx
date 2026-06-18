import { useEffect, useState, type ReactNode } from 'react'
import { useLoader, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { heatColor } from '../heatColor'

export interface CargoInfo {
  /** 真实库位主键；网格无对应库位时为 null（不可拾取） */
  locationId: string | null
  code: string
  /** 该库位在库量（空=0） */
  qty: number
}

interface ShelfProps {
  position: [number, number, number]
  layers: number
  columns: number
  globalMax: number
  onPick: (locationId: string) => void
  boardLength?: number
  boardWidth?: number
  boardHeight?: number
  pillarW?: number
  pillarH?: number
  boxSize?: number
  cargoes: CargoInfo[]
}

const RACK_TEX = '/lib/ThreeJs/images/rack.png'

/** 单个货物盒：纯色热力 + hover 高亮 + 点击拾取 */
function CargoBox({
  position,
  size,
  color,
  locationId,
  onPick,
}: {
  position: [number, number, number]
  size: number
  color: string
  locationId: string | null
  onPick: (locationId: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const clickable = locationId !== null

  // 悬停态卸载兜底:若货物盒在 hover 中被卸载(数据刷新/重排),onPointerOut 可能不触发,
  // 这里在卸载或 hover 结束时复位光标,避免指针卡在 pointer。
  useEffect(() => {
    if (!hovered) return
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered])

  return (
    <mesh
      position={position}
      name={locationId ? `货物${locationId}` : '货位'}
      scale={hovered ? 1.18 : 1}
      castShadow
      onPointerOver={
        clickable
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              setHovered(true)
              document.body.style.cursor = 'pointer'
            }
          : undefined
      }
      onPointerOut={
        clickable
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              setHovered(false)
              document.body.style.cursor = 'auto'
            }
          : undefined
      }
      onClick={
        clickable
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation()
              onPick(locationId)
            }
          : undefined
      }
    >
      <boxGeometry args={[size, size, size]} />
      <meshLambertMaterial
        color={color}
        emissive={hovered ? '#ffffff' : '#000000'}
        emissiveIntensity={hovered ? 0.35 : 0}
      />
    </mesh>
  )
}

export default function Shelf({
  position,
  layers,
  columns,
  globalMax,
  onPick,
  boardLength = 55,
  boardWidth = 24,
  boardHeight = 2,
  pillarW = 2,
  pillarH = 25,
  boxSize = 16,
  cargoes,
}: ShelfProps) {
  const rackTex = useLoader(THREE.TextureLoader, RACK_TEX)

  const elements: ReactNode[] = []

  for (let l = 0; l < layers; l++) {
    const y = (l + 1) * (boardHeight + pillarH)

    // 层板
    elements.push(
      <mesh key={`board-${l}`} position={[0, y, 0]} receiveShadow castShadow>
        <boxGeometry args={[boardLength, boardHeight, boardWidth]} />
        <meshLambertMaterial map={rackTex} />
      </mesh>,
    )

    // 四根立柱
    const halfL = boardLength / 2 - pillarW / 2
    const halfW = boardWidth / 2 - pillarW / 2
    const pillarY = y - boardHeight / 2 - pillarH / 2
    const pillarPositions: [number, number, number][] = [
      [-halfL, pillarY, -halfW],
      [halfL, pillarY, -halfW],
      [-halfL, pillarY, halfW],
      [halfL, pillarY, halfW],
    ]
    pillarPositions.forEach(([px, py, pz], pi) => {
      elements.push(
        <mesh key={`pillar-${l}-${pi}`} position={[px, py, pz]} receiveShadow castShadow>
          <boxGeometry args={[pillarW, pillarH, pillarW]} />
          <meshPhongMaterial color="#1C86EE" />
        </mesh>,
      )
    })

    // 每列货物盒（热力着色）
    for (let c = 0; c < columns; c++) {
      const cargo = cargoes[l * columns + c]
      const spacing = boardLength / (columns + 1)
      const cx = (c + 1) * spacing - boardLength / 2
      const cargoY = y + boardHeight / 2 + boxSize / 2
      const qty = cargo?.qty ?? 0

      elements.push(
        <CargoBox
          key={`cargo-${l}-${c}`}
          position={[cx, cargoY, 0]}
          size={boxSize}
          color={heatColor(qty, globalMax)}
          locationId={cargo?.locationId ?? null}
          onPick={onPick}
        />,
      )
    }
  }

  return <group position={position}>{elements}</group>
}
