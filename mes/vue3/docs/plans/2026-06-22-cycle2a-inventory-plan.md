# Cycle 2a 库存管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Vue3 实现库存管理四页（计划入库确认 / 配套出库确认 / 库存明细查询 / 手动入库），对接后端已存在的 8 端点，零后端生产代码改动。

**Architecture:** 沿用 Cycle 1 沉淀的原语（`MasterDetailLayout` / `DataTable` / `useRequest` / `warehouse.ts`）。纯业务逻辑（状态映射、登账进度、库位占用感知、手工入库校验）抽进 `utils/inventory.ts` 走 TDD；四个页面是薄视图编排。登账/手工入库共用占用感知库位选择器 `LocationSelect.vue`。

**Tech Stack:** Vue 3.5 `<script setup>` + TS + Element Plus + Pinia + `useRequest` 组合式函数 + Vitest（node 环境，`tests/*.spec.ts`）。

**关键约定（实现前必读）：**
- HTTP：`http.post<T>(url, data, json=false)`（第三参 `true` = JSON 体），`http.get<T>(url, params)`。来自 `@/api/request`。
- 分页类型 `IPage<T>` 从 `@/types/system` 导入（**非** `@/types/api`）。
- 状态 meta 返回 `{ label: string; tag: TagType }`，`TagType = 'success'|'warning'|'info'|'primary'|'danger'`（用于 `<el-tag :type="...">`）。
- 测试放 `tests/<name>.spec.ts`，`import { ... } from '@/utils/inventory'`，vitest node 环境（不做组件渲染测）。
- 页面放 `src/views/inventory/`；路由 children path 用相对（`inventory/xxx`，无前导斜杠）。
- **urlMap 零改动**：四个菜单 url 已是干净路径（`/inventory/receipt` 等），`toSpaRoute` 对未映射干净路径原样透传，只需加 router 路由。
- 表单用 Element Plus `el-form` + `reactive`（Vue 无 React DOM clobbering 坑，字段名直接用）。
- `DataTable` props：`data` / `loading` / `columns: Column[]`（`{prop,label,width?,minWidth?}`）/ `pager: {current,size,total}` / `rowKey` / `selectable`；emits `page-change`/`size-change`/`row-click`/`selection-change`；slots `toolbar` / `col-${prop}`（`#col-xxx="{ row }"`）/ `actions`（`#actions="{ row }"`）。
- `MasterDetailLayout` props：`hasSelection: boolean`；slots `master` / `detail` / `detail-empty`。
- `useRequest(fn, options?)` → `{ data, loading, error, run }`，`run(...args)` 返回 Promise。

**执行环境提示：** 前端命令在 `mes/vue3/` 下跑（`pnpm typecheck|test|lint:check|build`）。git 在仓库根 `MES-FullStack-Vue/`，当前分支 `feature/inventory`。后端构建用 JDK11 + 系统 `mvn`（见 backend-build-mvnw-broken 记忆）。

---

### Task 1: 类型补齐 + API 层

**Files:**
- Modify: `mes/vue3/src/types/inventory.ts`（当前仅 `SpInventory` 子集 → 扩展全量）
- Create: `mes/vue3/src/api/inventory/receipt.ts`
- Create: `mes/vue3/src/api/inventory/outbound.ts`
- Modify: `mes/vue3/src/api/inventory/stock.ts`（已有 `pageInventory` → 加 `manualInbound` + 用新参数类型）

- [ ] **Step 1: 重写 `types/inventory.ts` 为全量类型**

```ts
/** 库存台账(对应后端 sp_inventory) */
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

/** 入库单(sp_warehouse_receipt) */
export interface SpWarehouseReceipt {
  id: string
  receiptCode: string
  sourceType?: string
  planId?: string
  orderId?: string
  orderCode?: string
  productCode?: string
  productDesc?: string
  receiptStatus?: string
  totalItems?: number
  postedItems?: number
  createTime?: string
}

/** 入库单明细(sp_warehouse_receipt_item) */
export interface SpWarehouseReceiptItem {
  id: string
  receiptId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity: number
  warehouseId?: string
  warehouseName?: string
  locationId?: string
  locationCode?: string
  postStatus?: string
  postedAt?: string
}

/** 出库单(sp_outbound_order) */
export interface SpOutboundOrder {
  id: string
  outboundCode: string
  orderId?: string
  orderCode?: string
  productCode?: string
  productDesc?: string
  outboundStatus?: string
  totalItems?: number
  postedItems?: number
  createTime?: string
}

/** 出库单明细(sp_outbound_order_item) */
export interface SpOutboundOrderItem {
  id: string
  outboundId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity: number
  postStatus?: string
  allocationDetail?: string
  postedAt?: string
}

/** 分页参数 */
export interface ReceiptPageParams { current: number; size: number; receiptCode?: string; receiptStatus?: string }
export interface OutboundPageParams { current: number; size: number; outboundCode?: string; outboundStatus?: string }
export interface InventoryPageParams { current: number; size: number; materialCode?: string; startDate?: string; endDate?: string }

/** 登账/手工入库 DTO */
export interface PostReceiptItemDTO { itemId: string; warehouseId: string; locationId: string }
export interface PostOutboundItemDTO { itemId: string }
export interface ManualInboundDTO {
  materialCode: string
  materialDesc: string
  unit: string
  warehouseId: string
  locationId: string
  quantity: number
}
```

- [ ] **Step 2: 创建 `api/inventory/receipt.ts`**

