// mes/frontend/src/pages/digitization/components/WarehouseBuilding.tsx
import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  width?: number
  depth?: number
  height?: number
}

interface Opening {
  cx: number
  cy: number
  w: number
  h: number
}

const DEFAULT_DOORS: Opening[] = [
  { cx: -600, cy: 90, w: 200, h: 180 },
  { cx: 600, cy: 90, w: 200, h: 180 },
]

const DEFAULT_WINDOWS: Opening[] = [
  { cx: -900, cy: 90, w: 100, h: 100 },
  { cx: -200, cy: 90, w: 100, h: 100 },
  { cx: 200, cy: 90, w: 100, h: 100 },
  { cx: 900, cy: 90, w: 100, h: 100 },
]

const WALL_THICKNESS = 10

function makeWallSegments(
  fullWidth: number,
  _wallHeight: number,
  openings: Opening[],
): { x: number; w: number }[] {
  const sorted = [...openings].sort((a, b) => a.cx - b.cx)
  const segments: { x: number; w: number }[] = []

  let current = -fullWidth / 2
  for (const op of sorted) {
    const opLeft = op.cx - op.w / 2
    if (opLeft > current) {
      const segW = opLeft - current
      segments.push({ x: current + segW / 2, w: segW })
    }
    current = Math.max(current, op.cx + op.w / 2)
  }
  if (current < fullWidth / 2) {
    const segW = fullWidth / 2 - current
    segments.push({ x: current + segW / 2, w: segW })
  }
  return segments
}

function WallSegment({ x, w, h, z, color }: { x: number; w: number; h: number; z: number; color: string }) {
  const tex = useLoader(THREE.TextureLoader, '/lib/ThreeJs/images/plane.png')
  return (
    <mesh position={[x, h / 2, z]} receiveShadow castShadow>
      <boxGeometry args={[w, h, WALL_THICKNESS]} />
      <meshLambertMaterial map={tex} color={color} transparent opacity={0.9} />
    </mesh>
  )
}

export default function WarehouseBuilding({
  width = 2600,
  depth = 1400,
  height = 200,
}: Props) {
  const halfW = width / 2
  const halfD = depth / 2
  const halfH = height / 2

  const frontOpenings = [...DEFAULT_DOORS, ...DEFAULT_WINDOWS]
  const frontSegments = useMemo(
    () => makeWallSegments(width, height, frontOpenings),
    [width, height],
  )

  const floorTex = useLoader(THREE.TextureLoader, '/lib/ThreeJs/images/floor.jpg')
  useMemo(() => {
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping
    floorTex.repeat.set(10, 10)
  }, [floorTex])

  const wallTex = useLoader(THREE.TextureLoader, '/lib/ThreeJs/images/plane.png')

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow name="地面">
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial map={floorTex} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, halfH, -halfD + WALL_THICKNESS / 2]} receiveShadow castShadow name="后墙">
        <boxGeometry args={[width, height, WALL_THICKNESS]} />
        <meshLambertMaterial map={wallTex} color="#afc0ca" transparent opacity={0.9} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-halfW + WALL_THICKNESS / 2, halfH, 0]} receiveShadow castShadow name="左墙">
        <boxGeometry args={[WALL_THICKNESS, height, depth]} />
        <meshLambertMaterial map={wallTex} color="#9cb2d1" transparent opacity={0.9} />
      </mesh>

      {/* Right wall */}
      <mesh position={[halfW - WALL_THICKNESS / 2, halfH, 0]} receiveShadow castShadow name="右墙">
        <boxGeometry args={[WALL_THICKNESS, height, depth]} />
        <meshLambertMaterial map={wallTex} color="#9cb2d1" transparent opacity={0.9} />
      </mesh>

      {/* Front wall — constructed as segments */}
      {frontSegments.map((seg, i) => (
        <WallSegment key={i} x={seg.x} w={seg.w} h={height} z={halfD - WALL_THICKNESS / 2} color="#afc0ca" />
      ))}

      {/* Doors — left door pair */}
      <DoorPanel cx={-700} wallZ={halfD - WALL_THICKNESS / 2} type="left" />
      <DoorPanel cx={-500} wallZ={halfD - WALL_THICKNESS / 2} type="right" />
      {/* Doors — right door pair */}
      <DoorPanel cx={500} wallZ={halfD - WALL_THICKNESS / 2} type="left" />
      <DoorPanel cx={700} wallZ={halfD - WALL_THICKNESS / 2} type="right" />

      {/* Windows */}
      {DEFAULT_WINDOWS.map((win, i) => (
        <WindowPanel key={i} cx={win.cx} cy={win.cy} wallZ={halfD - WALL_THICKNESS / 2} />
      ))}
    </group>
  )
}

function DoorPanel({ cx, wallZ, type }: { cx: number; wallZ: number; type: 'left' | 'right' }) {
  const tex = useLoader(
    THREE.TextureLoader,
    type === 'left' ? '/lib/ThreeJs/images/door_left.png' : '/lib/ThreeJs/images/door_right.png',
  )
  return (
    <mesh position={[cx, 90, wallZ + 1]} name={type === 'left' ? '左门' : '右门'}>
      <planeGeometry args={[100, 180]} />
      <meshBasicMaterial map={tex} color="#ffffff" transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  )
}

function WindowPanel({ cx, cy, wallZ }: { cx: number; cy: number; wallZ: number }) {
  const tex = useLoader(THREE.TextureLoader, '/lib/ThreeJs/images/window.png')
  return (
    <mesh position={[cx, cy, wallZ + 1]} name="窗户">
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial map={tex} color="#ffffff" transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  )
}
