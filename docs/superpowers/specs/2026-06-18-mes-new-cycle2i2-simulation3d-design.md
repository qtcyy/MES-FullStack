# 周期 2i-2 · 数字仿真 3D 仓库 — 设计文档

- 日期：2026-06-18
- 周期：2i-2（数字化模块第二子周期，承接 2i-1 智慧大屏）
- 状态：设计已获批（用户免审 spec，授权直接派 subagent 执行）
- 目标 app：`mes/frontend/apps/mes-new`
- 菜单：171 「数字仿真3D仓库」，路由 `/digitization/simulation`

---

## 1. 背景与目标

mes1 已用 React-Three-Fiber（R3F）实现过一版仓库 3D 仿真，效果令用户满意。本周期把该场景**移植**进 mes-new，并**升级为真实占用数字孪生**：

- 复用 mes1 的 6 个 R3F 场景组件（数据模型与 mes-new 完全一致，可近乎逐字移植）。
- 接入 2h 库存模块（`sp_inventory`）的**每库位真实在库量**，对货物盒做**热力着色**。
- 嵌入 AdminLayout 内容区 + **一键全屏**；支持**旋转/缩放 + 点库位看详情**。
- **纯前端、零后端生产代码改动**（仅前端补一个调用已有 `/basedata/warehouse/list` 的 API 函数）。

## 2. 范围 / 非目标

**范围**：单页 `/digitization/simulation`；3D 场景（建筑/货架/货物盒/库区标注）；热力着色；hover 高亮 + 点击详情 Sheet；HUD（统计 + 热力图例）；DOM 数据面板（轻量）；一键全屏；纯函数单测。

**非目标（YAGNI）**：AGV/小车动画、阴影、3D 字体 JSON、in-scene ECharts sprite、InstancedMesh 性能优化、库存实时轮询、多语言、地区/工厂产量对比、移动端适配。

## 3. 决策记录（来自 brainstorming）

| # | 决策 | 选择 |
|---|---|---|
| D1 | 数据真实度 | **真实占用数字孪生**（接入 2h 库存） |
| D2 | 着色语义 | **在库量热力渐变**（空=灰；有料按 `qty/globalMax` 深蓝→青→黄→橙→红连续插值） |
| D3 | 页面壳层 | **嵌入 AdminLayout + 一键全屏**（Fullscreen API，不另开路由） |
| D4 | 交互程度 | **OrbitControls + hover 高亮 + 点库位看详情 Sheet** |
| D5 | 数据源 | **纯前端零后端**：拉全量 `SpInventory` 前端按 `locationId` 聚合 + 算 `globalMax` |
| D6 | 货物盒材质 | 从 mes1 的 `box.png` 贴图改为**纯色 `meshLambertMaterial(color=heatColor)`**（热力可读 + 规避 sprite 内存泄漏） |
| D7 | 数据面板 | 从 mes1 的 **in-scene ECharts→Sprite→dataURL 改为 DOM 覆盖层** |

## 4. 架构总览

```
Simulation3DPage.tsx  (DOM 壳)
├─ useSimulationScene()         // useQuery$ 编排 + buildSceneModel
├─ <Hud>                        // 左上统计 + 右上图例/全屏按钮
├─ <DataPanels>                // 底部 DOM 覆盖层(轻量占用对比)
├─ <LocationDetailSheet>        // shadcn Sheet, 普通 useState 受控
└─ <Canvas> (R3F)
   ├─ <SceneSetup>             // 灯光 + 天空盒 + OrbitControls
   ├─ <WarehouseBuilding>      // 地板/墙/门窗
   ├─ <Billboard>              // 滚动标语(装饰, 保留)
   ├─ <WarehouseZone>[]        // 库区标注 + 边界 + 货架排列
   │   └─ <Shelf>[]            // 层板/立柱 + 货物盒(heatColor + hover/click)
   └─ <DataPanels3D 已删除>
```

- **关注点分离**：数据/着色/统计全部为纯函数（`simulationModel.ts`、`heatColor.ts`），组件只渲染。
- **技术约定**：前端 `@ngify/http` + 自研 `useQuery$`（非 axios/TanStack）；shadcn/Radix（`@workspace/ui`）；写交互一律普通 `useState` 受控，**不碰 RHF**（规避字段名 DOM 冲突坑）；vitest node 环境只测 `*.test.ts`，组件不做渲染测。

