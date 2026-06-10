# 3D 数字仿真页面重设计 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Simulation3D.tsx 从"单一仓库盒子展示"改为旧版"工厂仓库全景仿真"风格——所有仓库在同一个 3D 场景展示，带工厂建筑、天空盒、货架结构、货物、数据面板和滚动标语。

**Architecture:** 页面顶层 Simulation3D 负责数据获取，下层拆分为 6 个独立组件（SceneSetup / WarehouseBuilding / WarehouseZone / Shelf / DataPanels / Billboard），每个组件封装单一 3D 职责。数据流：API → Simulation3D → 各子组件 props。

**Tech Stack:** React 18 + TypeScript, @react-three/fiber, @react-three/drei, three, echarts, antd

---

## 文件结构

```
mes/frontend/src/pages/digitization/
├── Simulation3D.tsx             (重写：主页面，数据获取 + 场景组装)
└── components/
    ├── SceneSetup.tsx           (新增：灯光 + 天空盒 + OrbitControls)
    ├── WarehouseBuilding.tsx    (新增：地板 + 四面墙 + 门窗纹理面片)
    ├── WarehouseZone.tsx        (新增：库区 3D 标注 + 边界 + 货架排列)
    ├── Shelf.tsx                (新增：层板 + 立柱 + 货物盒子)
    ├── DataPanels.tsx           (新增：ECharts 饼图 + 柱状图 Sprite)
    └── Billboard.tsx            (新增：滚动标语平面)

mes/src/main/resources/static/lib/ThreeJs/
├── FZYaoTi_Regular.json        (恢复：3D 字体)
└── images/                     (恢复：所有纹理图片 + 天空盒)
    ├── floor.jpg, rack.png, box.png, plane.png, line.png
    ├── door_left.png, door_right.png, window.png, biaoyu.png
    └── skybox/*.jpg
```

**空间布局规则：** 多个仓库沿 X 轴水平排开，间距 = 仓库 columns × 3 + 50。每行(rows)沿 Z 轴，每组(groups)沿 X 轴偏移，层(layers)沿 Y 轴堆叠。建筑大小根据仓库总范围动态计算，最小不低于旧版尺寸 2600×1400×200。

**纹理路径：** 静态资源通过 Vite 代理 `/lib/ThreeJs/images/...` 从后端 static 目录加载（前端请求路径与后端 static 目录一致）。

---

### Task 1: 恢复旧版静态资源

**Files:**
- Restore: `mes/src/main/resources/static/lib/ThreeJs/FZYaoTi_Regular.json`
- Restore: `mes/src/main/resources/static/lib/ThreeJs/images/` (全部)

> 各 skybox 文件名包含中文字符，从 git 恢复时需处理编码。

- [ ] **Step 1: 从 git 历史恢复字体文件**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git show 3fef5a5:'mes/src/main/resources/static/lib/ThreeJs/FZYaoTi_Regular.json' > mes/src/main/resources/static/lib/ThreeJs/FZYaoTi_Regular.json
```

- [ ] **Step 2: 恢复所有纹理图片**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
mkdir -p mes/src/main/resources/static/lib/ThreeJs/images/skybox

# 普通图片
for f in floor.jpg rack.png box.png plane.png line.png door_left.png door_right.png window.png biaoyu.png roll.png; do
  git show "3fef5a5:mes/src/main/resources/static/lib/ThreeJs/images/$f" > "mes/src/main/resources/static/lib/ThreeJs/images/$f"
done

# 天空盒（中文文件名需用 git ls-tree 获取确切 blob 然后用 hash 导出）
# 天空盒文件汉字编码为 UTF-8 URL encode，需逐个处理
git show "3fef5a5:mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_BK.jpg" > "mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_BK.jpg"
git show "3fef5a5:mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_DN.jpg" > "mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_DN.jpg"
git show "3fef5a5:mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_FR.jpg" > "mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_FR.jpg"
git show "3fef5a5:mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_LF.jpg" > "mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_LF.jpg"
git show "3fef5a5:mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_RT.jpg" > "mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_RT.jpg"
git show "3fef5a5:mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_UP.jpg" > "mes/src/main/resources/static/lib/ThreeJs/images/skybox/远山_UP.jpg"
```

