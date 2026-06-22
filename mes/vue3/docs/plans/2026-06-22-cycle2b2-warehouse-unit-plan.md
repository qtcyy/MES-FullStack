# Cycle 2b-2 仓库库位 / 加工单元 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付仓库管理（主从：CRUD + 只读库位面板）与加工单元管理（标准 CRUD）两页，并修正后端「无条件重生成库位」隐患。

**Architecture:** 沿用 2b-1 既定模式——纯函数（`utils/*` + vitest TDD）+ api 层 + Element Plus SFC 视图。仓库页复用 `MasterDetailLayout`/`DataTable`/`SearchForm`/`FormDialog`；加工单元页复用 `DataTable`/`FormDialog`。后端在 `SpWarehouseController.addOrUpdate` 抽 `dimensionsChanged` 静态守卫，仅维度实际变化才重建库位，配 Mockito 控制器单测。

**Tech Stack:** Vue 3.5 `<script setup>` + TS + Element Plus + Vitest（前端）；Spring Boot + MyBatis-Plus + JUnit4 + Mockito（后端）。

**约定速查（务必遵守）：**
- 工作目录：前端命令在 `mes/vue3/`；后端命令在 `mes/`（JDK11：`JAVA_HOME=$(/usr/libexec/java_home -v 11)`）。
- git 操作一律 `git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue`，分支 `feature/basedata-warehouse-unit`（已切）。
- 前端测试文件放 `mes/vue3/tests/*.spec.ts`；`@` = `mes/vue3/src`。
- 编码契约：`http.post(url, dto)` = form 编码；`http.post(url, dto, true)` = JSON。warehouse/process-unit 的 `add-or-update`/`delete` 均 `@RequestBody` → **第三参 true（JSON）**；`page` 走 form；`getById`/`list`/`locations` 走 GET。

---

## 文件结构

| 文件 | 责任 | 动作 |
|---|---|---|
| `mes/vue3/src/types/warehouse.ts` | 仓库/库位类型 + 分页请求 | 修改（补 `WarehousePageReq`） |
| `mes/vue3/src/types/processUnit.ts` | 加工单元类型 + 分页请求 | 新建 |
| `mes/vue3/src/utils/warehouse.ts` | 仓库纯函数 | 新建 |
| `mes/vue3/src/utils/processUnit.ts` | 加工单元纯函数 | 新建 |
| `mes/vue3/tests/warehouse.spec.ts` | 仓库纯函数测试 | 新建 |
| `mes/vue3/tests/processUnit.spec.ts` | 加工单元纯函数测试 | 新建 |
| `mes/vue3/src/api/basedata/warehouse.ts` | 仓库 api | 修改（补 page/getById/addOrUpdate/delete） |
| `mes/vue3/src/api/basedata/processUnit.ts` | 加工单元 api | 新建 |
| `mes/vue3/src/views/basedata/warehouse/WarehouseLocations.vue` | 只读库位面板 | 新建 |
| `mes/vue3/src/views/basedata/warehouse/WarehouseFormDialog.vue` | 仓库新增/编辑弹窗 | 新建 |
| `mes/vue3/src/views/basedata/warehouse/WarehousePage.vue` | 仓库主从壳 | 新建 |
| `mes/vue3/src/views/basedata/process-unit/ProcessUnitFormDialog.vue` | 加工单元弹窗 | 新建 |
| `mes/vue3/src/views/basedata/process-unit/ProcessUnitList.vue` | 加工单元列表 | 新建 |
| `mes/vue3/src/router/index.ts` | 路由 | 修改（+2 路由） |
| `mes/vue3/src/utils/urlMap.ts` | 菜单 url → SPA | 修改（+2 映射） |
| `scripts/sql/warehouse-unit-menu-seed.sql` | 菜单种子 | 新建 |
| `mes/src/main/java/.../admin/SpWarehouseController.java` | 库位重生成守卫 + list-ui forward | 修改 |
| `mes/src/test/java/.../basedata/Cycle2b2BackendTest.java` | 守卫单测 | 新建 |

---

## Task 1: 类型定义

**Files:**
- Modify: `mes/vue3/src/types/warehouse.ts`
- Create: `mes/vue3/src/types/processUnit.ts`

- [ ] **Step 1: 给 warehouse.ts 补分页请求类型**

在 `mes/vue3/src/types/warehouse.ts` 顶部加导入、文件末尾加类型（`SpWarehouse`/`SpWarehouseLocation` 已存在，勿动）：

```typescript
// 文件顶部加：
import type { PageReq } from '@/types/system'

// 文件末尾加：
/** 仓库分页请求 */
export interface WarehousePageReq extends PageReq {
  code?: string
  name?: string
}
```

- [ ] **Step 2: 新建 processUnit.ts**

```typescript
// mes/vue3/src/types/processUnit.ts
import type { PageReq } from '@/types/system'

/** 加工单元(sp_process_unit) */
export interface SpProcessUnit {
  id?: string
  code?: string
  name?: string
  type?: string
  /** 是否有线边库:'1' 是 / '0' 否 */
  hasLineWarehouse?: string
  descr?: string
}

export interface ProcessUnitPageReq extends PageReq {
  code?: string
  name?: string
}
```

- [ ] **Step 3: 校验类型可编译**

Run（在 `mes/vue3/`）：`pnpm exec vue-tsc --noEmit -p tsconfig.app.json 2>&1 | head -5`
Expected: 无与本文件相关的报错（视图未建前其它错误属预期，仅确认本文件语法）。
> 若仓库无 `vue-tsc`，用 `pnpm exec tsc --noEmit` 等价命令；以 package.json `typecheck` 脚本为准（见 Task 12）。

- [ ] **Step 4: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/types/warehouse.ts mes/vue3/src/types/processUnit.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "🏷️ feat(vue3): 2b-2 仓库分页请求 + 加工单元类型"
```

---

## Task 2: `utils/warehouse.ts` 纯函数（TDD）

**Files:**
- Create: `mes/vue3/tests/warehouse.spec.ts`
- Create: `mes/vue3/src/utils/warehouse.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// mes/vue3/tests/warehouse.spec.ts
import { describe, it, expect } from 'vitest'
import {
  validateWarehouse,
  buildWarehousePayload,
  locationGridSummary,
  dimensionsChanged,
} from '@/utils/warehouse'

