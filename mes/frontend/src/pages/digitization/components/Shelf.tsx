// mes/frontend/src/pages/digitization/components/Shelf.tsx
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface CargoInfo {
  code: string
  locationId: string
}

interface ShelfProps {
  position: [number, number, number]
  layers: number
  columns: number
  boardLength?: number
  boardWidth?: number
  boardHeight?: number
  pillarW?: number
  pillarH?: number
  boxSize?: number
  cargoes: CargoInfo[]
}

const RACK_TEX = '/lib/ThreeJs/images/rack.png'
const BOX_TEX = '/lib/ThreeJs/images/box.png'

export default function Shelf({
  position,
  layers,
  columns,
  boardLength = 55,
  boardWidth = 24,
  boardHeight = 2,
  pillarW = 2,
  pillarH = 25,
  boxSize = 16,
  cargoes,
}: ShelfProps) {
  const rackTex = useLoader(THREE.TextureLoader, RACK_TEX)
  const boxTex = useLoader(THREE.TextureLoader, BOX_TEX)

  const elements: React.ReactNode[] = []

  for (let l = 0; l < layers; l++) {
    const y = (l + 1) * (boardHeight + pillarH)

    // Shelf board
    elements.push(
      <mesh key={`board-${l}`} position={[0, y, 0]} receiveShadow castShadow>
        <boxGeometry args={[boardLength, boardHeight, boardWidth]} />
        <meshLambertMaterial map={rackTex} />
      </mesh>,
    )

    // Four pillars
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

    // Cargo boxes on each column
    for (let c = 0; c < columns; c++) {
      const cargoIdx = l * columns + c
      const cargo = cargoes[cargoIdx]
      const spacing = boardLength / (columns + 1)
      const cx = (c + 1) * spacing - boardLength / 2
      const cargoY = y + boardHeight / 2 + boxSize / 2

      elements.push(
        <mesh
          key={`cargo-${l}-${c}`}
          position={[cx, cargoY, 0]}
          name={cargo ? `货物$${cargo.locationId}` : `货位`}
          castShadow
        >
          <boxGeometry args={[boxSize, boxSize, boxSize]} />
          <meshLambertMaterial map={boxTex} />
        </mesh>,
      )
    }
  }

  return <group position={position}>{elements}</group>
}