```ts
import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type {
  SpWarehouseReceipt,
  SpWarehouseReceiptItem,
  ReceiptPageParams,
  PostReceiptItemDTO,
} from '@/types/inventory'

/** 入库单分页(form 编码) */
export const pageReceipts = (params: ReceiptPageParams) =>
  http.post<IPage<SpWarehouseReceipt>>('/inventory/receipt/page', params)

/** 单张入库单明细(GET) */
export const receiptItems = (receiptId: string) =>
  http.get<SpWarehouseReceiptItem[]>(`/inventory/receipt/${encodeURIComponent(receiptId)}/items`)

/** 入库登账(JSON 体) */
export const postReceiptItem = (dto: PostReceiptItemDTO) =>
  http.post<void>('/inventory/receipt/item/post', dto, true)
```

- [ ] **Step 3: 创建 `api/inventory/outbound.ts`**

```ts
import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type {
  SpOutboundOrder,
  SpOutboundOrderItem,
  OutboundPageParams,
  PostOutboundItemDTO,
} from '@/types/inventory'

/** 出库单分页(form 编码) */
export const pageOutbounds = (params: OutboundPageParams) =>
  http.post<IPage<SpOutboundOrder>>('/inventory/outbound/page', params)

/** 单张出库单明细(GET) */
export const outboundItems = (outboundId: string) =>
  http.get<SpOutboundOrderItem[]>(`/inventory/outbound/${encodeURIComponent(outboundId)}/items`)

/** 出库登账 FIFO(JSON 体,只需 itemId) */
export const postOutboundItem = (dto: PostOutboundItemDTO) =>
  http.post<void>('/inventory/outbound/item/post', dto, true)
```

- [ ] **Step 4: 改写 `api/inventory/stock.ts`（保留 pageInventory + 加 manualInbound）**

```ts
import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type { SpInventory, InventoryPageParams, ManualInboundDTO } from '@/types/inventory'

/** 库存台账分页(form;端点 /inventory/page) */
export const pageInventory = (params: InventoryPageParams) =>
  http.post<IPage<SpInventory>>('/inventory/page', params)

/** 手动入库(JSON 体) */
export const manualInbound = (dto: ManualInboundDTO) =>
  http.post<void>('/inventory/manual-inbound', dto, true)
```

> 注：`InventoryPageParams` 把 `current`/`size` 设为必填、其余可选，1f 的 3D 仿真 `pageInventory({current,size})` 调用向后兼容。

- [ ] **Step 5: 验证 typecheck 通过**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 6: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/types/inventory.ts mes/vue3/src/api/inventory/
git commit -m "✨ feat(vue3): 库存模块类型补齐 + receipt/outbound/stock API"
```

---

### Task 2: 纯函数 `utils/inventory.ts`（TDD）

**Files:**
- Test: `mes/vue3/tests/inventory.spec.ts`
- Create: `mes/vue3/src/utils/inventory.ts`

- [ ] **Step 1: 写失败测试 `tests/inventory.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  receiptStatusMeta,
  outboundStatusMeta,
  postStatusMeta,
  progressText,
  progressPercent,
  locationAvailability,
  locationOptionLabel,
  buildOccupancyMap,
  validateManualInbound,
  buildManualInboundPayload,
} from '@/utils/inventory'

describe('receiptStatusMeta', () => {
  it('pending → 待确认/warning', () => expect(receiptStatusMeta('pending')).toEqual({ label: '待确认', tag: 'warning' }))
  it('partial → 部分登账/primary', () => expect(receiptStatusMeta('partial')).toEqual({ label: '部分登账', tag: 'primary' }))
  it('completed → 已完成/success', () => expect(receiptStatusMeta('completed')).toEqual({ label: '已完成', tag: 'success' }))
  it('未知 → 原值/info', () => expect(receiptStatusMeta('x')).toEqual({ label: 'x', tag: 'info' }))
  it('空 → 占位符/info', () => expect(receiptStatusMeta(undefined)).toEqual({ label: '—', tag: 'info' }))
})

describe('outboundStatusMeta', () => {
  it('pending', () => expect(outboundStatusMeta('pending')).toEqual({ label: '待确认', tag: 'warning' }))
  it('partial → 部分出库', () => expect(outboundStatusMeta('partial')).toEqual({ label: '部分出库', tag: 'primary' }))
  it('completed', () => expect(outboundStatusMeta('completed')).toEqual({ label: '已完成', tag: 'success' }))
})

describe('postStatusMeta', () => {
  it('pending → 待登账', () => expect(postStatusMeta('pending')).toEqual({ label: '待登账', tag: 'warning' }))
  it('posted → 已登账', () => expect(postStatusMeta('posted')).toEqual({ label: '已登账', tag: 'success' }))
  it('未知 → info', () => expect(postStatusMeta(undefined)).toEqual({ label: '—', tag: 'info' }))
})

describe('progressText', () => {
  it('正常', () => expect(progressText(2, 5)).toBe('2/5'))
  it('缺省补 0', () => expect(progressText(undefined, undefined)).toBe('0/0'))
})

describe('progressPercent', () => {
  it('四舍五入', () => expect(progressPercent(1, 3)).toBe(33))
  it('total<=0 不除零', () => expect(progressPercent(1, 0)).toBe(0))
})

describe('locationAvailability', () => {
  it('无占用 → empty', () => expect(locationAvailability(undefined, 'M1')).toBe('empty'))
  it('同物料 → same', () => expect(locationAvailability('M1', 'M1')).toBe('same'))
  it('他物料 → other', () => expect(locationAvailability('M2', 'M1')).toBe('other'))
})