- [ ] **Step 3: 验证文件已恢复**

```bash
ls -la mes/src/main/resources/static/lib/ThreeJs/FZYaoTi_Regular.json
ls -la mes/src/main/resources/static/lib/ThreeJs/images/
ls -la mes/src/main/resources/static/lib/ThreeJs/images/skybox/
```

预期：列出字体 JSON 文件、11 个 images 文件、6 个 skybox jpg 文件。

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/resources/static/lib/ThreeJs/
git commit -m "✨ feat: restore Three.js static assets (textures, font) from old version"
```

---

### Task 2: 创建 SceneSetup 组件（灯光 + 天空盒 + 控制器）

**Files:**
- Create: `mes/frontend/src/pages/digitization/components/SceneSetup.tsx`

- [ ] **Step 1: 创建 SceneSetup.tsx**

组件职责：提供环境光和方向光、天空盒背景（复用 skybox 6 面纹理）、OrbitControls（限制视角范围）。

```tsx
// mes/frontend/src/pages/digitization/components/SceneSetup.tsx
import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

const SKYBOX_BASE = '/lib/ThreeJs/images/skybox/'
const FACES = [
  '远山_RT.jpg', // right
  '远山_LF.jpg', // left
  '远山_UP.jpg', // top
  '远山_DN.jpg', // bottom
  '远山_FR.jpg', // front
  '远山_BK.jpg', // back
]

export default function SceneSetup() {
  const { scene } = useThree()
  const added = useRef(false)

  useEffect(() => {
    if (added.current) return
    added.current = true

    const loader = new THREE.CubeTextureLoader()
    loader.setPath(SKYBOX_BASE)
    const skyboxTexture = loader.load(FACES)
    scene.background = skyboxTexture
  }, [scene])

  return (
    <>
      <ambientLight intensity={0.8} color="#ffffff" />
      <directionalLight
        position={[0, 200, 0]}
        intensity={0.4}
        color="#ffffff"
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.5}
        minDistance={50}
        maxDistance={1500}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 50, 0]}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add mes/frontend/src/pages/digitization/components/SceneSetup.tsx
git commit -m "✨ feat: add SceneSetup component (lights, skybox, controls)"
```

---

### Task 3: 创建 WarehouseBuilding 组件（地板 + 墙 + 门窗）

**Files:**
- Create: `mes/frontend/src/pages/digitization/components/WarehouseBuilding.tsx`

组件以 wall-segment 方式构建前墙，在门洞和窗洞位置留空，然后用纹理面片放置门和窗。

建筑尺寸（props 传入，默认与旧版一致）：
- width: 2600, depth: 1400, height: 200

前墙开口位置（默认值）：
- 门洞 1: x=-600, y=90, 200×180
- 门洞 2: x=600, y=90, 200×180
- 窗洞 1-4: x=-900/-200/200/900, y=90, 100×100

- [ ] **Step 1: 创建 WarehouseBuilding.tsx**

```tsx
// mes/frontend/src/pages/digitization/components/WarehouseBuilding.tsx
import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  width?: number
  depth?: number
  height?: number
}

// Precompute front wall segments to leave gaps for doors/windows
// Segments fill the space between openings
interface Opening {
  cx: number    // center x (local to front wall, 0 = center of scene)
  cy: number    // center y
  w: number     // opening width
  h: number     // opening height
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
  wallHeight: number,
  openings: Opening[],
): { x: number; w: number }[] {
  // Sort openings by x
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

  // Wall texture
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
      <DoorPanel cx={-700} wallZ={halfD - WALL_THICKNESS / 2} wallHeight={height} type="left" />
      <DoorPanel cx={-500} wallZ={halfD - WALL_THICKNESS / 2} wallHeight={height} type="right" />
      {/* Doors — right door pair */}
      <DoorPanel cx={500} wallZ={halfD - WALL_THICKNESS / 2} wallHeight={height} type="left" />
      <DoorPanel cx={700} wallZ={halfD - WALL_THICKNESS / 2} wallHeight={height} type="right" />

      {/* Windows */}
      {DEFAULT_WINDOWS.map((win, i) => (
        <WindowPanel key={i} cx={win.cx} cy={win.cy} wallZ={halfD - WALL_THICKNESS / 2} />
      ))}
    </group>
  )
}

