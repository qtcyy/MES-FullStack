# 库位选择占用感知 — 设计文档

- 日期：2026-06-17
- 范围：周期 2h 库存管理的 UX 改进（入库登账 + 手动入库的库位选择器）
- 关联：`docs/superpowers/specs/2026-06-17-mes-new-cycle2h-inventory-design.md`

## 问题

入库登账弹窗（`ReceiptPostDialog`）与手动入库页（`ManualInbound`）的"库位"下拉，把库房下**全部库位**无差别列出，不显示占用情况。后端有"一库位一物料"混放铁律（`SpWarehouseReceiptServiceImpl.postItem` / `SpInventoryServiceImpl.manualInbound`），库位若已存别的物料则拒绝。用户只能盲选→被拒→再选，反复撞墙。

## 方案（已确认：标注 + 禁选）

选库位前，把每个库位对"当前要入的物料"的三态显示出来，占用他物料的禁选。**后端混放规则仍是唯一权威**，前端仅作前置引导——即使占用数据偶有滞后，后端仍会拦截并 toast，无正确性风险（纯加法式 UX）。

库位三态（针对当前物料 `materialCode`）：
- **空闲**：库存表无该库位记录 → 可选（后端将新建）
- **已存本物料·可累加**：该库位已存且物料 = `materialCode` → 可选（后端累加）
- **已占 PART-X**：该库位已存且物料 ≠ `materialCode` → 禁选（灰）

## 架构

### 新增共享组件 `mes/frontend/apps/mes-new/src/pages/inventory/LocationSelect.tsx`
两处复用（同款级联 + 同款混放规则）。

Props：
```ts
interface LocationSelectProps {
  warehouseId: string
  materialCode: string
  value: string
  onChange: (locationId: string) => void
  disabled?: boolean
}
```

内部逻辑：
- `useQuery$(['basedata','warehouse','locations', warehouseId], () => warehouseLocations(warehouseId), { enabled: !!warehouseId })` 取全部库位。
- `useQuery$(['inventory','stock','page', { current:1, size:OCCUPANCY_FETCH_SIZE }], () => pageInventory({ current:1, size:OCCUPANCY_FETCH_SIZE }), { enabled: !!warehouseId })` 取库存；`OCCUPANCY_FETCH_SIZE = 1000`。
- 建占用映射：`Map<locationId, materialCode>`，仅纳入 `record.warehouseId === warehouseId` 的库存行（端点无库房入参，前端过滤）。
- 对每个库位用纯函数 `locationAvailability(occupiedBy, materialCode)` 算三态；`locationOptionLabel(code, occupiedBy, materialCode)` 出文案；`'other'` 的 `SelectItem` 加 `disabled` + 灰样式。
- 排序：可选（empty/same）在前、按 code；已占（other）在后、按 code。
- 渲染 `Select/SelectTrigger/SelectValue/SelectContent/SelectItem`（`@workspace/ui`）；外层 `disabled` 由调用方传（未选库房时）。
- 占位：未选库房 → "请先选择库房"；库位加载中 → "加载库位…"。

### 纯函数（追加到 `pages/inventory/inventoryStatus.ts`，TDD）
```ts
export type LocationAvailability = 'empty' | 'same' | 'other'
export function locationAvailability(occupiedBy: string | undefined, target: string): LocationAvailability
// occupiedBy 空 → 'empty'；=== target → 'same'；否则 → 'other'
export function locationOptionLabel(code: string, occupiedBy: string | undefined, target: string): string
// 'empty' → `${code} · 空闲`；'same' → `${code} · 已存本物料·可累加`；'other' → `${code} · 已占 ${occupiedBy}`
```
追加用例到 `pages/inventory/__tests__/inventoryStatus.test.ts`。

### 改造两处调用
- **`ReceiptPostDialog.tsx`**：删除自身 `warehouseLocations` 查询；库位 `FormField` 内 `Select` 换为
  `<LocationSelect warehouseId={warehouseId} materialCode={item?.materialCode ?? ''} value={locationId} onChange={setLocationId} disabled={!warehouseId} />`。
  物料固定（来自 `item`），换库房时仍 `setLocationId('')`（已有）。
- **`ManualInbound.tsx`**：删除自身 `warehouseLocations` 查询；库位 `Select` 同样换为 `LocationSelect`（`materialCode={materialCode}`）。
  **新增**：物料下拉 `onValueChange` 时 `setLocationId('')`（切物料后同库位三态会变，需重置）。

## 数据流 / 缓存
- 占用查询 key 落在 `["inventory","stock",...]` 前缀；登账/手动入库成功后既有 `invalidate('["inventory","stock"')` 会自动刷新占用，无需额外处理。
- `LocationSelect` 与库存查询页共享 stock 命名空间缓存（参数不同，键不同，互不污染，同前缀一起失效）。

## 错误处理 / 边界
- 后端仍是混放规则的唯一权威；前端占用提示滞后时，后端拦截 + 拦截器 toast 兜底。
- 选中的库位因物料/库房变化而变为 'other'：由调用方在换库房/换物料时 `setLocationId('')` 规避（组件保持纯展示）。

## 测试
- 纯函数 `locationAvailability` / `locationOptionLabel` 走 vitest（node 环境，`*.test.ts`）。
- `LocationSelect` 组件按项目约定不做渲染测，靠人工浏览验证。

## 规模权衡
`pageInventory` 无库房过滤 → 现取大页（size 1000）前端过滤，课程规模（单零件库 / 数条库存）足够。若未来库存量极大，应加后端"库房库位占用"端点（即头脑风暴中的方案 C）替代客户端过滤。本次按最小后端原则不做。

## 交付物
- `pages/inventory/LocationSelect.tsx`（新增）
- `pages/inventory/inventoryStatus.ts`（+2 纯函数）+ `__tests__/inventoryStatus.test.ts`（+用例）
- `pages/inventory/receipt/ReceiptPostDialog.tsx`（替换库位选择 + 删冗余查询）
- `pages/inventory/manual/ManualInbound.tsx`（替换库位选择 + 删冗余查询 + 切物料重置库位）