describe('locationOptionLabel', () => {
  it('空闲', () => expect(locationOptionLabel('A-1', undefined, 'M1')).toBe('A-1 · 空闲'))
  it('可累加', () => expect(locationOptionLabel('A-1', 'M1', 'M1')).toBe('A-1 · 已存本物料·可累加'))
  it('被占', () => expect(locationOptionLabel('A-1', 'M2', 'M1')).toBe('A-1 · 已占 M2'))
})

describe('buildOccupancyMap', () => {
  it('locationId → materialCode', () => {
    const m = buildOccupancyMap([
      { locationId: 'L1', materialCode: 'M1', quantity: 5 },
      { locationId: 'L2', materialCode: 'M2', quantity: 3 },
    ])
    expect(m).toEqual({ L1: 'M1', L2: 'M2' })
  })
  it('忽略无 locationId 与 0 量', () => {
    const m = buildOccupancyMap([
      { locationId: undefined, materialCode: 'M1', quantity: 5 },
      { locationId: 'L2', materialCode: 'M2', quantity: 0 },
    ])
    expect(m).toEqual({})
  })
  it('同库位取首个占用者', () => {
    const m = buildOccupancyMap([
      { locationId: 'L1', materialCode: 'M1', quantity: 5 },
      { locationId: 'L1', materialCode: 'M9', quantity: 1 },
    ])
    expect(m).toEqual({ L1: 'M1' })
  })
})

describe('validateManualInbound', () => {
  it('物料编码必填', () => expect(validateManualInbound({})).toBe('请输入物料编码'))
  it('库房必填', () => expect(validateManualInbound({ materialCode: 'M' })).toBe('请选择库房'))
  it('库位必填', () => expect(validateManualInbound({ materialCode: 'M', warehouseId: 'W' })).toBe('请选择库位'))
  it('数量须为正', () => expect(validateManualInbound({ materialCode: 'M', warehouseId: 'W', locationId: 'L', quantity: 0 })).toBe('数量须为正数'))
  it('合法 → null', () => expect(validateManualInbound({ materialCode: 'M', warehouseId: 'W', locationId: 'L', quantity: 2 })).toBeNull())
})

describe('buildManualInboundPayload', () => {
  it('trim + 数值化 + 缺省空串', () => {
    expect(buildManualInboundPayload({ materialCode: ' M1 ', warehouseId: 'W', locationId: 'L', quantity: '3' as unknown as number }))
      .toEqual({ materialCode: 'M1', materialDesc: '', unit: '', warehouseId: 'W', locationId: 'L', quantity: 3 })
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd mes/vue3 && pnpm test inventory`
Expected: FAIL（`@/utils/inventory` 不存在）。

- [ ] **Step 3: 实现 `src/utils/inventory.ts`**

```ts
/** Element Plus el-tag 类型 */
export type TagType = 'success' | 'warning' | 'info' | 'primary' | 'danger'
export interface StatusMeta { label: string; tag: TagType }

/** 入库单状态 → 文案 + tag */
export function receiptStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待确认', tag: 'warning' }
    case 'partial': return { label: '部分登账', tag: 'primary' }
    case 'completed': return { label: '已完成', tag: 'success' }
    default: return { label: status || '—', tag: 'info' }
  }
}

/** 出库单状态 → 文案 + tag */
export function outboundStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待确认', tag: 'warning' }
    case 'partial': return { label: '部分出库', tag: 'primary' }
    case 'completed': return { label: '已完成', tag: 'success' }
    default: return { label: status || '—', tag: 'info' }
  }
}

/** 明细登账状态 → 文案 + tag */
export function postStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待登账', tag: 'warning' }
    case 'posted': return { label: '已登账', tag: 'success' }
    default: return { label: status || '—', tag: 'info' }
  }
}

/** 登账进度文案 posted/total */
export function progressText(posted?: number, total?: number): string {
  return `${posted ?? 0}/${total ?? 0}`
}

/** 登账进度百分比 0-100;total<=0 返回 0(不除零) */
export function progressPercent(posted?: number, total?: number): number {
  const t = total ?? 0
  if (t <= 0) return 0
  return Math.round(((posted ?? 0) / t) * 100)
}

export type LocationAvailability = 'empty' | 'same' | 'other'

/** 库位对目标物料的可用性 */
export function locationAvailability(occupiedBy: string | undefined, target: string): LocationAvailability {
  if (!occupiedBy) return 'empty'
  return occupiedBy === target ? 'same' : 'other'
}

/** 库位下拉选项文案 */
export function locationOptionLabel(code: string, occupiedBy: string | undefined, target: string): string {
  switch (locationAvailability(occupiedBy, target)) {
    case 'empty': return `${code} · 空闲`
    case 'same': return `${code} · 已存本物料·可累加`
    case 'other': return `${code} · 已占 ${occupiedBy}`
  }
}

/** 由库存台账构建 库位id → 占用物料编码 映射(忽略无库位/0量;同库位取首个) */
export function buildOccupancyMap(
  inv: { locationId?: string; materialCode: string; quantity: number }[],
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const r of inv) {
    if (!r.locationId) continue
    if ((r.quantity ?? 0) <= 0) continue
    if (!map[r.locationId]) map[r.locationId] = r.materialCode
  }
  return map
}

export interface ManualInboundForm {
  materialCode?: string
  materialDesc?: string
  unit?: string
  warehouseId?: string
  locationId?: string
  quantity?: number
}

/** 手工入库校验:返回错误文案,合法返回 null */
export function validateManualInbound(f: ManualInboundForm): string | null {
  if (!f.materialCode?.trim()) return '请输入物料编码'
  if (!f.warehouseId) return '请选择库房'
  if (!f.locationId) return '请选择库位'
  if (!f.quantity || Number(f.quantity) <= 0) return '数量须为正数'
  return null
}

