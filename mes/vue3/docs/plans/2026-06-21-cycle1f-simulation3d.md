# 子周期 1f 3D 数字孪生仓库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mes/vue3` 落地全屏深色 kiosk 的 3D 数字孪生仓库:按后端真实 仓库/库位/库存 用原生 Three.js 渲染三维货架,库位按在库量热力着色,支持轨道控制 + hover 高亮 + 点击库位详情 + HUD/图例 + 一键全屏。

**Architecture:** 顶层 `ScreenLayout` 壳(复用 1e)挂 `Simulation3DPage` 编排页;页内取数(warehouseList → 各仓库位并行 + 全量库存)→ `buildSceneModel` 纯函数合成视图模型 → 喂原生 Three.js 封装组件 `WarehouseScene`(onMounted 建场景、onUnmounted 彻底 dispose)。HUD/图例/详情用 DOM 覆盖层 + el-drawer。

**Tech Stack:** Vue3 `<script setup>` + TS + 新增 `three`(+@types/three)+ OrbitControls + axios `http` + vitest(纯函数 TDD)。复用 1e 的 ScreenLayout/ScreenHeader。

---

## 文件结构

```
src/types/warehouse.ts                                  # 新建:SpWarehouse / SpWarehouseLocation
src/types/inventory.ts                                  # 新建:SpInventory(仅场景所需)
src/api/basedata/warehouse.ts                           # 新建:warehouseList / warehouseLocations
src/api/inventory/stock.ts                              # 新建:pageInventory
src/utils/heatColor.ts                                  # 新建:热力色(移植,TDD)
src/utils/simulationModel.ts                            # 新建:场景纯逻辑(移植,TDD)
tests/heatColor.spec.ts                                 # 新建
tests/simulationModel.spec.ts                           # 新建
src/layouts/components/ScreenHeader.vue                 # 修改:加可选全屏按钮(向后兼容)
src/views/digitization/simulation/WarehouseScene.vue    # 新建:原生 Three.js 封装
src/views/digitization/simulation/Simulation3DPage.vue  # 新建:编排+HUD+drawer+全屏
src/router/index.ts                                     # 修改:加顶层路由块
src/utils/urlMap.ts                                     # 修改:加映射(+测试)
```

约定:vue3 组件不做渲染单测,TDD 只覆盖 `utils/heatColor` + `utils/simulationModel`。门禁 `pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`(在 `mes/vue3`)。`git` 用 `git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue`(repo root),路径相对 repo root。分支 `feature/simulation-3d`。`http.get<T>` 返回已解包业务数据;`http.post<T>(url,data)` 默认 form 编码。

---

## Task 1: 数据层(类型 + API)

**Files:**
- Create: `src/types/warehouse.ts`, `src/types/inventory.ts`
- Create: `src/api/basedata/warehouse.ts`, `src/api/inventory/stock.ts`

- [ ] **Step 1: `src/types/warehouse.ts`**

```ts
/** 库位(对应后端 sp_warehouse_location) */
export interface SpWarehouseLocation {
  id: string
  warehouseId: string
  code: string
  groupNo: number
  rowNo: number
  layerNo: number
  colNo: number
  deleted?: string
}

/** 仓库(对应后端 sp_warehouse) */
export interface SpWarehouse {
  id: string
  code: string
  name: string
  type?: string
  groups: number
  rows: number
  layers: number
  columns: number
  descr?: string
  deleted?: string
  createTime?: string
  updateTime?: string
}
```

- [ ] **Step 2: `src/types/inventory.ts`**

```ts
/** 库存台账(对应后端 sp_inventory,仅取 3D 场景所需字段) */
export interface SpInventory {
  id: string
  materialCode: string
  materialDesc?: string
  unit?: string
  warehouseId?: string
  warehouseName?: string
  locationId?: string
  locationCode?: string
  quantity: number
  status?: string
  lastInboundTime?: string
}
```

- [ ] **Step 3: `src/api/basedata/warehouse.ts`**

```ts
import { http } from '@/api/request'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

/** 全部仓库(GET) */
export const warehouseList = () => http.get<SpWarehouse[]>('/basedata/warehouse/list')

/** 某仓库的库位(GET) */
export const warehouseLocations = (warehouseId: string) =>
  http.get<SpWarehouseLocation[]>(`/basedata/warehouse/locations/${encodeURIComponent(warehouseId)}`)
```

- [ ] **Step 4: `src/api/inventory/stock.ts`**

```ts
import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type { SpInventory } from '@/types/inventory'

/** 库存分页(form);size 拉大兜底取全量,3D 场景用 */
export const pageInventory = (params: { current: number; size: number }) =>
  http.post<IPage<SpInventory>>('/inventory/page', params)
```

> 注:`IPage<T>` 从 `@/types/system` 导入(项目既有约定,1d 已确认 `@/types/api` 只导 `PageResult`)。先 `grep -n "IPage" src/types/system.ts` 确认存在;若不存在,改从实际导出处导入(`grep -rn "export.*IPage" src/types`)。