describe('validateWarehouse', () => {
  it('code/name 必填', () => {
    expect(validateWarehouse({ code: '', name: '', groups: 1, rows: 1, layers: 1, columns: 1 })).toContain('库房编码必填')
    expect(validateWarehouse({ code: 'W1', name: '', groups: 1, rows: 1, layers: 1, columns: 1 })).toContain('库房名称必填')
  })
  it('维度须为 ≥1 整数', () => {
    expect(validateWarehouse({ code: 'W1', name: '库', groups: 0, rows: 1, layers: 1, columns: 1 })).toContain('组须为 ≥1 的整数')
    expect(validateWarehouse({ code: 'W1', name: '库', groups: 1, rows: 1, layers: 1, columns: 1.5 })).toContain('列须为 ≥1 的整数')
  })
  it('齐全 → 空数组', () => {
    expect(validateWarehouse({ code: 'W1', name: '库', groups: 2, rows: 3, layers: 2, columns: 4 })).toEqual([])
  })
})

describe('buildWarehousePayload', () => {
  it('维度强制 Number,保留 id,剥空串', () => {
    expect(
      buildWarehousePayload({ id: 'x', code: 'W1', name: '库', type: '', groups: 2, rows: 3, layers: 2, columns: 4, descr: undefined }),
    ).toEqual({ id: 'x', code: 'W1', name: '库', groups: 2, rows: 3, layers: 2, columns: 4 })
  })
  it('字符串维度被规整为 number', () => {
    const p = buildWarehousePayload({ code: 'W1', name: '库', groups: '2' as unknown as number, rows: 1, layers: 1, columns: 1 })
    expect(p.groups).toBe(2)
    expect(typeof p.groups).toBe('number')
  })
})

describe('locationGridSummary', () => {
  it('计算总数与标签', () => {
    expect(locationGridSummary({ groups: 2, rows: 3, layers: 2, columns: 4 })).toEqual({
      total: 48,
      label: '2组 × 3排 × 2层 × 4列 = 48',
    })
  })
  it('缺省维度按 0 处理', () => {
    expect(locationGridSummary({}).total).toBe(0)
  })
})

