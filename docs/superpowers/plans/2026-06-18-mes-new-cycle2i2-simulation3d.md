# 周期 2i-2 数字仿真 3D 仓库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/mes-new` 新建 `/digitization/simulation`，移植 mes1 的 R3F 仓库场景并升级为按真实在库量热力着色的数字孪生（嵌入 AdminLayout + 一键全屏 + 点库位看详情），纯前端零后端改动。

**Architecture:** 数据/着色/统计为纯函数（`simulationModel.ts`/`heatColor.ts`，TDD 覆盖）；`useSimulationScene`（`useQuery$` + RxJS `forkJoin` 一次取数）喂给 R3F `<Canvas>`；6 个场景组件移植自 mes1（`SceneSetup`/`WarehouseBuilding`/`Billboard` 逐字搬，`Shelf`/`WarehouseZone` 加热力与拾取）；DOM 覆盖层做 HUD/图例/数据面板/全屏/详情 Sheet。

**Tech Stack:** React 19 + TS + Vite + `@react-three/fiber@^9` + `@react-three/drei@^10` + `three@^0.184` + `@ngify/http` + 自研 `useQuery$` + rxjs + shadcn（`@workspace/ui`）+ vitest。

**参考源（移植/对照）：** mes1 组件在 `mes/frontend/apps/mes1/src/pages/digitization/`；纹理资产在 `mes/frontend/apps/mes1/public/lib/ThreeJs/images/`。设计 spec：`docs/superpowers/specs/2026-06-18-mes-new-cycle2i2-simulation3d-design.md`。

**约定：** 所有命令在 `mes/frontend/` 目录下执行（pnpm workspace 根）。

---

## Task 1: 依赖 + 纹理资产 + 路由 + 占位页

**Files:**
- Modify: `mes/frontend/apps/mes-new/package.json`（pnpm add 自动改）
- Create: `mes/frontend/apps/mes-new/public/lib/ThreeJs/images/**`（cp 资产）
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/Simulation3DPage.tsx`（占位，Task 10 覆盖）
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1: 安装 3D 依赖**

```bash
cd mes/frontend
pnpm --filter mes-new add three@^0.184 @react-three/fiber@^9.6 @react-three/drei@^10.7
pnpm --filter mes-new add -D @types/three@^0.184
```

Expected: `package.json` 出现 three/@react-three/fiber/@react-three/drei，devDeps 出现 @types/three。

- [ ] **Step 2: 复制纹理 + 天空盒资产**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
mkdir -p mes/frontend/apps/mes-new/public/lib/ThreeJs/images
cp -R mes/frontend/apps/mes1/public/lib/ThreeJs/images/. mes/frontend/apps/mes-new/public/lib/ThreeJs/images/
ls mes/frontend/apps/mes-new/public/lib/ThreeJs/images
ls mes/frontend/apps/mes-new/public/lib/ThreeJs/images/skybox
```

Expected: 第一个 ls 列出 `floor.jpg box.png rack.png plane.png line.png door_left.png door_right.png window.png biaoyu.png roll.png skybox`；第二个 ls 列出 6 张 `远山_*.jpg`。

- [ ] **Step 3: 写占位页（Task 10 会覆盖为真页）**

`mes/frontend/apps/mes-new/src/pages/digitization/simulation/Simulation3DPage.tsx`：

```tsx
export default function Simulation3DPage() {
  return <div className="p-4 text-muted-foreground">数字仿真 3D 仓库（building…）</div>
}
```

- [ ] **Step 4: 注册路由（AdminLayout 子路由 + lazy）**

在 `mes/frontend/apps/mes-new/src/router.tsx` 第 33 行 `const PlanDashboard = lazy(...)` 下方新增一行：

```tsx
// eslint-disable-next-line react-refresh/only-export-components -- 同上:lazy 路由模块
const Simulation3DPage = lazy(() => import('@/pages/digitization/simulation/Simulation3DPage'))
```

在 AdminLayout 的 `children` 数组里、`{ path: 'inventory/manual-inbound', ... }` 之后、`{ path: '403', ... }` 之前，插入：