function DoorPanel({ cx, wallZ, wallHeight, type }: { cx: number; wallZ: number; wallHeight: number; type: 'left' | 'right' }) {
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
```

- [ ] **Step 2: Commit**

```bash
git add mes/frontend/src/pages/digitization/components/WarehouseBuilding.tsx
git commit -m "✨ feat: add WarehouseBuilding component (floor, walls, doors, windows)"
```

---

### Task 4: 创建 Shelf 组件（层板 + 立柱 + 货物）

**Files:**
- Create: `mes/frontend/src/pages/digitization/components/Shelf.tsx`

每个货架是一个垂直堆叠结构：layers 层，每层一块板 + 4 根立柱 + columns 个货物盒子。

- [ ] **Step 1: 创建 Shelf.tsx**

```tsx
// mes/frontend/src/pages/digitization/components/Shelf.tsx
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface CargoInfo {
  code: string    // 货物/库位编码
  locationId: string
}

interface ShelfProps {
  position: [number, number, number]
  layers: number
  columns: number
  // Sizes (match old version defaults)
  boardLength?: number   // X — board length (along shelf width)
  boardWidth?: number    // Z — board depth
  boardHeight?: number   // Y — board thickness
  pillarW?: number       // pillar cross-section
  pillarH?: number       // pillar height (vertical, between boards)
  boxSize?: number       // cargo cube size
  cargoes: CargoInfo[]   // indexed: layerIdx * columns + colIdx
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

    // Shelf board — spans X by boardLength, Y by boardHeight, Z by boardWidth
    elements.push(
      <mesh key={`board-${l}`} position={[0, y, 0]} receiveShadow castShadow>
        <boxGeometry args={[boardLength, boardHeight, boardWidth]} />
        <meshLambertMaterial map={rackTex} />
      </mesh>,
    )

    // Four pillars going down from the board (between this board and the board below, or floor)
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
      // Distribute boxes evenly along the board length (Z axis in old model, but here boardLength is Z-ish)
      // Actually in our coordinate system, boardLength is along X and boardWidth is along Z
      // Columns are spread along X
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
```

- [ ] **Step 2: Commit**

```bash
git add mes/frontend/src/pages/digitization/components/Shelf.tsx
git commit -m "✨ feat: add Shelf component (board, pillars, cargo boxes)"
```

---

### Task 5: 创建 WarehouseZone 组件（库区标注 + 边界 + 货架排列）

**Files:**
- Create: `mes/frontend/src/pages/digitization/components/WarehouseZone.tsx`

- [ ] **Step 1: 创建 WarehouseZone.tsx**

```tsx
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
const FONT_URL = '/lib/ThreeJs/FZYaoTi_Regular.json'

// Shelf sizes matching old version config
const BOARD_LENGTH = 55   // X — along shelf width
const BOARD_WIDTH = 24    // Z — shelf depth
const BOARD_HEIGHT = 2
const PILLAR_W = 2
const PILLAR_H = 25
const BOX_SIZE = 16

function ZoneBoundary({ width, depth, posX }: { width: number; depth: number; posX: number }) {
  const lineTex = useLoader(THREE.TextureLoader, LINE_TEX)
  const lineW = 8

  return (
    <group position={[posX, 1.5, 0]}>
      {/* Left edge */}
      <mesh position={[-width / 2, 0, -depth / 2]}>
        <planeGeometry args={[lineW, depth]} />
        <meshLambertMaterial map={lineTex} transparent side={THREE.DoubleSide} />
      </mesh>
      {/* Right edge */}
      <mesh position={[width / 2, 0, -depth / 2]}>
        <planeGeometry args={[lineW, depth]} />
        <meshLambertMaterial map={lineTex} transparent side={THREE.DoubleSide} />
      </mesh>
      {/* Top edge */}
      <mesh position={[0, 0, -depth / 2 + lineW / 2]} rotation={[0, 0, -Math.PI / 2]}>
        <planeGeometry args={[lineW, width]} />
        <meshLambertMaterial map={lineTex} transparent side={THREE.DoubleSide} />
      </mesh>
      {/* Bottom edge */}
      <mesh position={[0, 0, depth / 2 - lineW / 2]} rotation={[0, 0, -Math.PI / 2]}>
        <planeGeometry args={[lineW, width]} />
        <meshLambertMaterial map={lineTex} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function ZoneLabel({ name, posX, depth }: { name: string; posX: number; depth: number }) {
  // drei Text handles font loading internally; uses troika-three-text for SDF rendering
  return (
    <Text
      font={FONT_URL}
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

  // Build location lookup: groupNo-rowNo-layerNo-colNo → location
  const locMap = new Map<string, SpWarehouseLocation>()
  locations.forEach((loc) => {
    const key = `${loc.groupNo || 1}-${loc.rowNo || 1}-${loc.layerNo || 1}-${loc.colNo || 1}`
    locMap.set(key, loc)
  })

  // Total zone dimensions
  const shelfGapX = BOARD_LENGTH + 20        // gap between shelf columns in X
  const shelfGapZ = BOARD_WIDTH + 30         // gap between rows in Z
  const zoneWidth = columns * shelfGapX
  const zoneDepth = rows * groups * shelfGapZ

  // Generate shelves
  const shelfElements: React.ReactNode[] = []

  for (let g = 0; g < groups; g++) {
    for (let r = 0; r < rows; r++) {
      // Position each shelf (one row in one group, all columns in that row)
      const sx = positionX
      const sz = g * rows * shelfGapZ + r * shelfGapZ - (groups * rows * shelfGapZ) / 2 + shelfGapZ / 2

      // Cargos for this shelf row: layers × columns
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
```

- [ ] **Step 2: Commit**

```bash
git add mes/frontend/src/pages/digitization/components/WarehouseZone.tsx
git commit -m "✨ feat: add WarehouseZone component (label, boundary, shelf layout)"
```

---

### Task 6: 创建 DataPanels 组件（ECharts 3D Sprite）

**Files:**
- Create: `mes/frontend/src/pages/digitization/components/DataPanels.tsx`

用 ECharts 渲染到隐藏 Canvas → 提取 dataURL → 贴到 Three.js Sprite 上。

- [ ] **Step 1: 创建 DataPanels.tsx**

```tsx
// mes/frontend/src/pages/digitization/components/DataPanels.tsx
import { useEffect, useState, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import * as echarts from 'echarts'

interface Props {
  warehouses: { name: string; count: number }[]
  position?: [number, number, number]
}

export default function DataPanels({
  warehouses,
  position = [-100, 180, 0],
}: Props) {
  const { scene } = useThree()
  const added = useRef(false)

  useEffect(() => {
    if (added.current) return
    added.current = true

    // --- Pie chart (庫區分布) ---
    const pieCanvas = document.createElement('canvas')
    pieCanvas.width = 512
    pieCanvas.height = 512
    const pieChart = echarts.init(pieCanvas)
    pieChart.setOption({
      title: {
        text: '黑科数字仿真数据',
        subtext: '库区分布',
        x: 'center',
        textStyle: { color: '#fff', fontSize: 20 },
      },
      tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
      legend: {
        orient: 'vertical',
        left: 'left',
        textStyle: { color: '#ccc' },
        data: warehouses.map((w) => w.name),
      },
      series: [{
        name: '库区',
        type: 'pie',
        radius: '55%',
        center: ['50%', '60%'],
        data: warehouses.map((w) => ({ value: w.count, name: w.name })),
        itemStyle: {
          emphasis: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
        },
      }],
    })

    pieChart.on('finished', () => {
      const tex = new THREE.TextureLoader().load(pieChart.getDataURL())
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(150, 150, 1)
      sprite.position.set(position[0], position[1], position[2])
      sprite.name = '数据面板-饼图'
      scene.add(sprite)
    })

    // --- Bar chart ---
    const barCanvas = document.createElement('canvas')
    barCanvas.width = 512
    barCanvas.height = 512
    const barChart = echarts.init(barCanvas)
    barChart.setOption({
      color: ['#3398DB'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: [{
        type: 'category',
        data: warehouses.map((w) => w.name),
        axisTick: { alignWithLabel: true },
      }],
      yAxis: [{ type: 'value' }],
      series: [{
        name: '库位数',
        type: 'bar',
        barWidth: '60%',
        data: warehouses.map((w) => w.count),
      }],
    })

    barChart.on('finished', () => {
      const tex = new THREE.TextureLoader().load(barChart.getDataURL())
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(150, 150, 1)
      sprite.position.set(position[0] + 200, position[1], position[2])
      sprite.name = '数据面板-柱状图'
      scene.add(sprite)
    })

    return () => {
      pieChart.dispose()
      barChart.dispose()
    }
  }, [scene, warehouses, position])

  // This component doesn't render any React-managed meshes — side-effect based
  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add mes/frontend/src/pages/digitization/components/DataPanels.tsx
git commit -m "✨ feat: add DataPanels component (ECharts pie + bar as 3D sprites)"
```

---

### Task 7: 创建 Billboard 组件（滚动标语）

**Files:**
- Create: `mes/frontend/src/pages/digitization/components/Billboard.tsx`

用 useFrame 驱动纹理 UV offset 实现滚动。

- [ ] **Step 1: 创建 Billboard.tsx**

```tsx
// mes/frontend/src/pages/digitization/components/Billboard.tsx
import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

const BIAOYU_TEX = '/lib/ThreeJs/images/biaoyu.png'

export default function Billboard() {
  const meshRef = useRef<THREE.Mesh>(null)
  const texture = useLoader(THREE.TextureLoader, BIAOYU_TEX)
  // Enable repeating so offset scrolls
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshLambertMaterial
    if (mat.map) {
      mat.map.offset.x += delta * 0.05
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, 150, -690]}
      name="滚动标语"
    >
      <planeGeometry args={[400, 20]} />
      <meshLambertMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add mes/frontend/src/pages/digitization/components/Billboard.tsx
git commit -m "✨ feat: add Billboard component (scrolling text banner)"
```

---

### Task 8: 重写 Simulation3D 主页面

**Files:**
- Modify: `mes/frontend/src/pages/digitization/Simulation3D.tsx`

- [ ] **Step 1: 重写 Simulation3D.tsx**

整合所有子组件，从 API 获取仓库数据，按区排列。场景总尺寸根据仓库数据动态计算。

```tsx
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
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
cd mes/frontend && npx tsc --noEmit 2>&1 | head -50
```

按类型错误修复后再次检查，预期无错误。

- [ ] **Step 3: Lint 检查**

```bash
cd mes/frontend && npm run lint 2>&1 | tail -20
```

修复 lint 问题（如果有的话）。

- [ ] **Step 4: Commit**

```bash
git add mes/frontend/src/pages/digitization/Simulation3D.tsx
git commit -m "✨ feat: rewrite Simulation3D with warehouse panorama, shelves, and old-style visuals"
```

---

### Task 9: 构建验证 & 运行验证

**Files:** N/A (build verification only)

- [ ] **Step 1: 前端构建**

```bash
cd mes/frontend && npm run build 2>&1 | tail -20
```

预期：构建成功，无错误。

- [ ] **Step 2: 完整项目构建（不含测试）**

```bash
cd mes && mvn clean package -DskipTests 2>&1 | tail -20
```

预期：BUILD SUCCESS。

- [ ] **Step 3: 提交最终更改并生成报告**

如果有任何剩余的修改，提交：

```bash
git add -A
git status
git commit -m "✨ feat: complete 3D simulation redesign"
```

---

## 验收标准

1. 🏭 工厂建筑可见：地板 + 四面墙 + 2 门 + 4 窗
2. 🌌 天空盒背景存在
3. 📦 所有数据库仓库的数据在同一场景中展示，每个仓库 = 一个库区
4. 🏗️ 货架有完整结构：层板（带纹理）+ 4 根立柱 + 货物盒子（带纹理）
5. 🏷️ 每个库区有 3D 名称标注 + 边框
6. 📊 ECharts 饼图和柱状图在 3D 场景中以 Sprite 显示
7. 🎬 滚动标语 banner 可见
8. 🎥 OrbitControls 可旋转/缩放/平移
9. 📱 TypeScript 编译通过 + 构建成功