- [ ] **Step 5: 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/types/warehouse.ts mes/vue3/src/types/inventory.ts mes/vue3/src/api/basedata/warehouse.ts mes/vue3/src/api/inventory/stock.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 1f 仓库/库存只读数据层(类型+API)"
```

---

## Task 2: heatColor.ts(移植,TDD)

**Files:**
- Create: `src/utils/heatColor.ts`
- Test: `tests/heatColor.spec.ts`

- [ ] **Step 1: 写失败测试 `tests/heatColor.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { heatColor } from '@/utils/heatColor'

const EMPTY = '#6b7280'

describe('heatColor', () => {
  it('空库位/非正数量 → 灰', () => {
    expect(heatColor(0, 100)).toBe(EMPTY)
    expect(heatColor(-5, 100)).toBe(EMPTY)
  })
  it('globalMax<=0 → 灰', () => {
    expect(heatColor(10, 0)).toBe(EMPTY)
  })
  it('满载(qty=max) → 红', () => {
    expect(heatColor(100, 100)).toBe('rgb(220, 38, 38)')
  })
  it('超过 max → 钳到红', () => {
    expect(heatColor(200, 100)).toBe('rgb(220, 38, 38)')
  })
  it('半载(0.5) → 黄', () => {
    expect(heatColor(50, 100)).toBe('rgb(234, 179, 8)')
  })
  it('1/4 载(0.25) → 青', () => {
    expect(heatColor(25, 100)).toBe('rgb(6, 182, 212)')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test`
Expected: FAIL(`@/utils/heatColor` 不存在)

- [ ] **Step 3: 实现 `src/utils/heatColor.ts`**

```ts
/** 空库位/无数据色 */
const EMPTY_COLOR = '#6b7280'

/** 在库量热力梯度停靠点:占比 → [r,g,b](深蓝→青→黄→橙→红) */
const STOPS: [number, [number, number, number]][] = [
  [0, [30, 64, 175]],
  [0.25, [6, 182, 212]],
  [0.5, [234, 179, 8]],
  [0.75, [249, 115, 22]],
  [1, [220, 38, 38]],
]

/** 按在库量相对全局最大值返回热力色;qty<=0 或 globalMax<=0 → 灰 */
export function heatColor(qty: number, globalMax: number): string {
  if (!(qty > 0) || !(globalMax > 0)) return EMPTY_COLOR
  const r = Math.max(0, Math.min(1, qty / globalMax))
  let i = 0
  while (i < STOPS.length - 1 && r > STOPS[i + 1][0]) i++
  const [t0, c0] = STOPS[i]
  const [t1, c1] = STOPS[Math.min(i + 1, STOPS.length - 1)]
  const f = t1 === t0 ? 0 : (r - t0) / (t1 - t0)
  const ch = (k: number) => Math.round(c0[k] + (c1[k] - c0[k]) * f)
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test`
Expected: PASS(6 新例;既有测试不破)

- [ ] **Step 5: 提交**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/utils/heatColor.ts mes/vue3/tests/heatColor.spec.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 1f 热力色纯函数(移植,TDD)"
```

---

## Task 3: simulationModel.ts(移植,TDD)

**Files:**
- Create: `src/utils/simulationModel.ts`
- Test: `tests/simulationModel.spec.ts`

- [ ] **Step 1: 写失败测试 `tests/simulationModel.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  aggregateOccupancy,
  buildZonePositions,
  computeStats,
  buildSceneModel,
  type RawScene,
} from '@/utils/simulationModel'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import type { SpInventory } from '@/types/inventory'

function wh(id: string, columns: number, name = id): SpWarehouse {
  return { id, code: id, name, groups: 1, rows: 1, layers: 1, columns }
}
function loc(id: string, warehouseId: string): SpWarehouseLocation {
  return { id, warehouseId, code: id, groupNo: 1, rowNo: 1, layerNo: 1, colNo: 1 }
}
function inv(locationId: string, quantity: number): SpInventory {
  return { id: 'i-' + locationId, materialCode: 'M1', quantity, locationId }
}

describe('aggregateOccupancy', () => {
  it('按 locationId 求和并取全局最大值', () => {
    const r = aggregateOccupancy([inv('A', 10), inv('A', 5), inv('B', 30)])
    expect(r.occupancyByLoc.get('A')).toBe(15)
    expect(r.occupancyByLoc.get('B')).toBe(30)
    expect(r.globalMax).toBe(30)
  })
  it('空输入 → 空 map, globalMax 0', () => {
    const r = aggregateOccupancy([])
    expect(r.occupancyByLoc.size).toBe(0)
    expect(r.globalMax).toBe(0)
  })
  it('忽略无 locationId 的行', () => {
    const r = aggregateOccupancy([{ id: 'x', materialCode: 'M', quantity: 9 } as SpInventory])
    expect(r.occupancyByLoc.size).toBe(0)
  })
})

describe('buildZonePositions', () => {
  it('沿 X 轴按列数铺开 + ZONE_GAP', () => {
    const pos = buildZonePositions([wh('w1', 2), wh('w2', 3)])
    expect(pos[0].x).toBe(0)
    expect(pos[1].x).toBe(250)
  })
  it('columns 缺省按 1', () => {
    const pos = buildZonePositions([{ ...wh('w', 0), columns: 0 }])
    expect(pos[0].x).toBe(0)
  })
})

describe('computeStats', () => {
  it('占用率 = 有量库位 / 总库位', () => {
    const locs = new Map<string, SpWarehouseLocation[]>([['w1', [loc('A', 'w1'), loc('B', 'w1')]]])
    const occ = new Map<string, number>([['A', 5]])
    const s = computeStats([wh('w1', 2)], locs, occ)
    expect(s.locationCount).toBe(2)
    expect(s.occupiedCount).toBe(1)
    expect(s.occupancyRate).toBeCloseTo(0.5)
    expect(s.perWarehouse[0]).toMatchObject({ id: 'w1', locationCount: 2, occupiedCount: 1 })
  })
  it('总库位 0 → 占用率 0(不除零)', () => {
    const s = computeStats([wh('w1', 1)], new Map(), new Map())
    expect(s.occupancyRate).toBe(0)
  })
})

describe('buildSceneModel', () => {
  it('整合并建立 locationId/warehouse 索引', () => {
    const raw: RawScene = {
      warehouses: [wh('w1', 2)],
      locationsByWh: [{ whId: 'w1', locations: [loc('A', 'w1'), loc('B', 'w1')] }],
      inventory: [inv('A', 20)],
    }
    const m = buildSceneModel(raw)
    expect(m.globalMax).toBe(20)
    expect(m.occupancyByLoc.get('A')).toBe(20)
    expect(m.locationById.get('A')?.code).toBe('A')
    expect(m.warehouseById.get('w1')?.name).toBe('w1')
    expect(m.inventoryByLoc.get('A')?.materialCode).toBe('M1')
    expect(m.stats.occupancyRate).toBeCloseTo(0.5)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test`
Expected: FAIL(模块不存在)

- [ ] **Step 3: 实现 `src/utils/simulationModel.ts`**

```ts
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import type { SpInventory } from '@/types/inventory'

/** 取数层产出的原始三件套 */
export interface RawScene {
  warehouses: SpWarehouse[]
  locationsByWh: { whId: string; locations: SpWarehouseLocation[] }[]
  inventory: SpInventory[]
}

export interface WarehouseStat {
  id: string
  name: string
  locationCount: number
  occupiedCount: number
}

export interface SceneStats {
  warehouseCount: number
  locationCount: number
  occupiedCount: number
  occupancyRate: number
  perWarehouse: WarehouseStat[]
}

export interface SceneModel {
  warehouses: SpWarehouse[]
  locationsByWh: Map<string, SpWarehouseLocation[]>
  occupancyByLoc: Map<string, number>
  inventoryByLoc: Map<string, SpInventory>
  locationById: Map<string, SpWarehouseLocation>
  warehouseById: Map<string, SpWarehouse>
  globalMax: number
  zonePositions: { wh: SpWarehouse; x: number }[]
  stats: SceneStats
}

const BOARD_LENGTH = 55
const SHELF_GAP_X = 20
const ZONE_GAP = 100

/** 多仓库沿 X 轴铺开 */
export function buildZonePositions(warehouses: SpWarehouse[]): { wh: SpWarehouse; x: number }[] {
  const pos: { wh: SpWarehouse; x: number }[] = []
  let currentX = 0
  for (const wh of warehouses) {
    const columns = wh.columns || 1
    const zoneW = columns * (BOARD_LENGTH + SHELF_GAP_X)
    pos.push({ wh, x: currentX })
    currentX += zoneW + ZONE_GAP
  }
  return pos
}

/** 按 locationId 汇总在库量 + 留存台账 + 全局最大值 */
export function aggregateOccupancy(inventory: SpInventory[]): {
  occupancyByLoc: Map<string, number>
  inventoryByLoc: Map<string, SpInventory>
  globalMax: number
} {
  const occupancyByLoc = new Map<string, number>()
  const inventoryByLoc = new Map<string, SpInventory>()
  for (const it of inventory) {
    if (!it.locationId) continue
    const qty = Number(it.quantity) || 0
    occupancyByLoc.set(it.locationId, (occupancyByLoc.get(it.locationId) ?? 0) + qty)
    inventoryByLoc.set(it.locationId, it)
  }
  let globalMax = 0
  for (const v of occupancyByLoc.values()) if (v > globalMax) globalMax = v
  return { occupancyByLoc, inventoryByLoc, globalMax }
}

/** 统计:库位数 / 有量库位 / 占用率 / 每仓库 */
export function computeStats(
  warehouses: SpWarehouse[],
  locationsByWh: Map<string, SpWarehouseLocation[]>,
  occupancyByLoc: Map<string, number>,
): SceneStats {
  let locationCount = 0
  let occupiedCount = 0
  const perWarehouse: WarehouseStat[] = []
  for (const wh of warehouses) {
    const locs = locationsByWh.get(wh.id) ?? []
    let whOccupied = 0
    for (const loc of locs) if ((occupancyByLoc.get(loc.id) ?? 0) > 0) whOccupied++
    locationCount += locs.length
    occupiedCount += whOccupied
    perWarehouse.push({ id: wh.id, name: wh.name, locationCount: locs.length, occupiedCount: whOccupied })
  }
  const occupancyRate = locationCount > 0 ? occupiedCount / locationCount : 0
  return { warehouseCount: warehouses.length, locationCount, occupiedCount, occupancyRate, perWarehouse }
}

/** 原始三件套 → 视图模型 */
export function buildSceneModel(raw: RawScene): SceneModel {
  const locationsByWh = new Map<string, SpWarehouseLocation[]>()
  const locationById = new Map<string, SpWarehouseLocation>()
  for (const entry of raw.locationsByWh) {
    locationsByWh.set(entry.whId, entry.locations)
    for (const loc of entry.locations) locationById.set(loc.id, loc)
  }
  const warehouseById = new Map<string, SpWarehouse>()
  for (const wh of raw.warehouses) warehouseById.set(wh.id, wh)

  const { occupancyByLoc, inventoryByLoc, globalMax } = aggregateOccupancy(raw.inventory)
  const zonePositions = buildZonePositions(raw.warehouses)
  const stats = computeStats(raw.warehouses, locationsByWh, occupancyByLoc)

  return {
    warehouses: raw.warehouses,
    locationsByWh,
    occupancyByLoc,
    inventoryByLoc,
    locationById,
    warehouseById,
    globalMax,
    zonePositions,
    stats,
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test`
Expected: PASS(全部新例绿)

- [ ] **Step 5: 提交**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/utils/simulationModel.ts mes/vue3/tests/simulationModel.spec.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 1f 场景模型纯逻辑(移植,TDD)"
```

---

## Task 4: ScreenHeader 全屏增强(最小、向后兼容)

**Files:**
- Modify: `src/layouts/components/ScreenHeader.vue`

目标:加可选 `showFullscreen?: boolean` prop + `fullscreen` emit,模板条件渲染「全屏」按钮。1e 的 PlanDashboard 不传 `showFullscreen` → 行为不变。

- [ ] **Step 1: 读现有文件**

Run: 先 READ `src/layouts/components/ScreenHeader.vue`(确认现有 props/emits/模板结构)。现有 props 为 `{ title: string; lastUpdated?: number|null; loading?: boolean }`,emits 为 `{ refresh: []; back: [] }`,「刷新」「返回后台」按钮在 `.screen-header__right` 内。

- [ ] **Step 2: 改 props/emits**

把 `defineProps` 改为:
```ts
const props = defineProps<{ title: string; lastUpdated?: number | null; loading?: boolean; showFullscreen?: boolean }>()
const emit = defineEmits<{ refresh: []; back: []; fullscreen: [] }>()
```
(保留现有 `props` 的其它使用;若原代码未用变量名 `props`/`emit`,保持原命名,仅扩展类型与 emit 列表。)

- [ ] **Step 3: 模板加按钮**

在 `<el-button :loading="loading" size="small" @click="emit('refresh')">刷新</el-button>` 之后、`返回后台` 之前插入:
```html
      <el-button v-if="showFullscreen" size="small" @click="emit('fullscreen')">全屏</el-button>
```
(若原模板用 `@click="$emit('refresh')"` 风格则统一用 `$emit('fullscreen')`;与现有行保持一致。)

- [ ] **Step 4: 验证**

Run: `pnpm typecheck && pnpm test`
Expected: PASS(1e 大屏不传 showFullscreen,行为不变;140 测试仍绿)

- [ ] **Step 5: 提交**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/layouts/components/ScreenHeader.vue
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): ScreenHeader 加可选全屏按钮(1f 用,向后兼容)"
```

---

## Task 5: 安装 three + WarehouseScene.vue(原生 Three.js)

**Files:**
- Modify: `package.json`(加依赖)
- Create: `src/views/digitization/simulation/WarehouseScene.vue`

- [ ] **Step 1: 安装依赖**

Run(在 `mes/vue3`):
```bash
pnpm add three && pnpm add -D @types/three
```
Expected: 安装成功。若 bleeding-edge 解析有 peer 警告,无害继续。记录装到的版本。

- [ ] **Step 2: 写 `src/views/digitization/simulation/WarehouseScene.vue`**

```vue
<template>
  <div ref="containerRef" class="warehouse-scene" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { heatColor } from '@/utils/heatColor'
import type { SceneModel } from '@/utils/simulationModel'
import type { SpWarehouseLocation } from '@/types/warehouse'

const props = defineProps<{ model: SceneModel }>()
const emit = defineEmits<{ hover: [SpWarehouseLocation | null]; select: [SpWarehouseLocation] }>()

const containerRef = ref<HTMLDivElement | null>(null)

// 渲染常量(自有渲染尺度,不依赖 model.zonePositions 的 mes1 尺度)
const BOX = 6
const CELL = 10 // BOX + 间隙
const LAYER_H = 8
const ZONE_GAP = 24
const EMPTY = '#3a4256'

let renderer: THREE.WebGLRenderer | undefined
let scene: THREE.Scene | undefined
let camera: THREE.PerspectiveCamera | undefined
let controls: OrbitControls | undefined
let raf = 0
let ro: ResizeObserver | undefined
let boxGeo: THREE.BoxGeometry | undefined
const boxMeshes: THREE.Mesh[] = []
const materials: THREE.Material[] = []
let hoveredMesh: THREE.Mesh | null = null
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** 库位坐标:优先用真实 colNo/layerNo/rowNo(1 基),缺失退化为顺序索引网格 */
function locCell(loc: SpWarehouseLocation, index: number, cols: number) {
  const col = loc.colNo && loc.colNo > 0 ? loc.colNo - 1 : index % cols
  const layer = loc.layerNo && loc.layerNo > 0 ? loc.layerNo - 1 : 0
  const row = loc.rowNo && loc.rowNo > 0 ? loc.rowNo - 1 : Math.floor(index / cols)
  return { col, layer, row }
}

function buildBoxes() {
  if (!scene) return
  boxGeo = new THREE.BoxGeometry(BOX, BOX, BOX)
  const m = props.model
  let zoneX = 0
  let maxX = 0
  let maxZ = 0
  let maxY = BOX
  for (const wh of m.warehouses) {
    const locs = m.locationsByWh.get(wh.id) ?? []
    const cols = Math.max(1, wh.columns || Math.ceil(Math.sqrt(locs.length || 1)))
    locs.forEach((loc, i) => {
      const { col, layer, row } = locCell(loc, i, cols)
      const occ = m.occupancyByLoc.get(loc.id) ?? 0
      const color = occ > 0 ? heatColor(occ, m.globalMax) : EMPTY
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.55, metalness: 0.1 })
      materials.push(mat)
      const mesh = new THREE.Mesh(boxGeo, mat)
      const x = zoneX + col * CELL
      const y = BOX / 2 + layer * LAYER_H
      const z = row * CELL
      mesh.position.set(x, y, z)
      mesh.userData.locationId = loc.id
      scene!.add(mesh)
      boxMeshes.push(mesh)
      if (x > maxX) maxX = x
      if (z > maxZ) maxZ = z
      if (y > maxY) maxY = y
    })
    const zoneWidth = cols * CELL
    zoneX += zoneWidth + ZONE_GAP
  }
  // 目标对准包围盒中心
  const cx = maxX / 2
  const cz = maxZ / 2
  if (controls) controls.target.set(cx, maxY / 2, cz)
  if (camera) {
    const span = Math.max(maxX, maxZ, 40)
    camera.position.set(cx + span * 0.8, maxY + span * 0.7, cz + span * 1.1)
    camera.lookAt(cx, maxY / 2, cz)
  }
}

function clearBoxes() {
  if (scene) for (const mesh of boxMeshes) scene.remove(mesh)
  for (const mat of materials) mat.dispose()
  materials.length = 0
  boxMeshes.length = 0
  boxGeo?.dispose()
  boxGeo = undefined
  hoveredMesh = null
}

function findLocation(id: string): SpWarehouseLocation | null {
  return props.model.locationById.get(id) ?? null
}

function onPointerMove(ev: PointerEvent) {
  const el = containerRef.value
  if (!el || !camera) return
  const rect = el.getBoundingClientRect()
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObjects(boxMeshes, false)[0]
  const mesh = (hit?.object as THREE.Mesh) ?? null
  if (mesh === hoveredMesh) return
  // 复位旧高亮
  if (hoveredMesh) {
    ;(hoveredMesh.material as THREE.MeshStandardMaterial).emissive?.setHex(0x000000)
    hoveredMesh.scale.set(1, 1, 1)
  }
  hoveredMesh = mesh
  if (mesh) {
    ;(mesh.material as THREE.MeshStandardMaterial).emissive?.setHex(0x333333)
    mesh.scale.set(1.18, 1.18, 1.18)
    el.style.cursor = 'pointer'
    emit('hover', findLocation(mesh.userData.locationId))
  } else {
    el.style.cursor = 'auto'
    emit('hover', null)
  }
}

function onClick() {
  if (hoveredMesh) {
    const loc = findLocation(hoveredMesh.userData.locationId)
    if (loc) emit('select', loc)
  }
}

function onResize() {
  const el = containerRef.value
  if (!el || !renderer || !camera) return
  const w = el.clientWidth || 1
  const h = el.clientHeight || 1
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

function animate() {
  raf = requestAnimationFrame(animate)
  if (controls) {
    controls.update()
  }
  if (renderer && scene && camera) renderer.render(scene, camera)
}

function init() {
  const el = containerRef.value
  if (!el) return
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#0a1020')
  scene.fog = new THREE.Fog('#0a1020', 200, 600)

  camera = new THREE.PerspectiveCamera(50, (el.clientWidth || 1) / (el.clientHeight || 1), 0.1, 2000)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(el.clientWidth || 1, el.clientHeight || 1)
  el.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const dir = new THREE.DirectionalLight(0xffffff, 0.9)
  dir.position.set(60, 120, 80)
  scene.add(dir)

  const grid = new THREE.GridHelper(800, 80, 0x2a3550, 0x18203a)
  scene.add(grid)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.autoRotate = !reduceMotion
  controls.autoRotateSpeed = 0.6

  buildBoxes()

  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('click', onClick)
  ro = new ResizeObserver(onResize)
  ro.observe(el)
  animate()
}

onMounted(init)

// 数据刷新:重建盒子(轮询/手动刷新时)
watch(
  () => props.model,
  () => {
    if (!scene) return
    clearBoxes()
    buildBoxes()
  },
)

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  const el = containerRef.value
  if (el) {
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('click', onClick)
  }
  ro?.disconnect()
  ro = undefined
  controls?.dispose()
  controls = undefined
  clearBoxes()
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
    renderer = undefined
  }
  scene = undefined
  camera = undefined
})
</script>

<style scoped>
.warehouse-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.warehouse-scene :deep(canvas) {
  display: block;
}
</style>
```

- [ ] **Step 3: 类型检查 + 构建**

Run: `pnpm typecheck && pnpm build`
Expected: PASS。
- 若 `three/examples/jsm/controls/OrbitControls.js` 路径解析报错,改用 `three/addons/controls/OrbitControls.js`(现代 three 的 exports 别名),二者择一可用。
- 若 `@types/three` 对 `MeshStandardMaterial.emissive` 链式可选报错,把 `(mesh.material as THREE.MeshStandardMaterial).emissive?.setHex(...)` 改为先取 `const mat = mesh.material as THREE.MeshStandardMaterial; mat.emissive.setHex(...)`(emissive 必有)。
- 若 lint 报未使用变量,清理之。

- [ ] **Step 4: 提交**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/package.json mes/vue3/pnpm-lock.yaml mes/vue3/src/views/digitization/simulation/WarehouseScene.vue
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 1f 原生 Three.js 仓库场景组件(热力盒/轨道/拾取/dispose)"
```

---

## Task 6: Simulation3DPage.vue(编排 + HUD + drawer + 全屏)

**Files:**
- Create: `src/views/digitization/simulation/Simulation3DPage.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <div ref="rootRef" class="sim">
    <ScreenHeader
      title="数字孪生仓库"
      :loading="loading"
      show-fullscreen
      @refresh="load"
      @back="goBack"
      @fullscreen="toggleFullscreen"
    />

    <div v-if="error && !model" class="sim__error">
      <p>数据加载失败</p>
      <el-button type="primary" @click="load">重试</el-button>
    </div>

    <div v-else-if="model && model.warehouses.length === 0" class="sim__empty">暂无仓库数据</div>

    <div v-else class="sim__stage">
      <WarehouseScene v-if="model" :model="model" @hover="onHover" @select="onSelect" />

      <!-- HUD 统计 -->
      <div v-if="model" class="sim__hud">
        <div class="sim__stat"><b>{{ model.stats.warehouseCount }}</b><span>仓库</span></div>
        <div class="sim__stat"><b>{{ model.stats.locationCount }}</b><span>库位</span></div>
        <div class="sim__stat"><b>{{ model.stats.occupiedCount }}</b><span>占用</span></div>
        <div class="sim__stat"><b>{{ ratePct }}%</b><span>占用率</span></div>
      </div>

      <!-- hover 提示 -->
      <div v-if="hovered" class="sim__hover">{{ hovered.code }}</div>

      <!-- 热力图例 -->
      <div class="sim__legend">
        <span>低</span>
        <i class="sim__legend-bar" />
        <span>高</span>
      </div>
    </div>

    <el-drawer v-model="drawerOpen" :title="selected?.code || '库位详情'" size="360px" direction="rtl">
      <div v-if="selectedDetail" class="sim__detail">
        <p><label>库位编码</label><span>{{ selectedDetail.code }}</span></p>
        <p><label>所属仓库</label><span>{{ selectedDetail.warehouseName }}</span></p>
        <p><label>在库物料</label><span>{{ selectedDetail.materialCode || '—' }}</span></p>
        <p><label>物料描述</label><span>{{ selectedDetail.materialDesc || '—' }}</span></p>
        <p><label>在库数量</label><span>{{ selectedDetail.quantity }} {{ selectedDetail.unit || '' }}</span></p>
        <p><label>最近入库</label><span>{{ selectedDetail.lastInboundTime || '—' }}</span></p>
      </div>
      <div v-else class="sim__detail-empty">该库位暂无库存</div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { warehouseList, warehouseLocations } from '@/api/basedata/warehouse'
import { pageInventory } from '@/api/inventory/stock'
import { buildSceneModel, type RawScene, type SceneModel } from '@/utils/simulationModel'
import type { SpWarehouseLocation } from '@/types/warehouse'
import ScreenHeader from '@/layouts/components/ScreenHeader.vue'
import WarehouseScene from './WarehouseScene.vue'

const router = useRouter()
const rootRef = ref<HTMLDivElement | null>(null)
const model = ref<SceneModel | null>(null)
const loading = ref(false)
const error = ref(false)
const hovered = ref<SpWarehouseLocation | null>(null)
const selected = ref<SpWarehouseLocation | null>(null)
const drawerOpen = ref(false)

const ratePct = computed(() =>
  model.value ? Math.round(model.value.stats.occupancyRate * 100) : 0,
)

const selectedDetail = computed(() => {
  if (!selected.value || !model.value) return null
  const inv = model.value.inventoryByLoc.get(selected.value.id)
  const wh = model.value.warehouseById.get(selected.value.warehouseId)
  if (!inv) return null
  return {
    code: selected.value.code,
    warehouseName: wh?.name ?? inv.warehouseName ?? '—',
    materialCode: inv.materialCode,
    materialDesc: inv.materialDesc,
    quantity: inv.quantity,
    unit: inv.unit,
    lastInboundTime: inv.lastInboundTime,
  }
})

const OCCUPANCY_FETCH_SIZE = 100000

async function load() {
  loading.value = true
  try {
    const warehouses = (await warehouseList()) ?? []
    const [locsArr, invPage] = await Promise.all([
      Promise.all(
        warehouses.map((w) =>
          warehouseLocations(w.id).then((locations) => ({ whId: w.id, locations: locations ?? [] })),
        ),
      ),
      pageInventory({ current: 1, size: OCCUPANCY_FETCH_SIZE }).then((p) => p?.records ?? []),
    ])
    const raw: RawScene = { warehouses, locationsByWh: locsArr, inventory: invPage }
    model.value = buildSceneModel(raw)
    error.value = false
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function onHover(loc: SpWarehouseLocation | null) {
  hovered.value = loc
}
function onSelect(loc: SpWarehouseLocation) {
  selected.value = loc
  drawerOpen.value = true
}
function goBack() {
  router.push('/welcome')
}
function toggleFullscreen() {
  const el = rootRef.value
  if (!el) return
  if (document.fullscreenElement) document.exitFullscreen()
  else el.requestFullscreen?.()
}

load()
onUnmounted(() => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
})
</script>

<style scoped>
.sim {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a1020;
  color: #eaf2ff;
}
.sim__stage {
  position: relative;
  flex: 1;
  min-height: 0;
}
.sim__hud {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 12px;
  z-index: 2;
}
.sim__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 16px;
  border: 1px solid rgba(120, 160, 220, 0.2);
  border-radius: 8px;
  background: rgba(13, 21, 48, 0.7);
  backdrop-filter: blur(3px);
}
.sim__stat b {
  font-size: 22px;
  color: #36e0ff;
  font-variant-numeric: tabular-nums;
}
.sim__stat span {
  font-size: 12px;
  color: #8aa0c4;
}
.sim__hover {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 6px;
  background: rgba(13, 21, 48, 0.85);
  border: 1px solid rgba(120, 160, 220, 0.25);
  z-index: 2;
  font-size: 13px;
}
.sim__legend {
  position: absolute;
  bottom: 18px;
  right: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
  font-size: 12px;
  color: #8aa0c4;
}
.sim__legend-bar {
  width: 160px;
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(90deg, rgb(30, 64, 175), rgb(6, 182, 212), rgb(234, 179, 8), rgb(249, 115, 22), rgb(220, 38, 38));
}
.sim__error,
.sim__empty {
  flex: 1;
  display: grid;
  place-content: center;
  gap: 16px;
  color: #8aa0c4;
}
.sim__detail p {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}
.sim__detail label {
  color: #909399;
}
.sim__detail-empty {
  color: #909399;
  text-align: center;
  padding: 24px 0;
}
</style>
```

- [ ] **Step 2: 类型检查 + 构建 + lint**

Run: `pnpm typecheck && pnpm build && pnpm lint:check`
Expected: PASS(lint 0 error;修本文件任何 error)。

- [ ] **Step 3: 提交**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/views/digitization/simulation/Simulation3DPage.vue
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 1f 3D 仓库编排页(取数+HUD+图例+库位详情+全屏)"
```

---

## Task 7: 路由 + urlMap 接线

**Files:**
- Modify: `src/router/index.ts`, `src/utils/urlMap.ts`, `tests/urlMap.spec.ts`

- [ ] **Step 1: router 加顶层路由块**

在 `src/router/index.ts` 的 `routes` 数组里,**1e 的 `/digitization/dashboard` 路由块之后**(或任意顶层块之间,`/403` 之前)插入:

```ts
  {
    path: '/digitization/simulation',
    component: () => import('@/layouts/ScreenLayout.vue'),
    children: [
      {
        path: '',
        name: 'digitization-simulation',
        component: () => import('@/views/digitization/simulation/Simulation3DPage.vue'),
        meta: { title: '数字仿真3D仓库', perm: 'warehouse:add' },
      },
    ],
  },
```

- [ ] **Step 2: urlMap 加映射**

在 `src/utils/urlMap.ts` 的 `URL_MAP` 里,`'/digitization/plan/plan-ui': '/digitization/dashboard',` 之后加:
```ts
  '/digital/simulation/list-ui': '/digitization/simulation',
```

- [ ] **Step 3: urlMap 测试**

在 `tests/urlMap.spec.ts` 现有 describe 内加:
```ts
  it('3D 数字孪生映射到干净路由', () => {
    expect(toSpaRoute('/digital/simulation/list-ui')).toBe('/digitization/simulation')
  })
```

- [ ] **Step 4: 全验证**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: 全 PASS(新 urlMap 测试绿)

- [ ] **Step 5: 提交**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/router/index.ts mes/vue3/src/utils/urlMap.ts mes/vue3/tests/urlMap.spec.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 1f 3D 仓库路由接入 ScreenLayout + urlMap 映射"
```

---

## Task 8: 后端端点审查(按 [[backend-deepseek-review-each-cycle]])

**Files:**
- Read only:`SpWarehouseController`(`mes/src/main/java/com/wangziyang/mes/basedata/controller/admin/SpWarehouseController.java`)+ 其 service/impl + mapper(.xml)
- Read only:`SpReceiptController`(含 `/inventory/page`)+ inventory service/impl + mapper(.xml)

- [ ] **Step 1: 读审三端点**

- `/basedata/warehouse/list`:是否过滤软删(deleted/is_deleted)、返回全量是否合理。
- `/basedata/warehouse/locations/{warehouseId}`:是否按 warehouseId 正确过滤、是否过滤软删。
- `/inventory/page`:分页是否生效(PaginationInterceptor)、是否含 location_id、是否过滤软删/状态。记录每端点 OK / LATENT / REAL BUG(file:line + 理由)。

- [ ] **Step 2: 起后端 + curl 实测**

按 [[backend-build-mvnw-broken]]:JDK11 + 系统 `mvn`(`./mvnw` 坏)。若后端已在 :9090,用 `bash scripts/verify/login.sh` 拿 cookie:
```bash
curl -s -b "JSESSIONID=<token>" http://localhost:9090/basedata/warehouse/list | head -c 800
curl -s -b "JSESSIONID=<token>" "http://localhost:9090/basedata/warehouse/locations/<某仓库id>" | head -c 800
curl -s -b "JSESSIONID=<token>" -X POST http://localhost:9090/inventory/page -d "current=1&size=5" | head -c 1200
```
若后端未运行,不要长时间启动;改直连 MySQL `mes_data`(localhost:3306 root/12345678)抽查 `sp_warehouse`/`sp_warehouse_location`/`sp_inventory` 行数与 location_id 关联,记录"curl 跳过,改 SQL 佐证"。

- [ ] **Step 3: 按需修复**

若发现 REAL BUG,走「最小修正」改后端 + 补 Mockito 守卫单测(JUnit4),JDK11 `mvn test -Dtest=...` 验证。无 bug 则记"读审 + 实测无暴露 bug"。

- [ ] **Step 4: 写验证记录并提交**

写 `mes/vue3/docs/specs/2026-06-21-cycle1f-verify-results.md`(逐端点结论 + 实测证据 + 任何修复),提交:
```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/docs/specs/2026-06-21-cycle1f-verify-results.md
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✅ test(vue3): 1f 仓库/库存端点审查记录"
```
(若有后端改动,一并 add 后端文件。)

---

## Task 9: 全门禁 + 收尾

- [ ] **Step 1: 跑全门禁**

Run(在 `mes/vue3`):`pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: 全 PASS(typecheck 0 / 新增纯函数测试全绿 / lint 0 error / build 成功,3D 页独立 chunk)。

- [ ] **Step 2: 修门禁失败**

逐项修复重跑至全绿。

- [ ] **Step 3: 浏览器冒烟(交用户)**

提示用户在 :4200 登录(admin/123,需后端 :9090 + DB 有仓库/库位/库存)→ 侧栏「黑科数字孪生 → 数字仿真3D仓库」→ 核对:3D 货架渲染、热力着色、轨道拖拽/缩放、hover 高亮、点击库位弹详情、HUD 统计、全屏切换、返回后台。

- [ ] **Step 4: 最终提交(若有遗留)**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue status
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add -A && git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "🔧 chore(vue3): 1f 3D 仓库门禁修复与收尾"
```

---

## 自查(spec 覆盖)

- spec §2 决策1 原生 Three.js → Task5 WarehouseScene ✅
- §2 决策2 完整数字孪生(热力/轨道/hover/点击详情/HUD/图例/全屏/状态)→ Task5(场景交互)+ Task6(HUD/drawer/全屏/状态)✅
- §2 决策3 纯色材质/无贴图/无 3D 文字 → Task5(MeshStandardMaterial 纯色,GridHelper,无 TextureLoader/字体)✅
- §2 决策4 ScreenHeader 全屏 → Task4 ✅
- §2 决策5 独立 mesh → Task5 boxMeshes ✅
- §3 后端契约/类型 → Task1 ✅
- §4 路由/菜单/urlMap → Task7(零菜单种子)✅
- §6 纯逻辑移植 TDD → Task2 heatColor + Task3 simulationModel ✅
- §7 取数编排 → Task6 load() ✅
- §9 后端审查 → Task8 ✅
- §13 测试门禁 → Task2/3 TDD + Task7 urlMap 测 + Task9 全门禁 ✅

## 已知约定回顾

- vue3 组件不做渲染单测;TDD 仅 utils。
- `git` 用 `git -C <repo-root>`(shell cwd 可能在 `mes/vue3`)。
- 菜单 17/171 原始 schema 预置,零菜单种子;若冒烟侧栏无「数字仿真3D仓库」,再核验 171 在 mes_data。
- WarehouseScene 必须在 onBeforeUnmount 彻底 dispose(renderer/geometry/material/controls/RAF/observer/事件),防泄漏。
</content>