```tsx
          {
            path: 'digitization/simulation',
            element: (
              <Suspense fallback={<div className="p-4 text-muted-foreground">加载 3D 仿真…</div>}>
                <Simulation3DPage />
              </Suspense>
            ),
          },
```

（`Suspense`、`lazy` 已在文件顶部 import，无需新增。）

- [ ] **Step 5: 类型检查 + 构建验证**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
pnpm --filter mes-new build
```

Expected: 两条均 0 error。菜单 171（url `/digital/simulation/list-ui`，已映射到 `/digitization/simulation`）现在能进入占位页。

- [ ] **Step 6: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/package.json mes/frontend/pnpm-lock.yaml mes/frontend/apps/mes-new/public/lib/ThreeJs mes/frontend/apps/mes-new/src/pages/digitization/simulation/Simulation3DPage.tsx mes/frontend/apps/mes-new/src/router.tsx
git commit -m "🏗️ feat(mes-new): 2i-2 脚手架(three/R3F 依赖+纹理资产+路由+占位页)"
```

---

## Task 2: `heatColor` 纯函数（TDD）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/heatColor.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/__tests__/heatColor.test.ts`

- [ ] **Step 1: 写失败测试**

`__tests__/heatColor.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { heatColor } from '../heatColor'

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

- [ ] **Step 2: 运行确认失败**

```bash
cd mes/frontend
pnpm --filter mes-new exec vitest run src/pages/digitization/simulation/__tests__/heatColor.test.ts
```

Expected: FAIL（`heatColor` 未定义 / 模块不存在）。

- [ ] **Step 3: 实现**

`heatColor.ts`：

```ts
/** 空库位/无数据色 */
const EMPTY_COLOR = '#6b7280'

/** 在库量热力梯度停靠点：占比 → [r,g,b]（深蓝→青→黄→橙→红） */
const STOPS: [number, [number, number, number]][] = [
  [0, [30, 64, 175]],
  [0.25, [6, 182, 212]],
  [0.5, [234, 179, 8]],
  [0.75, [249, 115, 22]],
  [1, [220, 38, 38]],
]

/** 按在库量相对全局最大值返回热力色；qty<=0 或 globalMax<=0 → 灰 */
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

- [ ] **Step 4: 运行确认通过**

```bash
cd mes/frontend
pnpm --filter mes-new exec vitest run src/pages/digitization/simulation/__tests__/heatColor.test.ts
```

Expected: PASS（6 个用例全绿）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/digitization/simulation/heatColor.ts mes/frontend/apps/mes-new/src/pages/digitization/simulation/__tests__/heatColor.test.ts
git commit -m "✅ feat(mes-new): 2i-2 热力着色纯函数 heatColor + 单测"
```

---

## Task 3: `simulationModel` 纯函数（TDD）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/simulationModel.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/__tests__/simulationModel.test.ts`

- [ ] **Step 1: 写失败测试**

`__tests__/simulationModel.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import {
  aggregateOccupancy,
  buildZonePositions,
  computeStats,
  buildSceneModel,
  type RawScene,
} from '../simulationModel'
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
    // w1 zoneW = 2*(55+20)=150, +ZONE_GAP 100 => 250
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
    const occ = new Map<string, number>([['A', 5]]) // B 空
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

- [ ] **Step 2: 运行确认失败**

```bash
cd mes/frontend
pnpm --filter mes-new exec vitest run src/pages/digitization/simulation/__tests__/simulationModel.test.ts
```

Expected: FAIL（模块/导出不存在）。

- [ ] **Step 3: 实现**

`simulationModel.ts`：

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

/** 多仓库沿 X 轴铺开（沿用 mes1 算法） */
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

/** 统计：库位数 / 有量库位 / 占用率 / 每仓库 */
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

- [ ] **Step 4: 运行确认通过**

```bash
cd mes/frontend
pnpm --filter mes-new exec vitest run src/pages/digitization/simulation/__tests__/simulationModel.test.ts
```

Expected: PASS（全部用例绿）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/digitization/simulation/simulationModel.ts mes/frontend/apps/mes-new/src/pages/digitization/simulation/__tests__/simulationModel.test.ts
git commit -m "✅ feat(mes-new): 2i-2 场景模型纯函数(聚合/统计/zone布局) + 单测"
```