## 5. 依赖

`apps/mes-new/package.json` 新增（对齐 mes1，React 19 兼容，已核实 mes-new 为 React 19.2.6）：

- `three@^0.184`
- `@react-three/fiber@^9.6`
- `@react-three/drei@^10.7`

（底部数据面板用纯 CSS 比例条，不依赖 echarts。）

## 6. 资产迁移

把 mes1 `public/lib/ThreeJs/images/` 的纹理（`floor.jpg`/`rack.png`/`box.png`/`plane.png`/`line.png`/`door_left.png`/`door_right.png`/`window.png`/`biaoyu.png`/`roll.png`）+ `skybox/`（远山 6 面）**复制**到 `apps/mes-new/public/lib/ThreeJs/images/`。组件内 `/lib/ThreeJs/...` 绝对路径不变。`FZYaoTi_Regular.json` 不存在 → drei `<Text>` 回退默认字体（不阻塞）。

> 注：D6 后货物盒不再用 `box.png`，但其余纹理仍需迁移；`box.png` 一并复制以备回退/对照，不强制使用。

## 7. 数据层设计

### 7.1 API（`api/basedata/warehouse.ts` 新增一个函数）

```ts
export function warehouseList() {
  return http.get<SpWarehouse[]>('/basedata/warehouse/list')
}
```

（后端 `GET /basedata/warehouse/list` 已存在，返回全部未删除仓库。零后端改动。）

复用现有：`warehouseLocations(warehouseId)`、`pageInventory({current,size})`。

### 7.2 取数编排 `fetchScene$()`（RxJS）

用 `switchMap + forkJoin` 合成一次查询，避免多 hook enabled 串联：

1. `warehouseList()` → `SpWarehouse[]`
2. 对每个仓库并行 `warehouseLocations(w.id)` → `{ whId, locations }[]`
3. `pageInventory({ current: 1, size: OCCUPANCY_FETCH_SIZE })` → `.records` 全量 `SpInventory[]`

返回原始三件套 `RawScene = { warehouses, locationsByWh: {whId, locations}[], inventory }`。
`OCCUPANCY_FETCH_SIZE` 常量取足够大值（如 100000），标准 MyBatis-Plus 分页支持。
空仓库（`warehouses=[]`）→ `forkJoin([])` 立即发 `[]`，下游空态处理。

### 7.3 纯函数 `buildSceneModel(raw): SceneModel`

```ts
interface SceneModel {
  warehouses: SpWarehouse[]
  locationsByWh: Map<string, SpWarehouseLocation[]>
  occupancyByLoc: Map<string, number>      // locationId -> 汇总 quantity
  inventoryByLoc: Map<string, SpInventory> // locationId -> 台账(详情用)
  globalMax: number                         // 归一化用; 全空时为 0
  zonePositions: { wh: SpWarehouse; x: number }[]
  stats: {
    warehouseCount: number
    locationCount: number
    occupiedCount: number
    occupancyRate: number                   // occupiedCount / locationCount, 库位数 0 时为 0
    perWarehouse: { id: string; name: string; locationCount: number; occupiedCount: number }[]
  }
}
```

- `occupancyByLoc`：遍历 `inventory`，按 `locationId` 累加 `quantity`（一库位一物料，≤1 行，求和为防御）。
- `inventoryByLoc`：`locationId -> SpInventory`（最后一条为准）。
- `globalMax`：`occupancyByLoc` 的最大值；空则 0。
- `zonePositions`：沿用 mes1 算法（沿 X 轴铺开，`ZONE_GAP=100`，`zoneW = columns*(55+20)`）。
- 匹配键：`SpWarehouseLocation.id === SpInventory.locationId`（已核实相等）。

### 7.4 Hook `useSimulationScene()`

```ts
const { data, loading, error, refetch } = useQuery$(['simulation','scene'], fetchScene$)
const model = useMemo(() => data ? buildSceneModel(data) : null, [data])
```