describe('dimensionsChanged', () => {
  it('新建(无旧记录)→ true', () => {
    expect(dimensionsChanged(null, { groups: 1, rows: 1, layers: 1, columns: 1 })).toBe(true)
  })
  it('维度全等 → false', () => {
    expect(dimensionsChanged({ groups: 2, rows: 3, layers: 2, columns: 4 }, { groups: 2, rows: 3, layers: 2, columns: 4 })).toBe(false)
  })
  it('任一维度不同 → true', () => {
    expect(dimensionsChanged({ groups: 2, rows: 3, layers: 2, columns: 4 }, { groups: 2, rows: 3, layers: 2, columns: 5 })).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run（`mes/vue3/`）：`pnpm exec vitest run tests/warehouse.spec.ts`
Expected: FAIL — 模块 `@/utils/warehouse` 不存在。

- [ ] **Step 3: 写实现**

```typescript
// mes/vue3/src/utils/warehouse.ts
import type { SpWarehouse } from '@/types/warehouse'

/** 仓库维度子集(用于网格汇总 / 变更比对) */
type Dims = Pick<SpWarehouse, 'groups' | 'rows' | 'layers' | 'columns'>

/** 剥去 undefined / null / 空串字段(保留有值字段，含 id) */
function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out as Partial<T>
}

function isPositiveInt(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1
}

export function validateWarehouse(form: Partial<SpWarehouse>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('库房编码必填')
  if (!form.name?.trim()) errs.push('库房名称必填')
  if (!isPositiveInt(form.groups)) errs.push('组须为 ≥1 的整数')
  if (!isPositiveInt(form.rows)) errs.push('排须为 ≥1 的整数')
  if (!isPositiveInt(form.layers)) errs.push('层须为 ≥1 的整数')
  if (!isPositiveInt(form.columns)) errs.push('列须为 ≥1 的整数')
  return errs
}

export function buildWarehousePayload(form: Partial<SpWarehouse>): Partial<SpWarehouse> {
  const out = stripEmpty(form)
  // 维度强制 Number(el-input-number 已给 number，但兼容字符串场景)
  for (const k of ['groups', 'rows', 'layers', 'columns'] as const) {
    if (out[k] !== undefined) out[k] = Number(out[k])
  }
  return out
}

export function locationGridSummary(w: Dims): { total: number; label: string } {
  const g = w.groups ?? 0
  const r = w.rows ?? 0
  const l = w.layers ?? 0
  const c = w.columns ?? 0
  return { total: g * r * l * c, label: `${g}组 × ${r}排 × ${l}层 × ${c}列 = ${g * r * l * c}` }
}

/** 维度是否变化(与后端守卫语义对称)：无旧记录(新建)→ true；任一维度不同 → true */
export function dimensionsChanged(oldW: Dims | null | undefined, next: Dims): boolean {
  if (!oldW) return true
  return (
    oldW.groups !== next.groups ||
    oldW.rows !== next.rows ||
    oldW.layers !== next.layers ||
    oldW.columns !== next.columns
  )
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run：`pnpm exec vitest run tests/warehouse.spec.ts`
Expected: PASS（4 describe，全绿）。

- [ ] **Step 5: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/utils/warehouse.ts mes/vue3/tests/warehouse.spec.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✅ test(vue3): 2b-2 utils/warehouse 纯函数(校验/payload/网格汇总/维度比对)"
```

---

## Task 3: `utils/processUnit.ts` 纯函数（TDD）

**Files:**
- Create: `mes/vue3/tests/processUnit.spec.ts`
- Create: `mes/vue3/src/utils/processUnit.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// mes/vue3/tests/processUnit.spec.ts
import { describe, it, expect } from 'vitest'
import { validateProcessUnit, buildProcessUnitPayload } from '@/utils/processUnit'

describe('validateProcessUnit', () => {
  it('code/name 必填', () => {
    expect(validateProcessUnit({ code: '', name: '' })).toContain('单元代码必填')
    expect(validateProcessUnit({ code: 'U1', name: '' })).toContain('单元名称必填')
  })
  it('齐全 → 空数组', () => {
    expect(validateProcessUnit({ code: 'U1', name: '装配单元' })).toEqual([])
  })
})

describe('buildProcessUnitPayload', () => {
  it('hasLineWarehouse 默认 0、剥空串、保留 id', () => {
    expect(buildProcessUnitPayload({ id: 'x', code: 'U1', name: '装配', type: '', descr: undefined })).toEqual({
      id: 'x',
      code: 'U1',
      name: '装配',
      hasLineWarehouse: '0',
    })
  })
  it('hasLineWarehouse=1 透传', () => {
    const p = buildProcessUnitPayload({ code: 'U1', name: '装配', hasLineWarehouse: '1' })
    expect(p.hasLineWarehouse).toBe('1')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run：`pnpm exec vitest run tests/processUnit.spec.ts`
Expected: FAIL — 模块 `@/utils/processUnit` 不存在。

- [ ] **Step 3: 写实现**

```typescript
// mes/vue3/src/utils/processUnit.ts
import type { SpProcessUnit } from '@/types/processUnit'

function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out as Partial<T>
}

export function validateProcessUnit(form: Partial<SpProcessUnit>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('单元代码必填')
  if (!form.name?.trim()) errs.push('单元名称必填')
  return errs
}

export function buildProcessUnitPayload(form: Partial<SpProcessUnit>): Partial<SpProcessUnit> {
  const out = stripEmpty(form)
  // 开关字段始终显式带上(后端按 '1'/'0' 存)；缺省视为 '0'
  out.hasLineWarehouse = form.hasLineWarehouse === '1' ? '1' : '0'
  return out
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run：`pnpm exec vitest run tests/processUnit.spec.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/utils/processUnit.ts mes/vue3/tests/processUnit.spec.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✅ test(vue3): 2b-2 utils/processUnit 纯函数(校验/payload)"
```

---

## Task 4: api 层

**Files:**
- Modify: `mes/vue3/src/api/basedata/warehouse.ts`
- Create: `mes/vue3/src/api/basedata/processUnit.ts`

- [ ] **Step 1: 扩展 warehouse.ts**

把 `mes/vue3/src/api/basedata/warehouse.ts` 整体替换为（保留既有 `warehouseList`/`warehouseLocations`，新增 4 个）：

```typescript
import { http } from '@/api/request'
import type { SpWarehouse, SpWarehouseLocation, WarehousePageReq } from '@/types/warehouse'
import type { IPage } from '@/types/basedata'

/** 分页(form) */
export const warehousePage = (req: WarehousePageReq) =>
  http.post<IPage<SpWarehouse>>('/basedata/warehouse/page', req)

/** 全部仓库(GET) */
export const warehouseList = () => http.get<SpWarehouse[]>('/basedata/warehouse/list')

/** 单个仓库(GET) */
export const warehouseGetById = (id: string) =>
  http.get<SpWarehouse>(`/basedata/warehouse/${encodeURIComponent(id)}`)

/** 某仓库的库位(GET) */
export const warehouseLocations = (warehouseId: string) =>
  http.get<SpWarehouseLocation[]>(`/basedata/warehouse/locations/${encodeURIComponent(warehouseId)}`)

/** 新增/编辑(JSON @RequestBody) */
export const warehouseAddOrUpdate = (dto: Partial<SpWarehouse>) =>
  http.post<string>('/basedata/warehouse/add-or-update', dto, true)

/** 软删(JSON @RequestBody) */
export const warehouseDelete = (id: string) =>
  http.post<void>('/basedata/warehouse/delete', { id }, true)
```

- [ ] **Step 2: 新建 processUnit.ts**

```typescript
// mes/vue3/src/api/basedata/processUnit.ts
import { http } from '@/api/request'
import type { SpProcessUnit, ProcessUnitPageReq } from '@/types/processUnit'
import type { IPage } from '@/types/basedata'

/** 分页(form) */
export const processUnitPage = (req: ProcessUnitPageReq) =>
  http.post<IPage<SpProcessUnit>>('/basedata/process-unit/page', req)

/** 单个(GET) */
export const processUnitGetById = (id: string) =>
  http.get<SpProcessUnit>(`/basedata/process-unit/${encodeURIComponent(id)}`)

/** 新增/编辑(JSON @RequestBody) */
export const processUnitAddOrUpdate = (dto: Partial<SpProcessUnit>) =>
  http.post<string>('/basedata/process-unit/add-or-update', dto, true)

/** 软删(JSON @RequestBody) */
export const processUnitDelete = (id: string) =>
  http.post<void>('/basedata/process-unit/delete', { id }, true)
```

- [ ] **Step 3: 校验编译**

Run（`mes/vue3/`）：`pnpm typecheck 2>&1 | grep -E "warehouse|processUnit" | head`
Expected: 无 warehouse/processUnit 相关报错（视图未建前其它错误属预期）。

- [ ] **Step 4: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/api/basedata/warehouse.ts mes/vue3/src/api/basedata/processUnit.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 2b-2 仓库/加工单元 api(page/getById/add-or-update/delete)"
```

---

## Task 5: `WarehouseLocations.vue` 只读库位面板

**Files:**
- Create: `mes/vue3/src/views/basedata/warehouse/WarehouseLocations.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <div class="wh-locations">
    <div class="wh-locations__head">
      <span class="wh-locations__title">库位（{{ list.length }}）</span>
      <el-tag type="info" effect="plain">{{ summary.label }}</el-tag>
    </div>

    <el-empty v-if="!loading && list.length === 0" description="暂无库位（保存仓库后自动生成）" />

    <el-table v-else v-loading="loading" :data="list" height="100%" size="small" border>
      <el-table-column prop="code" label="库位编码" min-width="120" />
      <el-table-column prop="groupNo" label="组" width="60" />
      <el-table-column prop="rowNo" label="排" width="60" />
      <el-table-column prop="layerNo" label="层" width="60" />
      <el-table-column prop="colNo" label="列" width="60" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRequest } from '@/composables/useRequest'
import { warehouseLocations } from '@/api/basedata/warehouse'
import { locationGridSummary } from '@/utils/warehouse'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

const props = defineProps<{ warehouse: SpWarehouse }>()

const { data, loading } = useRequest(() => warehouseLocations(props.warehouse.id!), { immediate: true })

const list = computed<SpWarehouseLocation[]>(() => data.value ?? [])
const summary = computed(() => locationGridSummary(props.warehouse))
</script>

<style scoped>
.wh-locations { display: flex; flex-direction: column; height: 100%; gap: 12px; }
.wh-locations__head { display: flex; align-items: center; justify-content: space-between; }
.wh-locations__title { font-weight: 600; }
</style>
```

> 注：`WarehousePage` 会以 `:key="selected.id"` 挂载本组件，故每次切换仓库都重新创建 → `useRequest({immediate:true})` 自动按新 `warehouse.id` 拉取，无需 watch。

- [ ] **Step 2: 校验编译**

Run：`pnpm typecheck 2>&1 | grep -i "WarehouseLocations" | head`
Expected: 无本组件相关报错。

- [ ] **Step 3: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/views/basedata/warehouse/WarehouseLocations.vue
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 2b-2 只读库位面板 WarehouseLocations"
```

---

## Task 6: `WarehouseFormDialog.vue` 仓库弹窗

**Files:**
- Create: `mes/vue3/src/views/basedata/warehouse/WarehouseFormDialog.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑仓库' : '新增仓库'"
    width="640px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="库房编码" prop="code">
            <el-input v-model="form.code" placeholder="如 WH-01" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="库房名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入库房名称" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="库房类型" prop="type">
        <!-- sp_warehouse.type 无对应字典,按自由文本处理 -->
        <el-input v-model="form.type" placeholder="如 零件库 / 产品库" clearable />
      </el-form-item>

      <el-form-item label="库位规格" required>
        <div class="wh-dims">
          <el-form-item prop="groups" label="组" label-width="32px">
            <el-input-number v-model="form.groups" :min="1" :step="1" controls-position="right" />
          </el-form-item>
          <el-form-item prop="rows" label="排" label-width="32px">
            <el-input-number v-model="form.rows" :min="1" :step="1" controls-position="right" />
          </el-form-item>
          <el-form-item prop="layers" label="层" label-width="32px">
            <el-input-number v-model="form.layers" :min="1" :step="1" controls-position="right" />
          </el-form-item>
          <el-form-item prop="columns" label="列" label-width="32px">
            <el-input-number v-model="form.columns" :min="1" :step="1" controls-position="right" />
          </el-form-item>
        </div>
      </el-form-item>

      <el-alert
        v-if="isEdit && dimsWarning"
        type="warning"
        :closable="false"
        show-icon
        title="修改库位规格将重建该仓库全部库位（既有库位编码会重置）"
        class="wh-warn"
      />

      <el-form-item label="描述" prop="descr">
        <el-input v-model="form.descr" type="textarea" :rows="2" placeholder="请输入描述" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { buildWarehousePayload, dimensionsChanged } from '@/utils/warehouse'
import type { SpWarehouse } from '@/types/warehouse'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpWarehouse> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpWarehouse>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

// 记录打开编辑时的原始维度,用于「维度是否改动」提示
const originalDims = ref<Pick<SpWarehouse, 'groups' | 'rows' | 'layers' | 'columns'> | null>(null)

const form = reactive<Partial<SpWarehouse>>({
  id: undefined,
  code: '',
  name: '',
  type: undefined,
  groups: 1,
  rows: 1,
  layers: 1,
  columns: 1,
  descr: undefined,
})

function resetForm() {
  form.id = undefined
  form.code = ''
  form.name = ''
  form.type = undefined
  form.groups = 1
  form.rows = 1
  form.layers = 1
  form.columns = 1
  form.descr = undefined
}

watch(
  () => props.model,
  (val) => {
    if (val) {
      Object.assign(form, { ...val })
      originalDims.value = { groups: val.groups, rows: val.rows, layers: val.layers, columns: val.columns }
    } else {
      resetForm()
      originalDims.value = null
    }
  },
  { immediate: true },
)

const dimsWarning = computed(() =>
  dimensionsChanged(originalDims.value, {
    groups: form.groups,
    rows: form.rows,
    layers: form.layers,
    columns: form.columns,
  }),
)

const rules: FormRules = {
  code: [{ required: true, message: '请输入库房编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入库房名称', trigger: 'blur' }],
  groups: [{ required: true, message: '请输入组数', trigger: 'change' }],
  rows: [{ required: true, message: '请输入排数', trigger: 'change' }],
  layers: [{ required: true, message: '请输入层数', trigger: 'change' }],
  columns: [{ required: true, message: '请输入列数', trigger: 'change' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildWarehousePayload({ ...form }))
}
</script>

<style scoped>
.wh-dims { display: flex; gap: 8px; flex-wrap: wrap; }
.wh-dims :deep(.el-input-number) { width: 110px; }
.wh-warn { margin-bottom: 16px; }
</style>
```

- [ ] **Step 2: 校验编译**

Run：`pnpm typecheck 2>&1 | grep -i "WarehouseFormDialog" | head`
Expected: 无本组件相关报错。

- [ ] **Step 3: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/views/basedata/warehouse/WarehouseFormDialog.vue
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 2b-2 仓库新增/编辑弹窗(维度改动重建警示)"
```

---

## Task 7: `WarehousePage.vue` 主从壳

**Files:**
- Create: `mes/vue3/src/views/basedata/warehouse/WarehousePage.vue`

- [ ] **Step 1: 写组件**（结构对齐 `DeviceGroupPage.vue`，右侧换成只读库位面板）

```vue
<template>
  <PageContainer title="仓库管理">
    <MasterDetailLayout :has-selection="!!selected?.id">
      <template #master>
        <DataTable
          :data="tableData"
          :loading="loading"
          :columns="columns"
          :pager="pager"
          @row-click="select"
          @page-change="handlePageChange"
          @size-change="handleSizeChange"
        >
          <template #toolbar>
            <el-input v-model="search.code" placeholder="库房编码" clearable class="qbox" @keyup.enter="handleSearch" />
            <el-input v-model="search.name" placeholder="库房名称" clearable class="qbox" @keyup.enter="handleSearch" />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-button v-permission="'warehouse:add'" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
          </template>

          <template #spec="{ row }">
            {{ (row as SpWarehouse).groups }}×{{ (row as SpWarehouse).rows }}×{{ (row as SpWarehouse).layers }}×{{ (row as SpWarehouse).columns }}
          </template>

          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="openEdit(row as SpWarehouse)">编辑</el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row as SpWarehouse)">删除</el-button>
          </template>
        </DataTable>
      </template>

      <template #detail>
        <WarehouseLocations v-if="selected?.id" :key="selected.id" :warehouse="selected" />
      </template>
      <template #detail-empty>
        <el-empty description="请选择左侧仓库查看库位" />
      </template>
    </MasterDetailLayout>

    <WarehouseFormDialog
      v-model="dialogVisible"
      :model="editingModel"
      :loading="submitLoading"
      @submit="handleFormSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import WarehouseFormDialog from './WarehouseFormDialog.vue'
import WarehouseLocations from './WarehouseLocations.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { warehousePage, warehouseAddOrUpdate, warehouseDelete } from '@/api/basedata/warehouse'
import type { SpWarehouse } from '@/types/warehouse'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })
const selected = ref<SpWarehouse | null>(null)