---

## Task 4: API `warehouseList()` + 取数编排 `useSimulationScene`

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/api/basedata/warehouse.ts`
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/useSimulationScene.ts`

- [ ] **Step 1: warehouse.ts 增加 list 接口**

在 `mes/frontend/apps/mes-new/src/api/basedata/warehouse.ts` 末尾追加：

```ts
/** 取全部仓库(后端 GET /basedata/warehouse/list 已存在) */
export function warehouseList() {
  return http.get<SpWarehouse[]>('/basedata/warehouse/list')
}
```

- [ ] **Step 2: 写 `useSimulationScene.ts`**

```ts
import { useMemo } from 'react'
import { forkJoin, map, of, switchMap, type Observable } from 'rxjs'
import { useQuery$ } from '@/http/hooks'
import { warehouseList, warehouseLocations } from '@/api/basedata/warehouse'
import { pageInventory } from '@/api/inventory/stock'
import { buildSceneModel, type RawScene, type SceneModel } from './simulationModel'

/** 一次拉全量库存(标准 MyBatis-Plus 分页, size 拉大兜底) */
const OCCUPANCY_FETCH_SIZE = 100000

/** 先取仓库 → 并行取各仓库库位 + 全量库存，合成 RawScene */
export function fetchScene$(): Observable<RawScene> {
  return warehouseList().pipe(
    switchMap((warehouses) => {
      const list = warehouses ?? []
      if (list.length === 0) {
        return of<RawScene>({ warehouses: [], locationsByWh: [], inventory: [] })
      }
      return forkJoin({
        warehouses: of(list),
        locationsByWh: forkJoin(
          list.map((w) =>
            warehouseLocations(w.id).pipe(
              map((locations) => ({ whId: w.id, locations: locations ?? [] })),
            ),
          ),
        ),
        inventory: pageInventory({ current: 1, size: OCCUPANCY_FETCH_SIZE }).pipe(
          map((page) => page?.records ?? []),
        ),
      })
    }),
  )
}

/** 仿真场景数据 hook：取数 + buildSceneModel */
export function useSimulationScene() {
  const { data, loading, error, refetch } = useQuery$(['simulation', 'scene'], fetchScene$)
  const model = useMemo<SceneModel | null>(() => (data ? buildSceneModel(data) : null), [data])
  return { model, loading, error, refetch }
}
```

- [ ] **Step 3: 类型检查**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
```

Expected: 0 error。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/api/basedata/warehouse.ts mes/frontend/apps/mes-new/src/pages/digitization/simulation/useSimulationScene.ts
git commit -m "✨ feat(mes-new): 2i-2 取数层(warehouseList + RxJS forkJoin 编排 useSimulationScene)"
```

---

## Task 5: 移植场景组件 SceneSetup / WarehouseBuilding / Billboard（逐字搬）

这三个组件只依赖 `three`/`@react-three/fiber`/`@react-three/drei`，纹理路径 `/lib/ThreeJs/...` 与 mes-new 一致，无 `@/` 应用内导入，可直接复制。

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/SceneSetup.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/WarehouseBuilding.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/Billboard.tsx`

- [ ] **Step 1: 复制三个组件**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
mkdir -p mes/frontend/apps/mes-new/src/pages/digitization/simulation/components
cp mes/frontend/apps/mes1/src/pages/digitization/components/SceneSetup.tsx        mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/SceneSetup.tsx
cp mes/frontend/apps/mes1/src/pages/digitization/components/WarehouseBuilding.tsx  mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/WarehouseBuilding.tsx
cp mes/frontend/apps/mes1/src/pages/digitization/components/Billboard.tsx          mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/Billboard.tsx
```

- [ ] **Step 2: 类型检查 + lint**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
pnpm --filter mes-new lint
```

Expected: 0 error。若 lint 报未使用变量（mes1 `makeWallSegments` 的 `_wallHeight` 形参以 `_` 前缀，应被忽略），如有其它告警按 lint 提示最小修正（不改逻辑）。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/SceneSetup.tsx mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/WarehouseBuilding.tsx mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/Billboard.tsx
git commit -m "✨ feat(mes-new): 2i-2 移植场景组件(SceneSetup/WarehouseBuilding/Billboard)"
```