## 8. 热力着色规范（纯函数 `heatColor.ts`）

```ts
function heatColor(qty: number, globalMax: number): string  // 返回 'rgb(r,g,b)' 或 hex
```

- `qty <= 0` 或 `globalMax <= 0` → `#6b7280`（空库位/无数据，灰）。
- 否则 `r = clamp(qty/globalMax, 0, 1)`，在五段梯度插值：
  - `0.00 → (30,64,175)` 深蓝
  - `0.25 → (6,182,212)` 青
  - `0.50 → (234,179,8)` 黄
  - `0.75 → (249,115,22)` 橙
  - `1.00 → (220,38,38)` 红
- 货物盒材质：`<meshLambertMaterial color={heatColor(qty, globalMax)} />`（不再用 `box.png`）。
- 空库位仍渲染灰色盒（保持货架"满格"观感，仅颜色表达空/载量）。

## 9. 场景组件移植清单（`pages/digitization/simulation/components/`）

| 组件 | 来源 | 改动要点 |
|---|---|---|
| `SceneSetup` | mes1 原样 | 灯光 + 天空盒(CubeTextureLoader) + OrbitControls(缩放区间沿用) |
| `WarehouseBuilding` | mes1 原样 | 地板/四墙/门窗;尺寸随仓库总跨度动态 |
| `WarehouseZone` | mes1 + 改 | 透传 `occupancyByLoc/inventoryByLoc/globalMax/onPick`;cargo 项带 `qty` |
| `Shelf` | mes1 + 改 | 货物盒：`heatColor` 纯色材质；绑 `onPointerOver/Out`(高亮) + `onClick`(选中) |
| `Billboard` | mes1 原样 | 滚动标语(`biaoyu.png`)，保留(装饰，移植) |
| `DataPanels`(3D) | **删除** | 由 DOM 覆盖层替代(第 12 节) |

## 10. 交互设计

- 相机：`OrbitControls`（旋转/缩放/平移），沿用 mes1 参数。
- 悬停：R3F 内建 `onPointerOver/onPointerOut`（无需手写 raycaster）→ 货物盒高亮（`emissive` 或微放大）+ `document.body.style.cursor='pointer'`。
- 点击：`onClick(e)` → `e.stopPropagation()` → `setSelectedLocationId(locationId)` → 打开 `LocationDetailSheet`。
- `LocationDetailSheet`（shadcn `Sheet`，**普通 `useState` 受控，不碰 RHF**）：
  - 库位码、所属仓库名、坐标（组/排/层/列）。
  - 若 `inventoryByLoc` 命中：物料编码/描述、在库量 + 单位、状态、最近入库时间。
  - 未命中：显示「空库位」+ 坐标。
  - 关闭：`onOpenChange(false)` 清空选中。

## 11. 页面壳层 + 一键全屏

- `Simulation3DPage` 在 AdminLayout 内容区，深空蓝径向渐变沉浸背景（与 2i-1 大屏调性统一）。
- 容器 `ref`；右上角「⛶ 全屏」按钮 → `containerRef.requestFullscreen()/document.exitFullscreen()`；监听 `fullscreenchange` 同步按钮图标与状态；`<Canvas>` 随容器尺寸自适应（R3F 自动 resize）。
- 不另开路由、不进 kiosk 独立页。

## 12. HUD / 数据面板（DOM 覆盖层）

- 左上 HUD：仓库数 / 总库位数 / 占用率（来自 `stats`）。
- 右上：全屏按钮 + 热力图例（CSS 渐变条：空 / 在库量低→高）。
- 底部（轻量）：各仓库「占用/总库位」对比条，用**纯 CSS 比例条**（不引 echarts，保持轻量），数据来自 `stats.perWarehouse`，DOM 渲染不进 3D 场景。
- 所有面板半透明深色卡片，浮于画布之上，`pointer-events` 仅作用于按钮。

## 13. 错误 / 空态 / 加载