/** 手工入库提交体:trim + 数值化 + 缺省空串 */
export function buildManualInboundPayload(f: ManualInboundForm) {
  return {
    materialCode: f.materialCode!.trim(),
    materialDesc: f.materialDesc?.trim() || '',
    unit: f.unit?.trim() || '',
    warehouseId: f.warehouseId!,
    locationId: f.locationId!,
    quantity: Number(f.quantity),
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd mes/vue3 && pnpm test inventory`
Expected: PASS（全部用例绿）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/inventory.ts mes/vue3/tests/inventory.spec.ts
git commit -m "✨ test(vue3): 库存纯函数(状态/进度/占用感知/手工入库校验,TDD)"
```

---

### Task 3: `LocationSelect.vue` 占用感知库位选择器

**Files:**
- Create: `mes/vue3/src/views/inventory/LocationSelect.vue`

职责：库房 + 库位级联选择器，库位下拉按目标物料标注 `空闲/可累加/已占`。`v-model` 绑定 `{ warehouseId, locationId }`。入库登账弹窗与手工入库页共用。

- [ ] **Step 1: 创建组件**

```vue
<template>
  <div class="location-select">
    <el-select
      :model-value="modelValue.warehouseId"
      placeholder="选择库房"
      class="location-select__wh"
      @update:model-value="onWarehouse"
    >
      <el-option v-for="w in warehouses ?? []" :key="w.id" :label="w.name" :value="w.id" />
    </el-select>
    <el-select
      :model-value="modelValue.locationId"
      placeholder="选择库位"
      :loading="locLoading"
      :disabled="!modelValue.warehouseId"
      class="location-select__loc"
      @update:model-value="onLocation"
    >
      <el-option
        v-for="l in locations ?? []"
        :key="l.id"
        :label="locationOptionLabel(l.code, occupancy[l.id], targetMaterial)"
        :value="l.id"
      />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { warehouseList, warehouseLocations } from '@/api/basedata/warehouse'
import { pageInventory } from '@/api/inventory/stock'
import { useRequest } from '@/composables/useRequest'
import { buildOccupancyMap, locationOptionLabel } from '@/utils/inventory'

const props = defineProps<{
  modelValue: { warehouseId?: string; locationId?: string }
  targetMaterial: string
}>()
const emit = defineEmits<{ 'update:modelValue': [{ warehouseId?: string; locationId?: string }] }>()

const { data: warehouses, run: loadWarehouses } = useRequest(warehouseList)
const { data: locations, loading: locLoading, run: loadLocations } = useRequest(warehouseLocations)

/** 库位id → 占用物料编码 */
const occupancy = ref<Record<string, string>>({})

async function loadOccupancy() {
  const page = await pageInventory({ current: 1, size: 100000 })
  occupancy.value = buildOccupancyMap(page.records ?? [])
}

function onWarehouse(warehouseId: string) {
  emit('update:modelValue', { warehouseId, locationId: undefined })
  loadLocations(warehouseId)
}
function onLocation(locationId: string) {
  emit('update:modelValue', { warehouseId: props.modelValue.warehouseId, locationId })
}

// 已选库房时回填库位列表(编辑/复用场景)
watch(
  () => props.modelValue.warehouseId,
  (wid) => {
    if (wid && !(locations.value?.length)) loadLocations(wid)
  },
)

loadWarehouses()
loadOccupancy()
</script>

<style scoped>
.location-select { display: flex; gap: var(--sp-2); }
.location-select__wh, .location-select__loc { flex: 1; min-width: 0; }
</style>
```

- [ ] **Step 2: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/inventory/LocationSelect.vue
git commit -m "✨ feat(vue3): 占用感知库位选择器 LocationSelect"
```

---

### Task 4: 库存明细查询页（只读）

**Files:**
- Create: `mes/vue3/src/views/inventory/InventoryQueryPage.vue`

- [ ] **Step 1: 创建页面**

```vue
<template>
  <PageContainer title="库存明细查询">
    <DataTable
      :data="data?.records ?? []"
      :loading="loading"
      :columns="columns"
      :pager="{ current, size, total: data?.total ?? 0 }"
      :action-width="0"
      @page-change="onPage"
      @size-change="onSize"
    >
      <template #toolbar>
        <el-input v-model="q.materialCode" placeholder="物料编码" clearable class="qbox" @keyup.enter="search" />
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button @click="reset">重置</el-button>
      </template>
      <template #col-status="{ row }">
        <el-tag :type="row.quantity > 0 ? 'success' : 'info'" disable-transitions>
          {{ row.quantity > 0 ? '在库' : '无库存' }}
        </el-tag>
      </template>
    </DataTable>
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import PageContainer from '@/components/PageContainer.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import { pageInventory } from '@/api/inventory/stock'
import { useRequest } from '@/composables/useRequest'

const columns: Column[] = [
  { prop: 'materialCode', label: '物料编码', width: 160 },
  { prop: 'materialDesc', label: '物料描述', minWidth: 160 },
  { prop: 'unit', label: '单位', width: 80 },
  { prop: 'warehouseName', label: '库房', width: 140 },
  { prop: 'locationCode', label: '库位', width: 120 },
  { prop: 'quantity', label: '数量', width: 100 },
  { prop: 'status', label: '状态', width: 100 },
  { prop: 'lastInboundTime', label: '最近入库', width: 180 },
]

const current = ref(1)
const size = ref(10)
const q = reactive({ materialCode: '' })

const { data, loading, run } = useRequest(pageInventory)
function load() {
  run({ current: current.value, size: size.value, materialCode: q.materialCode || undefined })
}
function search() { current.value = 1; load() }
function reset() { q.materialCode = ''; search() }
function onPage(p: number) { current.value = p; load() }
function onSize(s: number) { size.value = s; current.value = 1; load() }

load()
</script>

<style scoped>
.qbox { width: 200px; }
</style>
```

- [ ] **Step 2: typecheck + build**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/inventory/InventoryQueryPage.vue
git commit -m "✨ feat(vue3): 库存明细查询页(只读)"
```

---

### Task 5: 手动入库页（表单 + LocationSelect）

**Files:**
- Create: `mes/vue3/src/views/inventory/ManualInboundPage.vue`

- [ ] **Step 1: 创建页面**

```vue
<template>
  <PageContainer title="手动入库">
    <el-card class="manual-card">
      <el-form label-width="100px" class="manual-form">
        <el-form-item label="物料编码" required>
          <el-input v-model="form.materialCode" placeholder="请输入物料编码" />
        </el-form-item>
        <el-form-item label="物料描述">
          <el-input v-model="form.materialDesc" placeholder="可选" />
        </el-form-item>
        <el-form-item label="单位">
          <el-select v-model="form.unit" placeholder="选择单位" clearable>
            <el-option v-for="o in unitOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" required>
          <el-input-number v-model="form.quantity" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="库位" required>
          <LocationSelect v-model="loc" :target-material="form.materialCode || ''" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">入库</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import LocationSelect from './LocationSelect.vue'
import { manualInbound } from '@/api/inventory/stock'
import { useDict } from '@/composables/useDict'
import { validateManualInbound, buildManualInboundPayload } from '@/utils/inventory'

const { options: unitOptions } = useDict('ORDER_UNIT')

const form = reactive({ materialCode: '', materialDesc: '', unit: '', quantity: 0 })
const loc = ref<{ warehouseId?: string; locationId?: string }>({})
const submitting = ref(false)

function resetForm() {
  form.materialCode = ''
  form.materialDesc = ''
  form.unit = ''
  form.quantity = 0
  loc.value = {}
}

async function submit() {
  const err = validateManualInbound({ ...form, warehouseId: loc.value.warehouseId, locationId: loc.value.locationId })
  if (err) { ElMessage.warning(err); return }
  submitting.value = true
  try {
    await manualInbound(buildManualInboundPayload({ ...form, warehouseId: loc.value.warehouseId, locationId: loc.value.locationId }))
    ElMessage.success('入库成功')
    resetForm()
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.manual-card { max-width: 560px; }
.manual-form { padding: var(--sp-2); }
</style>
```

> 注：`useDict` 返回 `{ options, labelOf, loading }`（1b 沉淀）。若 `ORDER_UNIT` 字典无数据，options 为空数组，单位可手动留空，不阻断。

- [ ] **Step 2: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/inventory/ManualInboundPage.vue
git commit -m "✨ feat(vue3): 手动入库页(表单 + 占用感知库位)"
```

---

### Task 6: 计划入库确认页（主从 + 登账弹窗）

**Files:**
- Create: `mes/vue3/src/views/inventory/ReceiptItemsPanel.vue`
- Create: `mes/vue3/src/views/inventory/ReceiptPostDialog.vue`
- Create: `mes/vue3/src/views/inventory/ReceiptPage.vue`

- [ ] **Step 1: 创建登账弹窗 `ReceiptPostDialog.vue`**

```vue
<template>
  <el-dialog :model-value="modelValue" title="入库登账" width="520px" @update:model-value="close">
    <el-form v-if="item" label-width="90px">
      <el-form-item label="物料">{{ item.materialCode }} · {{ item.materialDesc }}</el-form-item>
      <el-form-item label="数量">{{ item.quantity }} {{ item.unit }}</el-form-item>
      <el-form-item label="库位" required>
        <LocationSelect v-model="loc" :target-material="item.materialCode" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确认登账</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import LocationSelect from './LocationSelect.vue'
import { postReceiptItem } from '@/api/inventory/receipt'
import type { SpWarehouseReceiptItem } from '@/types/inventory'

const props = defineProps<{ modelValue: boolean; item: SpWarehouseReceiptItem | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; posted: [] }>()

const loc = ref<{ warehouseId?: string; locationId?: string }>({})
const submitting = ref(false)

watch(() => props.modelValue, (v) => { if (v) loc.value = {} })

function close() { emit('update:modelValue', false) }

async function submit() {
  if (!props.item) return
  if (!loc.value.warehouseId || !loc.value.locationId) { ElMessage.warning('请选择库房与库位'); return }
  submitting.value = true
  try {
    await postReceiptItem({ itemId: props.item.id, warehouseId: loc.value.warehouseId, locationId: loc.value.locationId })
    ElMessage.success('登账成功')
    emit('posted')
    close()
  } finally {
    submitting.value = false
  }
}
</script>
```

- [ ] **Step 2: 创建明细面板 `ReceiptItemsPanel.vue`**

```vue
<template>
  <el-card>
    <template #header>
      <span>入库单 {{ receipt.receiptCode }} 明细</span>
      <el-tag class="hdr-tag" :type="receiptStatusMeta(receipt.receiptStatus).tag" disable-transitions>
        {{ receiptStatusMeta(receipt.receiptStatus).label }}
      </el-tag>
      <span class="hdr-prog">登账 {{ progressText(receipt.postedItems, receipt.totalItems) }}</span>
    </template>
    <el-table v-loading="loading" :data="items ?? []" stripe>
      <el-table-column prop="materialCode" label="物料编码" width="150" />
      <el-table-column prop="materialDesc" label="描述" min-width="140" />
      <el-table-column prop="quantity" label="数量" width="90" />
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column prop="locationCode" label="库位" width="110" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="postStatusMeta(row.postStatus).tag" disable-transitions>{{ postStatusMeta(row.postStatus).label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button v-if="row.postStatus !== 'posted'" type="primary" link @click="emit('post', row)">登账</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { receiptStatusMeta, postStatusMeta, progressText } from '@/utils/inventory'
import type { SpWarehouseReceipt, SpWarehouseReceiptItem } from '@/types/inventory'

defineProps<{
  receipt: SpWarehouseReceipt
  items: SpWarehouseReceiptItem[] | undefined
  loading: boolean
}>()
const emit = defineEmits<{ post: [SpWarehouseReceiptItem] }>()
</script>

<style scoped>
.hdr-tag { margin-left: var(--sp-2); }
.hdr-prog { margin-left: var(--sp-3); color: var(--el-text-color-secondary); font-size: 13px; }
</style>
```

- [ ] **Step 3: 创建主从页 `ReceiptPage.vue`**

```vue
<template>
  <PageContainer title="计划入库确认">
    <MasterDetailLayout :has-selection="!!selected">
      <template #master>
        <DataTable
          :data="page?.records ?? []"
          :loading="loading"
          :columns="columns"
          :pager="{ current, size, total: page?.total ?? 0 }"
          :action-width="0"
          @row-click="select"
          @page-change="onPage"
          @size-change="onSize"
        >
          <template #toolbar>
            <el-input v-model="q.receiptCode" placeholder="入库单号" clearable class="qbox" @keyup.enter="search" />
            <el-button type="primary" @click="search">搜索</el-button>
            <el-button @click="reset">重置</el-button>
          </template>
          <template #col-receiptStatus="{ row }">
            <el-tag :type="receiptStatusMeta(row.receiptStatus).tag" disable-transitions>{{ receiptStatusMeta(row.receiptStatus).label }}</el-tag>
          </template>
        </DataTable>
      </template>
      <template #detail>
        <ReceiptItemsPanel v-if="selected" :receipt="selected" :items="items" :loading="itemsLoading" @post="openPost" />
      </template>
    </MasterDetailLayout>
    <ReceiptPostDialog v-model="postOpen" :item="activeItem" @posted="afterPost" />
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ReceiptItemsPanel from './ReceiptItemsPanel.vue'
import ReceiptPostDialog from './ReceiptPostDialog.vue'
import { pageReceipts, receiptItems } from '@/api/inventory/receipt'
import { useRequest } from '@/composables/useRequest'
import { receiptStatusMeta } from '@/utils/inventory'
import type { SpWarehouseReceipt, SpWarehouseReceiptItem } from '@/types/inventory'

const columns: Column[] = [
  { prop: 'receiptCode', label: '入库单号', minWidth: 140 },
  { prop: 'orderCode', label: '订单号', width: 120 },
  { prop: 'receiptStatus', label: '状态', width: 100 },
]

const current = ref(1)
const size = ref(10)
const q = reactive({ receiptCode: '' })
const selected = ref<SpWarehouseReceipt | null>(null)

const { data: page, loading, run: runPage } = useRequest(pageReceipts)
const { data: items, loading: itemsLoading, run: runItems } = useRequest(receiptItems)

const postOpen = ref(false)
const activeItem = ref<SpWarehouseReceiptItem | null>(null)

function load() {
  runPage({ current: current.value, size: size.value, receiptCode: q.receiptCode || undefined })
}
function search() { current.value = 1; load() }
function reset() { q.receiptCode = ''; search() }
function onPage(p: number) { current.value = p; load() }
function onSize(s: number) { size.value = s; current.value = 1; load() }

function select(row: SpWarehouseReceipt) {
  selected.value = row
  runItems(row.id)
}
function openPost(item: SpWarehouseReceiptItem) {
  activeItem.value = item
  postOpen.value = true
}
async function afterPost() {
  if (selected.value) await runItems(selected.value.id)
  load()
}

load()
</script>

<style scoped>
.qbox { width: 180px; }
</style>
```

- [ ] **Step 4: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/inventory/ReceiptPage.vue mes/vue3/src/views/inventory/ReceiptItemsPanel.vue mes/vue3/src/views/inventory/ReceiptPostDialog.vue
git commit -m "✨ feat(vue3): 计划入库确认页(主从 + 登账弹窗)"
```

---

### Task 7: 配套出库确认页（主从 + FIFO 登账）

**Files:**
- Create: `mes/vue3/src/views/inventory/OutboundItemsPanel.vue`
- Create: `mes/vue3/src/views/inventory/OutboundPage.vue`

> 出库登账只需 `itemId`（后端 FIFO 自动扣减最早批次），无需选库位，故用 `ElMessageBox.confirm` 确认即可，无独立弹窗组件。

- [ ] **Step 1: 创建明细面板 `OutboundItemsPanel.vue`**

```vue
<template>
  <el-card>
    <template #header>
      <span>出库单 {{ order.outboundCode }} 明细</span>
      <el-tag class="hdr-tag" :type="outboundStatusMeta(order.outboundStatus).tag" disable-transitions>
        {{ outboundStatusMeta(order.outboundStatus).label }}
      </el-tag>
      <span class="hdr-prog">出库 {{ progressText(order.postedItems, order.totalItems) }}</span>
    </template>
    <el-table v-loading="loading" :data="items ?? []" stripe>
      <el-table-column prop="materialCode" label="物料编码" width="150" />
      <el-table-column prop="materialDesc" label="描述" min-width="140" />
      <el-table-column prop="quantity" label="数量" width="90" />
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column prop="allocationDetail" label="扣减明细" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="postStatusMeta(row.postStatus).tag" disable-transitions>{{ postStatusMeta(row.postStatus).label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110">
        <template #default="{ row }">
          <el-button v-if="row.postStatus !== 'posted'" type="primary" link @click="emit('post', row)">FIFO 登账</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { outboundStatusMeta, postStatusMeta, progressText } from '@/utils/inventory'
import type { SpOutboundOrder, SpOutboundOrderItem } from '@/types/inventory'

defineProps<{
  order: SpOutboundOrder
  items: SpOutboundOrderItem[] | undefined
  loading: boolean
}>()
const emit = defineEmits<{ post: [SpOutboundOrderItem] }>()
</script>

<style scoped>
.hdr-tag { margin-left: var(--sp-2); }
.hdr-prog { margin-left: var(--sp-3); color: var(--el-text-color-secondary); font-size: 13px; }
</style>
```

- [ ] **Step 2: 创建主从页 `OutboundPage.vue`**

```vue
<template>
  <PageContainer title="配套出库确认">
    <MasterDetailLayout :has-selection="!!selected">
      <template #master>
        <DataTable
          :data="page?.records ?? []"
          :loading="loading"
          :columns="columns"
          :pager="{ current, size, total: page?.total ?? 0 }"
          :action-width="0"
          @row-click="select"
          @page-change="onPage"
          @size-change="onSize"
        >
          <template #toolbar>
            <el-input v-model="q.outboundCode" placeholder="出库单号" clearable class="qbox" @keyup.enter="search" />
            <el-button type="primary" @click="search">搜索</el-button>
            <el-button @click="reset">重置</el-button>
          </template>
          <template #col-outboundStatus="{ row }">
            <el-tag :type="outboundStatusMeta(row.outboundStatus).tag" disable-transitions>{{ outboundStatusMeta(row.outboundStatus).label }}</el-tag>
          </template>
        </DataTable>
      </template>
      <template #detail>
        <OutboundItemsPanel v-if="selected" :order="selected" :items="items" :loading="itemsLoading" @post="confirmPost" />
      </template>
    </MasterDetailLayout>
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import OutboundItemsPanel from './OutboundItemsPanel.vue'
import { pageOutbounds, outboundItems, postOutboundItem } from '@/api/inventory/outbound'
import { useRequest } from '@/composables/useRequest'
import { outboundStatusMeta } from '@/utils/inventory'
import type { SpOutboundOrder, SpOutboundOrderItem } from '@/types/inventory'

const columns: Column[] = [
  { prop: 'outboundCode', label: '出库单号', minWidth: 140 },
  { prop: 'orderCode', label: '订单号', width: 120 },
  { prop: 'outboundStatus', label: '状态', width: 100 },
]

const current = ref(1)
const size = ref(10)
const q = reactive({ outboundCode: '' })
const selected = ref<SpOutboundOrder | null>(null)

const { data: page, loading, run: runPage } = useRequest(pageOutbounds)
const { data: items, loading: itemsLoading, run: runItems } = useRequest(outboundItems)

function load() {
  runPage({ current: current.value, size: size.value, outboundCode: q.outboundCode || undefined })
}
function search() { current.value = 1; load() }
function reset() { q.outboundCode = ''; search() }
function onPage(p: number) { current.value = p; load() }
function onSize(s: number) { size.value = s; current.value = 1; load() }

function select(row: SpOutboundOrder) {
  selected.value = row
  runItems(row.id)
}
async function confirmPost(item: SpOutboundOrderItem) {
  await ElMessageBox.confirm(
    `确认对「${item.materialCode}」按 FIFO 出库 ${item.quantity} ${item.unit ?? ''}?将自动扣减最早批次库存。`,
    'FIFO 出库登账',
    { type: 'warning' },
  )
  await postOutboundItem({ itemId: item.id })
  ElMessage.success('出库登账成功')
  if (selected.value) await runItems(selected.value.id)
  load()
}

load()
</script>

<style scoped>
.qbox { width: 180px; }
</style>
```

- [ ] **Step 3: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/inventory/OutboundPage.vue mes/vue3/src/views/inventory/OutboundItemsPanel.vue
git commit -m "✨ feat(vue3): 配套出库确认页(主从 + FIFO 登账)"
```

---

### Task 8: 路由接线 + 全门禁

**Files:**
- Modify: `mes/vue3/src/router/index.ts`（在 `/` 的 children 数组里加 4 条路由）

- [ ] **Step 1: 加 4 条路由**

在 `src/router/index.ts` 的 AdminLayout children 数组中（紧接现有 `order/gantt` 等条目之后）插入：

```ts
      {
        path: 'inventory/receipt',
        name: 'inventory-receipt',
        component: () => import('@/views/inventory/ReceiptPage.vue'),
        meta: { title: '计划入库确认', perm: 'inventory:inbound' },
      },
      {
        path: 'inventory/query',
        name: 'inventory-query',
        component: () => import('@/views/inventory/InventoryQueryPage.vue'),
        meta: { title: '库存明细查询', perm: 'inventory:query' },
      },
      {
        path: 'inventory/outbound',
        name: 'inventory-outbound',
        component: () => import('@/views/inventory/OutboundPage.vue'),
        meta: { title: '配套出库确认', perm: 'inventory:outbound' },
      },
      {
        path: 'inventory/manual-inbound',
        name: 'inventory-manual-inbound',
        component: () => import('@/views/inventory/ManualInboundPage.vue'),
        meta: { title: '手动入库', perm: 'inventory:inbound' },
      },
```

> urlMap 无需改动：菜单 url（`/inventory/receipt` 等）已是干净路径，`toSpaRoute` 原样透传，与上面 children 拼成 `/` 前缀后即 `/inventory/receipt`。

- [ ] **Step 2: 跑全部门禁**

Run: `cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: typecheck 0 错误；test 全绿（含新增 inventory 用例，总数 = 既有 221 + 新增）；lint 0 error（既有 5 warn 可接受）；build 成功。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 库存四页路由接线(zero urlMap 改动)"
```

---

### Task 9: 后端审查（按每周期必审约定）

**Files（只读审查，发现真 bug 才改）:**
- Read: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpWarehouseReceiptServiceImpl.java`
- Read: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpOutboundOrderServiceImpl.java`
- Read: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpInventoryServiceImpl.java`
- Read: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpWarehouseReceiptItemServiceImpl.java`
- Read: `mes/src/main/java/com/wangziyang/mes/inventory/service/impl/SpOutboundOrderItemServiceImpl.java`

- [ ] **Step 1: 逐文件读码审查**

重点核查清单：
1. 入库 `postItem`：写库存台账 upsert 累加是否正确；同库位+同物料是否累加（不是覆盖）；`postStatus`→posted、`postedItems`++、`receiptStatus` 推导（部分/完成）一致性。
2. 出库 `postOutboundItem`：是否有 `@Transactional`；FIFO 是否按最早批次（`lastInboundTime`/create_time 升序）先扣；扣到 0 是否删行/置 0；`allocationDetail` 记录正确。
3. 手工入库 `manualInbound`：同物料+库位去重累加；幂等。
4. 各 page 查询软删过滤（若实体有 is_deleted 列）。

> 背景：mes-new 周期 2h/2k 已端到端验证过同份后端（curl + MySQL 佐证，结论 FIFO/幂等正确、无暴露 bug）。本周期独立复核即可，**预期无改动**。

- [ ] **Step 2: 记录审查结论**

把结论（每个 ServiceImpl 一行 OK/LATENT/BUG）写进 `mes/vue3/docs/specs/2026-06-22-cycle2a-verify-results.md`。若发现真 bug → 转 Step 3；若无 → 跳到 Step 4。

- [ ] **Step 3:（仅当发现真 bug）最小修正 + Mockito 守卫单测**

- 在对应 ServiceImpl 做最小修正。
- 在 `mes/src/test/java/.../Cycle2aBackendTest.java` 加 JUnit4 + `MockitoJUnitRunner` 守卫单测（对齐同包 `Cycle1*BackendTest` 的 AssertJ 风格）。
- Run: `cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q test -Dtest=Cycle2aBackendTest`
- Expected: BUILD SUCCESS，守卫测试绿。

- [ ] **Step 4: 提交（无论有无后端改动，提交审查结论文档）**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/docs/specs/2026-06-22-cycle2a-verify-results.md mes/src/ 2>/dev/null
git commit -m "🔍 chore(vue3): Cycle 2a 后端审查结论(库存模块)"
```

---

### Task 10: 更新 ROADMAP + 记忆

**Files:**
- Modify: `mes/vue3/docs/ROADMAP.md`（库存矩阵 4 行 → ✅；进度快照加 2a 段）

- [ ] **Step 1: 更新模块覆盖矩阵 9.5 库存**

把 9.5 三行（入库/出库/库存查询·手工入库）状态从 `☐` 改为 `✅`，周期标 `C2·2a`。

- [ ] **Step 2: 在第 11 节进度快照加一条 2a 完成记录**

格式对齐既有条目（参考 1h 段）：分支 `feature/inventory`、四页、复用原语、纯函数 TDD、后端审查结论、门禁数字、人工冒烟前置（跑 `planned-inbound.sql` + `kitting-outbound.sql`）。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/docs/ROADMAP.md
git commit -m "📝 docs(vue3): ROADMAP 标记 2a 库存管理完成"
```

---

## 完成标准（Definition of Done）

- [ ] 四页可路由可访问，菜单 181~184 点得到（需先跑两个 seed SQL）。
- [ ] `pnpm typecheck` 0 / `pnpm test` 全绿 / `pnpm lint:check` 0 err / `pnpm build` ✓。
- [ ] 后端审查结论文档已写；若有 bug 已修 + 守卫单测绿。
- [ ] ROADMAP 库存矩阵 4 行 ✅。
- [ ] 收尾用 `finishing-a-development-branch` 决定 `--no-ff` 合 `develop`（不在本 plan 内执行）。

## 人工冒烟（需用户在 :4200 确认，前置：后端 9090 + 跑两个 seed SQL）

1. `admin/123` 登录 → 侧栏「库存管理」展开四项。
2. 计划入库确认：选入库单 → 右明细 → 某行「登账」→ 选库房（库位下拉显示 空闲/可累加/已占）→ 确认 → 行状态变「已登账」、单据进度 +1。
3. 配套出库确认：选出库单 → 「FIFO 登账」→ 确认框 → 扣减明细出现、状态更新。
4. 库存明细查询：搜物料编码 → 分页 → 数量/状态列正常。
5. 手动入库：填物料/单位/数量 + 选库位 → 入库 → 去库存查询能看到新增/累加。