---

## Task 6: `Shelf` 组件（移植 + 热力着色 + 拾取）

相对 mes1 `Shelf.tsx` 的改动：货物盒从 `box.png` 贴图改为 `heatColor` 纯色；新增 `globalMax`/`onPick`；货物盒抽出 `CargoBox` 子组件做 hover 高亮 + 点击拾取；`CargoInfo` 增加 `qty`、`locationId` 改为 `string | null`。

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/Shelf.tsx`

- [ ] **Step 1: 写 Shelf.tsx（完整）**

```tsx
import { useState, type ReactNode } from 'react'
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

  return (
    <mesh
      position={position}
      name={locationId ? `货物$${locationId}` : '货位'}
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
```

- [ ] **Step 2: 类型检查**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
```

Expected: 0 error。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/Shelf.tsx
git commit -m "✨ feat(mes-new): 2i-2 货架 Shelf(热力纯色盒 + hover高亮 + 点击拾取)"
```

---

## Task 7: `WarehouseZone` 组件（移植 + 透传占用/拾取）

相对 mes1 `WarehouseZone.tsx` 的改动：`Props` 增加 `occupancyByLoc`/`globalMax`/`onPick`；cargo 项改为 `{ locationId: loc?loc.id:null, code, qty }`；透传 `globalMax`/`onPick` 给 `Shelf`。`ZoneBoundary`/`ZoneLabel` 与 mes1 一致。

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/WarehouseZone.tsx`

- [ ] **Step 1: 写 WarehouseZone.tsx（完整）**

```tsx
import type { ReactNode } from 'react'
import { useLoader } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import Shelf, { type CargoInfo } from './Shelf'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

interface Props {
  warehouse: SpWarehouse
  locations: SpWarehouseLocation[]
  positionX: number
  occupancyByLoc: Map<string, number>
  globalMax: number
  onPick: (locationId: string) => void
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

export default function WarehouseZone({
  warehouse,
  locations,
  positionX,
  occupancyByLoc,
  globalMax,
  onPick,
}: Props) {
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

  const shelfElements: ReactNode[] = []

  for (let g = 0; g < groups; g++) {
    for (let r = 0; r < rows; r++) {
      const sx = positionX
      const sz = g * rows * shelfGapZ + r * shelfGapZ - (groups * rows * shelfGapZ) / 2 + shelfGapZ / 2

      const cargoes: CargoInfo[] = []
      for (let l = 0; l < layers; l++) {
        for (let c = 0; c < columns; c++) {
          const key = `${g + 1}-${r + 1}-${l + 1}-${c + 1}`
          const loc = locMap.get(key)
          cargoes.push({
            locationId: loc ? loc.id : null,
            code: loc?.code || '',
            qty: loc ? occupancyByLoc.get(loc.id) ?? 0 : 0,
          })
        }
      }

      shelfElements.push(
        <Shelf
          key={`shelf-${g}-${r}`}
          position={[sx, 0, sz]}
          layers={layers}
          columns={columns}
          globalMax={globalMax}
          onPick={onPick}
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

- [ ] **Step 2: 类型检查**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
```

Expected: 0 error。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/WarehouseZone.tsx
git commit -m "✨ feat(mes-new): 2i-2 库区 WarehouseZone(透传占用/globalMax/拾取 + cargo带量)"
```

---

## Task 8: DOM 覆盖层 + 样式（Hud / HeatLegend / DataPanels / FullscreenButton / simulation.css）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/simulation.css`
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/Hud.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/HeatLegend.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/DataPanels.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/FullscreenButton.tsx`

- [ ] **Step 1: 写 simulation.css**

```css
.mes-sim {
  position: relative;
  width: 100%;
  height: calc(100vh - 9rem);
  min-height: 480px;
  border-radius: 12px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 38%, #13294d 0%, #070b16 70%, #04060d 100%);
}
.mes-sim:fullscreen {
  height: 100vh;
  border-radius: 0;
}
.mes-sim__topbar {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
}
.mes-sim__overlay {
  position: absolute;
  inset: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #cdd9ef;
  font-size: 14px;
}
.mes-sim__overlay--error {
  color: #fca5a5;
}
.mes-hud {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 18;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(8, 16, 32, 0.55);
  border: 1px solid rgba(40, 70, 130, 0.6);
  color: #dbe6fb;
  font-size: 13px;
  line-height: 1.7;
  backdrop-filter: blur(4px);
}
.mes-hud__stat b {
  color: #7cc4ff;
  font-size: 16px;
}
.mes-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9db4d8;
  font-size: 12px;
  white-space: nowrap;
}
.mes-legend__bar {
  width: 120px;
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(90deg, #1e40af, #06b6d4, #eab308, #f97316, #dc2626);
}
.mes-legend__empty {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: #6b7280;
}
.mes-panels {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 18;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(8, 16, 32, 0.55);
  border: 1px solid rgba(40, 70, 130, 0.6);
  backdrop-filter: blur(4px);
}
.mes-panels__item {
  min-width: 140px;
  color: #cdd9ef;
  font-size: 12px;
}
.mes-panels__bar {
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
  margin-top: 4px;
}
.mes-panels__fill {
  height: 100%;
  background: linear-gradient(90deg, #06b6d4, #3b82f6);
}
```

- [ ] **Step 2: 写 Hud.tsx**

```tsx
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
```

- [ ] **Step 3: 写 HeatLegend.tsx**

```tsx
export default function HeatLegend() {
  return (
    <div className="mes-legend">
      <span className="mes-legend__empty" />
      <span>空</span>
      <span className="mes-legend__bar" />
      <span>在库量 低→高</span>
    </div>
  )
}
```

- [ ] **Step 4: 写 DataPanels.tsx（DOM）**

```tsx
import type { WarehouseStat } from '../simulationModel'

export default function DataPanels({ perWarehouse }: { perWarehouse: WarehouseStat[] }) {
  if (perWarehouse.length === 0) return null
  return (
    <div className="mes-panels">
      {perWarehouse.map((w) => {
        const pct = w.locationCount > 0 ? Math.round((w.occupiedCount / w.locationCount) * 100) : 0
        return (
          <div key={w.id} className="mes-panels__item">
            <div>
              {w.name} · {w.occupiedCount}/{w.locationCount}（{pct}%）
            </div>
            <div className="mes-panels__bar">
              <div className="mes-panels__fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: 写 FullscreenButton.tsx**

```tsx
import { useEffect, useState, type RefObject } from 'react'
import { Button } from '@workspace/ui'
import { Maximize, Minimize } from 'lucide-react'

export default function FullscreenButton({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const [isFs, setIsFs] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = () => {
    const el = targetRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen()
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle}>
      {isFs ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
      {isFs ? '退出全屏' : '全屏'}
    </Button>
  )
}
```

- [ ] **Step 6: 类型检查**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
```

Expected: 0 error。

- [ ] **Step 7: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/digitization/simulation/simulation.css mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/Hud.tsx mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/HeatLegend.tsx mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/DataPanels.tsx mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/FullscreenButton.tsx
git commit -m "💄 feat(mes-new): 2i-2 DOM 覆盖层(HUD/热力图例/数据面板/全屏按钮 + 样式)"
```

---

## Task 9: `LocationDetailSheet`（受控 Sheet，规避 RHF）

镜像 mes-new 既有受控 Sheet 范式（`pages/order/gantt/TaskDetailSheet.tsx`），用普通 props 受控，无 RHF。

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/LocationDetailSheet.tsx`

- [ ] **Step 1: 写 LocationDetailSheet.tsx**

```tsx
import type { ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import type { SpInventory } from '@/types/inventory'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: SpWarehouseLocation | null
  warehouse: SpWarehouse | null
  inventory: SpInventory | null
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground">{value || '—'}</dd>
    </div>
  )
}

export default function LocationDetailSheet({ open, onOpenChange, location, warehouse, inventory }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[360px] flex-col gap-0 p-0 sm:max-w-[360px]">
        <SheetHeader className="gap-2 border-b px-5 pb-4 pr-12 pt-5">
          <SheetTitle className="text-base">{location?.code || '库位详情'}</SheetTitle>
          <SheetDescription>{warehouse?.name || '—'}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field label="库位码" value={location?.code} />
            <Field
              label="坐标"
              value={
                location
                  ? `${location.groupNo}组·${location.rowNo}排·${location.layerNo}层·${location.colNo}列`
                  : '—'
              }
            />
          </dl>

          {inventory ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="物料编码" value={inventory.materialCode} />
              <Field label="物料描述" value={inventory.materialDesc} />
              <Field
                label="在库量"
                value={`${inventory.quantity}${inventory.unit ? ' ' + inventory.unit : ''}`}
              />
              <Field label="状态" value={inventory.status} />
              <Field label="最近入库" value={inventory.lastInboundTime} />
            </dl>
          ) : (
            <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              空库位（暂无在库物料）
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: 类型检查**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
```

Expected: 0 error。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/digitization/simulation/components/LocationDetailSheet.tsx
git commit -m "✨ feat(mes-new): 2i-2 库位详情 Sheet(受控, 真实库存/空库位)"
```

---

## Task 10: `Simulation3DPage` 主页编排（覆盖占位页）

**Files:**
- Modify（覆盖）: `mes/frontend/apps/mes-new/src/pages/digitization/simulation/Simulation3DPage.tsx`

- [ ] **Step 1: 覆盖写 Simulation3DPage.tsx（完整）**

```tsx
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
```

- [ ] **Step 2: 类型检查 + lint**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
pnpm --filter mes-new lint
```

Expected: 均 0 error。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/digitization/simulation/Simulation3DPage.tsx
git commit -m "✨ feat(mes-new): 2i-2 仿真主页编排(Canvas+HUD+全屏+详情Sheet+空/错/加载)"
```

---

## Task 11: 全量验证 + 收尾

- [ ] **Step 1: 类型检查**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
```

Expected: 0 error。

- [ ] **Step 2: lint**

```bash
cd mes/frontend
pnpm --filter mes-new lint
```

Expected: 0 error（若有未使用 import/变量按提示清理后重跑）。

- [ ] **Step 3: 全部单测**

```bash
cd mes/frontend
pnpm --filter mes-new test
```

Expected: 全绿，含 `heatColor`/`simulationModel` 新增用例。

- [ ] **Step 4: 构建**

```bash
cd mes/frontend
pnpm --filter mes-new build
```

Expected: 构建成功（three/R3F 进 bundle，路由懒加载分块）。

- [ ] **Step 5: 若以上有未提交的修复，提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add -A
git commit -m "✅ chore(mes-new): 2i-2 收尾(check-types/lint/test/build 全过)"
```

> **人工双端联调待做**：后端登录需图形验证码，无法脚本化鉴权；运行期需人工进入菜单 171 验证 3D 场景渲染、热力着色、拾取、全屏。交付前置以 check-types/lint/test/build 全绿为准（见 spec §19）。

---

## Self-Review（计划自审）

- **Spec 覆盖**：D1 真实占用→Task 3/4/7；D2 热力→Task 2/6；D3 嵌入+全屏→Task 1 路由 + Task 8 FullscreenButton + Task 10；D4 交互→Task 6 CargoBox + Task 9 Sheet + Task 10 编排；D5 零后端→Task 4 复用现有端点；D6 纯色盒→Task 6；D7 DOM 面板→Task 8。资产迁移→Task 1；测试→Task 2/3 + Task 11;路由/菜单→Task 1;后端零改动→全程未触后端。✅
- **占位扫描**：无 TBD/TODO；每个代码步骤均含完整代码与确切命令/预期。✅
- **类型一致性**：`SceneModel` 字段（`occupancyByLoc/inventoryByLoc/locationById/warehouseById/globalMax/zonePositions/stats`）在 Task 3 定义，Task 10 全部按此引用；`CargoInfo`（`locationId:string|null`/`code`/`qty`）在 Task 6 定义，Task 7 按此构造；`fetchScene$` 产出 `RawScene`（Task 3 定义）。`warehouseList`/`warehouseLocations`/`pageInventory` 均为既有或 Task 4 新增。✅