const { data: pageData, loading, run } = useRequest(
  () => warehousePage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpWarehouse[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

// 列表刷新后,若选中仓库已不在行集中,清空选中(避免陈旧引用)
watch(tableData, (rows) => {
  if (selected.value && !rows.some((r) => r.id === selected.value!.id)) {
    selected.value = null
  }
})

const columns: Column[] = [
  { prop: 'code', label: '库房编码', width: 130 },
  { prop: 'name', label: '库房名称', minWidth: 140 },
  { prop: 'type', label: '类型', width: 120 },
  { prop: 'spec', label: '规格(组×排×层×列)', minWidth: 160 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpWarehouse> | null>(null)
const submitLoading = ref(false)

function select(row: SpWarehouse) {
  selected.value = row
}
function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpWarehouse) {
  editingModel.value = { ...row }
  dialogVisible.value = true
}

function handlePageChange(page: number) {
  pager.current = page
  run()
}
function handleSizeChange(size: number) {
  pager.size = size
  reset()
  run()
}
function handleSearch() {
  reset()
  run()
}
function handleReset() {
  search.code = ''
  search.name = ''
  reset()
  run()
}

async function handleFormSubmit(dto: Partial<SpWarehouse>) {
  submitLoading.value = true
  try {
    await warehouseAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    // 若编辑的是当前选中仓库,刷新右侧库位:先置空再由列表刷新后重选
    const editedId = dto.id
    run()
    if (editedId && selected.value?.id === editedId) {
      // 维度可能变化 → 重挂库位面板(selected 引用变化触发 :key 重建)
      selected.value = { ...(selected.value as SpWarehouse), ...(dto as SpWarehouse) }
    }
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpWarehouse) {
  try {
    await ElMessageBox.confirm(`确认删除仓库「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await warehouseDelete(row.id!)
    ElMessage.success('删除成功')
    if (selected.value?.id === row.id) selected.value = null
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>

<style scoped>
.qbox { width: 150px; }
</style>
```

> **DataTable 自定义列校验**：本页用 `#spec` 具名插槽渲染 `spec` 列。先确认 `DataTable.vue` 支持「以 `column.prop` 为名的具名插槽」。若不支持，改为在 `columns` 用 formatter/render，或回退为四个独立列 `groups/rows/layers/columns`。实现时 Read `mes/vue3/src/components/DataTable.vue` 确认插槽契约后再定。

- [ ] **Step 2: 确认 DataTable 插槽契约**

Run：`grep -nE "slot|formatter|render|#\\{" mes/vue3/src/components/DataTable.vue | head -20`
据结果决定 `spec` 列渲染方式（具名插槽 / formatter / 拆四列）。若不支持具名列插槽，按上面回退方案改 `columns` 与模板。

- [ ] **Step 3: 校验编译**

Run：`pnpm typecheck 2>&1 | grep -i "WarehousePage" | head`
Expected: 无本组件相关报错。

- [ ] **Step 4: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/views/basedata/warehouse/WarehousePage.vue
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 2b-2 仓库管理主从页(列表 CRUD + 只读库位面板)"
```

---

## Task 8: 加工单元 列表 + 弹窗

**Files:**
- Create: `mes/vue3/src/views/basedata/process-unit/ProcessUnitFormDialog.vue`
- Create: `mes/vue3/src/views/basedata/process-unit/ProcessUnitList.vue`

- [ ] **Step 1: 写弹窗组件**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑加工单元' : '新增加工单元'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="单元代码" prop="code">
            <el-input v-model="form.code" placeholder="如 PU-01" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="单元名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入单元名称" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="单元类型" prop="type">
        <!-- sp_process_unit.type 无对应字典,按自由文本处理 -->
        <el-input v-model="form.type" placeholder="如 人员作业单元 / 设备作业单元" clearable />
      </el-form-item>

      <el-form-item label="是否有线边库" prop="hasLineWarehouse">
        <el-switch v-model="form.hasLineWarehouse" active-value="1" inactive-value="0" />
      </el-form-item>

      <el-form-item label="描述" prop="descr">
        <el-input v-model="form.descr" type="textarea" :rows="2" placeholder="请输入描述" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { buildProcessUnitPayload } from '@/utils/processUnit'
import type { SpProcessUnit } from '@/types/processUnit'

const props = defineProps<{
  modelValue: boolean
  model: Partial<SpProcessUnit> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpProcessUnit>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const form = reactive<Partial<SpProcessUnit>>({
  id: undefined,
  code: '',
  name: '',
  type: undefined,
  hasLineWarehouse: '0',
  descr: undefined,
})

function resetForm() {
  form.id = undefined
  form.code = ''
  form.name = ''
  form.type = undefined
  form.hasLineWarehouse = '0'
  form.descr = undefined
}

watch(
  () => props.model,
  (val) => {
    if (val) Object.assign(form, { hasLineWarehouse: '0', ...val })
    else resetForm()
  },
  { immediate: true },
)

const rules: FormRules = {
  code: [{ required: true, message: '请输入单元代码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入单元名称', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildProcessUnitPayload({ ...form }))
}
</script>
```

- [ ] **Step 2: 写列表组件**（结构对齐 `DeviceList.vue`）

```vue
<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="单元代码">
        <el-input v-model="search.code" placeholder="请输入单元代码" clearable />
      </el-form-item>
      <el-form-item label="单元名称">
        <el-input v-model="search.name" placeholder="请输入单元名称" clearable />
      </el-form-item>
    </SearchForm>

    <DataTable
      :data="tableData"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <template #toolbar>
        <el-button v-permission="'process-unit:add'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <template #hasLineWarehouse="{ row }">
        <el-tag :type="(row as SpProcessUnit).hasLineWarehouse === '1' ? 'success' : 'info'" effect="plain">
          {{ (row as SpProcessUnit).hasLineWarehouse === '1' ? '是' : '否' }}
        </el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpProcessUnit)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpProcessUnit)">删除</el-button>
      </template>
    </DataTable>

    <ProcessUnitFormDialog
      v-model="dialogVisible"
      :model="editingModel"
      :loading="submitLoading"
      @submit="handleFormSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ProcessUnitFormDialog from './ProcessUnitFormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { processUnitPage, processUnitAddOrUpdate, processUnitDelete } from '@/api/basedata/processUnit'
import type { SpProcessUnit } from '@/types/processUnit'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })

const { data: pageData, loading, run } = useRequest(
  () => processUnitPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpProcessUnit[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'code', label: '单元代码', width: 140 },
  { prop: 'name', label: '单元名称', minWidth: 160 },
  { prop: 'type', label: '类型', minWidth: 140 },
  { prop: 'hasLineWarehouse', label: '线边库', width: 90 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpProcessUnit> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpProcessUnit) {
  editingModel.value = { ...row }
  dialogVisible.value = true
}

function handlePageChange(page: number) {
  pager.current = page
  run()
}
function handleSizeChange(size: number) {
  pager.size = size
  reset()
  run()
}
function handleSearch() {
  reset()
  run()
}
function handleReset() {
  search.code = ''
  search.name = ''
  reset()
  run()
}

async function handleFormSubmit(dto: Partial<SpProcessUnit>) {
  submitLoading.value = true
  try {
    await processUnitAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpProcessUnit) {
  try {
    await ElMessageBox.confirm(`确认删除加工单元「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await processUnitDelete(row.id!)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
```

> 同 Task 7 注：`hasLineWarehouse` 列用具名插槽渲染标签；若 `DataTable` 不支持以 prop 为名的具名插槽，改用 formatter（Read DataTable.vue 后定）。

- [ ] **Step 3: 校验编译**

Run：`pnpm typecheck 2>&1 | grep -i "ProcessUnit" | head`
Expected: 无 ProcessUnit 相关报错。

- [ ] **Step 4: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/views/basedata/process-unit/
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✨ feat(vue3): 2b-2 加工单元管理(列表 CRUD + 弹窗/线边库开关)"
```

---

## Task 9: 路由 + urlMap 接线

**Files:**
- Modify: `mes/vue3/src/router/index.ts`
- Modify: `mes/vue3/src/utils/urlMap.ts`

- [ ] **Step 1: 加路由**

在 `mes/vue3/src/router/index.ts` 的 `basedata/device-group` 路由块之后插入：

```typescript
      {
        path: 'basedata/warehouse',
        name: 'basedata-warehouse',
        component: () => import('@/views/basedata/warehouse/WarehousePage.vue'),
        meta: { title: '仓库管理', perm: 'warehouse:add' },
      },
      {
        path: 'basedata/process-unit',
        name: 'basedata-process-unit',
        component: () => import('@/views/basedata/process-unit/ProcessUnitList.vue'),
        meta: { title: '加工单元', perm: 'process-unit:add' },
      },
```

- [ ] **Step 2: 加 urlMap**

在 `mes/vue3/src/utils/urlMap.ts` 的 `URL_MAP` 中，`'/basedata/device-group/list-ui'` 行之后插入：

```typescript
  '/basedata/warehouse/list-ui': '/basedata/warehouse',
  '/basedata/process-unit/list-ui': '/basedata/process-unit',
```

- [ ] **Step 3: 校验编译**

Run：`pnpm typecheck 2>&1 | tail -5`
Expected: 0 errors（此时全部视图已建，应整体通过）。

- [ ] **Step 4: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/vue3/src/router/index.ts mes/vue3/src/utils/urlMap.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "🔧 feat(vue3): 2b-2 仓库/加工单元 路由 + urlMap 接线"
```

---

## Task 10: 菜单种子 SQL

**Files:**
- Create: `scripts/sql/warehouse-unit-menu-seed.sql`

> **实现前先实测 DB**（如 2b-1 发现 108/111「已存在但错挂」）。若后端 9090 + DB 可达，先查：
> `SELECT id,code,name,url,parent_id,permission FROM sp_sys_menu WHERE url IN ('/basedata/warehouse/list-ui','/basedata/process-unit/list-ui') OR name IN ('仓库管理','加工单元','加工单元管理');`
> 据结果调整：已存在 → 改 RE-PARENT；`url`/`name` 被占 → 移除对应 INSERT 避免撞 `UNIQUE`。下方为「均不存在」的默认种子；permission 字符串与 router `meta.perm`（`warehouse:add`/`process-unit:add`）保持一致。

- [ ] **Step 1: 写种子脚本**

```sql
-- Cycle 2b-2 菜单种子:仓库管理 / 加工单元(统一挂在组 13 物料管理下)
-- 幂等 + 需手动执行。id/url/name 三守卫,避免 UNIQUE(name)/UNIQUE(url) 碰撞。
-- 实现前请实测 mes_data:若菜单已存在(url/name 被占),改为 RE-PARENT 既有行而非 INSERT。

-- 1) 仓库管理:url/id 双守卫新增(id=133,若被占用请实现时换号)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '133', 'warehouseDef', '仓库管理', '/basedata/warehouse/list-ui', '13', '3', 3, '0', 'warehouse:add', 'fa-database', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM sp_sys_menu WHERE id = '133' OR url = '/basedata/warehouse/list-ui'
);

-- 2) 加工单元:url/id 双守卫新增(id=134,若被占用请实现时换号)
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '134', 'processUnitDef', '加工单元', '/basedata/process-unit/list-ui', '13', '3', 4, '0', 'process-unit:add', 'fa-cogs', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM sp_sys_menu WHERE id = '134' OR url = '/basedata/process-unit/list-ui'
);

-- 3) 若上述菜单已存在但错挂他组,统一重挂到组 13(仅改 parent_id,幂等)
UPDATE sp_sys_menu SET parent_id = '13'
WHERE url IN ('/basedata/warehouse/list-ui', '/basedata/process-unit/list-ui') AND parent_id <> '13';
```

- [ ] **Step 2: 语法自检**

Run：`grep -c "INSERT INTO sp_sys_menu" scripts/sql/warehouse-unit-menu-seed.sql`
Expected: `2`

- [ ] **Step 3: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add scripts/sql/warehouse-unit-menu-seed.sql
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "🌱 chore(vue3): 2b-2 菜单种子(组13:仓库管理/加工单元)"
```

---

## Task 11: 后端库位重生成守卫 + list-ui forward（TDD）

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/controller/admin/SpWarehouseController.java`
- Create: `mes/src/test/java/com/wangziyang/mes/basedata/Cycle2b2BackendTest.java`

**先决：JDK11 环境**
Run（`mes/`）：`export JAVA_HOME=$(/usr/libexec/java_home -v 11) && java -version 2>&1 | head -1`
Expected: 显示 11.x。

- [ ] **Step 1: 写失败测试**

```java
// mes/src/test/java/com/wangziyang/mes/basedata/Cycle2b2BackendTest.java
package com.wangziyang.mes.basedata;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.controller.admin.SpWarehouseController;
import com.wangziyang.mes.basedata.entity.SpWarehouse;
import com.wangziyang.mes.basedata.entity.SpWarehouseLocation;
import com.wangziyang.mes.basedata.service.ISpWarehouseLocationService;
import com.wangziyang.mes.basedata.service.ISpWarehouseService;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 仓库库位重生成守卫 Mockito 单元测试 (Cycle 2b-2)
 *
 * addOrUpdate 应仅在「新建」或「维度(groups/rows/layers/columns)实际变化」时
 * 才重建库位(spWarehouseLocationService.remove);仅改名等不应触发重建,
 * 以免库位 id 全变、孤儿化 2a 库存的 location_id 引用。
 */
@RunWith(MockitoJUnitRunner.class)
public class Cycle2b2BackendTest {

    @Mock
    private ISpWarehouseService spWarehouseService;

    @Mock
    private ISpWarehouseLocationService spWarehouseLocationService;

    @InjectMocks
    private SpWarehouseController controller;

    private SpWarehouse warehouse(String id, int g, int r, int l, int c) {
        SpWarehouse w = new SpWarehouse();
        w.setId(id);
        w.setCode("W1");
        w.setName("库");
        w.setGroups(g);
        w.setRows(r);
        w.setLayers(l);
        w.setColumns(c);
        return w;
    }

    /** 新建(getById 返回 null)→ 重建库位 1 次 */
    @Test
    public void create_regeneratesLocations() {
        SpWarehouse rec = warehouse("w1", 1, 1, 1, 1);
        when(spWarehouseService.getById("w1")).thenReturn(null);

        controller.addOrUpdate(rec);

        verify(spWarehouseLocationService, times(1)).remove(any(QueryWrapper.class));
        verify(spWarehouseLocationService, atLeastOnce()).save(any(SpWarehouseLocation.class));
    }

    /** 编辑仅改名(维度不变)→ 不重建库位 */
    @Test
    public void edit_sameDimensions_skipsRegenerate() {
        SpWarehouse old = warehouse("w1", 2, 3, 2, 4);
        SpWarehouse rec = warehouse("w1", 2, 3, 2, 4);
        rec.setName("新名字");
        when(spWarehouseService.getById("w1")).thenReturn(old);

        controller.addOrUpdate(rec);

        verify(spWarehouseLocationService, never()).remove(any(QueryWrapper.class));
        verify(spWarehouseLocationService, never()).save(any(SpWarehouseLocation.class));
    }

    /** 编辑改维度 → 重建库位 1 次 */
    @Test
    public void edit_changedDimensions_regenerates() {
        SpWarehouse old = warehouse("w1", 2, 3, 2, 4);
        SpWarehouse rec = warehouse("w1", 2, 3, 2, 5); // columns 4→5
        when(spWarehouseService.getById("w1")).thenReturn(old);

        controller.addOrUpdate(rec);

        verify(spWarehouseLocationService, times(1)).remove(any(QueryWrapper.class));
        verify(spWarehouseLocationService, atLeastOnce()).save(any(SpWarehouseLocation.class));
    }
}
```

- [ ] **Step 2: 运行测试，确认失败**

Run（`mes/`）：`export JAVA_HOME=$(/usr/libexec/java_home -v 11) && mvn -q -Dtest=Cycle2b2BackendTest test 2>&1 | tail -25`
Expected: FAIL —— `edit_sameDimensions_skipsRegenerate` 失败（当前 `addOrUpdate` 无条件 `remove`，故 `never()` 断言不成立）。

- [ ] **Step 3: 改控制器（加维度守卫 + list-ui forward）**

编辑 `SpWarehouseController.java`：

(a) `addOrUpdate` 改为先取旧维度，仅变化才重建：

```java
    @PostMapping("/add-or-update")
    @ResponseBody
    @Transactional(rollbackFor = Exception.class)
    public Result addOrUpdate(@RequestBody SpWarehouse record) {
        // 取旧记录维度,判断库位是否需要重建(避免改名等也重建 → 库位 id 全变孤儿化 2a 库存引用)
        SpWarehouse old = record.getId() == null ? null : spWarehouseService.getById(record.getId());
        spWarehouseService.saveOrUpdate(record);
        if (dimensionsChanged(old, record)) {
            regenerateLocations(record.getId(), record.getGroups(), record.getRows(), record.getLayers(), record.getColumns());
        }
        return Result.success(record.getId());
    }

    /** 维度是否变化:无旧记录(新建)→ true;groups/rows/layers/columns 任一不同 → true */
    private boolean dimensionsChanged(SpWarehouse old, SpWarehouse next) {
        if (old == null) {
            return true;
        }
        return !java.util.Objects.equals(old.getGroups(), next.getGroups())
                || !java.util.Objects.equals(old.getRows(), next.getRows())
                || !java.util.Objects.equals(old.getLayers(), next.getLayers())
                || !java.util.Objects.equals(old.getColumns(), next.getColumns());
    }
```

(b) 在类中加 `list-ui` forward（与 process-unit 对齐，放在 `page` 方法之前）：

```java
    @GetMapping("/list-ui")
    public String listUI() {
        return "forward:/index.html";
    }
```

> 注意：`listUI` 返回 `String` 视图名，故该方法**不要**加 `@ResponseBody`；类上的 `@Controller` 已满足。其余 `@ResponseBody` 方法不动。`regenerateLocations` 私有方法保持原样。

- [ ] **Step 4: 运行测试，确认通过**

Run（`mes/`）：`export JAVA_HOME=$(/usr/libexec/java_home -v 11) && mvn -q -Dtest=Cycle2b2BackendTest test 2>&1 | tail -15`
Expected: PASS（3 个测试全绿）。

- [ ] **Step 5: 后端整体编译**

Run（`mes/`）：`export JAVA_HOME=$(/usr/libexec/java_home -v 11) && mvn -q -DskipTests compile 2>&1 | tail -5`
Expected: BUILD SUCCESS。

- [ ] **Step 6: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add mes/src/main/java/com/wangziyang/mes/basedata/controller/admin/SpWarehouseController.java mes/src/test/java/com/wangziyang/mes/basedata/Cycle2b2BackendTest.java
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "🐛 fix(backend): 2b-2 仓库仅维度变化才重建库位(防孤儿化库存引用)+ list-ui forward + 守卫单测"
```

---

## Task 12: 全门禁

**Files:** 无（验证）

- [ ] **Step 1: 前端 typecheck**

Run（`mes/vue3/`）：`pnpm typecheck`
Expected: 0 errors。

- [ ] **Step 2: 前端全量测试**

Run（`mes/vue3/`）：`pnpm test`
Expected: 全绿，较 2b-1 的 267 例 +~12（warehouse + processUnit）。

- [ ] **Step 3: 前端 lint**

Run（`mes/vue3/`）：`pnpm lint`
Expected: 0 error（既有 warn 不增）。

- [ ] **Step 4: 前端 build**

Run（`mes/vue3/`）：`pnpm build`
Expected: 成功产出。

- [ ] **Step 5: 后端编译 + 单测**

Run（`mes/`）：`export JAVA_HOME=$(/usr/libexec/java_home -v 11) && mvn -q -DskipTests compile && mvn -q -Dtest=Cycle2b2BackendTest test 2>&1 | tail -8`
Expected: BUILD SUCCESS + 3 测试绿。

- [ ] **Step 6: 提交门禁结论**（若上述步骤有任何为修复门禁产生的改动）

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue add -A
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue commit -m "✅ test(vue3): 2b-2 门禁全绿(typecheck/test/lint/build + 后端编译/守卫单测)"
```

---

## 收尾（实现完成后，单独执行，不在本 plan 自动做）

- 更新 `ROADMAP.md`：§8 Cycle 2 段 + §9.2 矩阵（仓库/加工单元 → ✅）+ §11 进度快照，补 2b-2 完成条目（沿用 2b-1 行文密度）。
- subagent 驱动逐任务两阶段审查 + opus 终审「Ready to merge」。
- `feature/basedata-warehouse-unit` `--no-ff` 合 `develop`。
- 人工 :4200 冒烟（需后端 9090 + DB 建表 + 跑 `warehouse-unit-menu-seed.sql`）。

---

## 自审清单（plan 作者已核对）

- **Spec 覆盖**：仓库主从（T5/6/7）、加工单元 CRUD（T8）、后端守卫+forward（T11）、菜单种子（T10）、urlMap/router（T9）、纯函数 TDD（T2/3）、类型（T1）、门禁（T12）——全部 spec 章节有对应任务。teams 面板按 spec 明确不做。
- **占位符**：无 TBD/TODO；每个改码步骤含完整代码。
- **类型一致**：`SpWarehouse`/`SpWarehouseLocation`/`WarehousePageReq`/`SpProcessUnit`/`ProcessUnitPageReq` 跨任务命名一致；`dimensionsChanged`/`buildWarehousePayload`/`locationGridSummary`/`validateWarehouse`/`buildProcessUnitPayload`/`validateProcessUnit` 在 utils 定义并在视图/测试一致引用；后端 `dimensionsChanged` 私有方法签名与调用一致。
- **已知实现期待定点**（非占位符，是需实测的真实分支）：① DataTable 具名列插槽契约（T7 Step2 / T8 注）② 菜单 id/url/name 实测（T10 注）—— 均给出回退方案。