- 加载：`Skeleton` 或居中「加载仓库数据…」。
- 空态（`warehouses=[]`）：居中「暂无仓库数据，请先在基础数据中添加仓库」（条件渲染，mes-new 无内建 Empty）。
- 失败（`error`）：居中错误提示 + 「重试」按钮（`refetch`）。
- 防御：库位坐标缺失、`globalMax=0`（全空库）→ 全灰不崩；库位数 0 → 占用率 0。

## 14. 路由 / 菜单

- `router.tsx` 新增 `{ path: 'digitization/simulation', element: <Simulation3DPage/> }`，建议 `lazy` 懒加载（three/echarts 较重，与 2i-1 一致）。
- `urlMap.ts` 已有 `/digital/simulation/list-ui → /digitization/simulation`，菜单 171 **零改动**直达。

## 15. 后端零改动确认

不新增/不修改任何后端生产代码。复用：`GET /basedata/warehouse/list`、`GET /basedata/warehouse/locations/{id}`、`POST /inventory/page`。**不触发"后端每周期必审"负担**。

## 16. 测试策略（TDD）

vitest node 环境，`pages/digitization/simulation/__tests__/*.test.ts`：

- `heatColor`：qty=0 / 负 / =max / >max / globalMax=0 → 边界正确；中间值落在预期段。
- `aggregateOccupancy`（buildSceneModel 内部或独立）：多行同 locationId 求和；空输入。
- `buildSceneModel`：locationId 匹配、缺位补灰、空库 globalMax=0、stats 占用率（含库位数 0）、zonePositions 偏移。
- `buildZonePositions`：多仓库 X 轴偏移与间距。

组件不做渲染测（遵 mes-new 约定）。

## 17. 文件清单

**新增**
- `api/basedata/warehouse.ts`：+ `warehouseList()`（改现有文件）
- `pages/digitization/simulation/Simulation3DPage.tsx`
- `pages/digitization/simulation/useSimulationScene.ts`
- `pages/digitization/simulation/simulationModel.ts`（`buildSceneModel`/`buildZonePositions`/`computeStats`/类型）
- `pages/digitization/simulation/heatColor.ts`
- `pages/digitization/simulation/components/{SceneSetup,WarehouseBuilding,WarehouseZone,Shelf,Billboard}.tsx`
- `pages/digitization/simulation/components/{Hud,HeatLegend,FullscreenButton,LocationDetailSheet,DataPanels}.tsx`
- `pages/digitization/simulation/__tests__/{heatColor,simulationModel}.test.ts`
- `public/lib/ThreeJs/images/**`（纹理 + skybox 资产）

**修改**
- `apps/mes-new/package.json`（+ three/R3F/drei）
- `router.tsx`（+ 路由）

## 18. 验收标准

1. 菜单 171 点击进入 `/digitization/simulation`，渲染 3D 仓库场景。
2. 货物盒按真实在库量热力着色（空=灰，载量越高越暖），与 D2 配色一致。
3. 可旋转/缩放/平移；hover 高亮；点库位弹 Sheet 显示真实库存详情；空库位显示「空库位」。
4. 左上统计（仓库数/库位数/占用率）与真实数据一致；右上热力图例 + 全屏按钮。
5. 一键全屏可进/出，画布自适应。
6. 无仓库 → 友好空态；请求失败 → 错误 + 重试。
7. `pnpm --filter mes-new exec tsc --noEmit`、`pnpm lint`、`pnpm --filter mes-new test`、`pnpm build` 全过。
8. 零后端生产代码改动。

## 19. 风险与缓解

| 风险 | 缓解 |
|---|---|
| R3F v9 API 与 mes1 移植细节差异 | mes-new 同为 React 19，版本对齐；移植后 `tsc` + 实跑验证 |
| 全量库存 payload 偏大 | class MES 数据量小；`OCCUPANCY_FETCH_SIZE` 兜底；如未来增长再上后端聚合端点 |
| 纹理路径/资产缺失导致黑屏 | 资产迁移任务显式校验 `public/lib/ThreeJs/images/` 齐全 |
| `globalMax=0`/坐标缺失崩溃 | 纯函数边界单测覆盖；全灰降级 |
| 人工双端联调受限（后端登录需图形验证码，无法脚本化鉴权） | 同前几周期：交付前置 tsc/lint/test/build；运行期联调标注为待人工 |
