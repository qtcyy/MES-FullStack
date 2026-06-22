# Cycle 2b-1（设备 / 零部件 / 设备编组）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mes/vue3` 交付设备维护、零部件维护、设备编组（主从）三页，沉淀无序双列穿梭组件 `DualListTransfer`，对接后端已存在端点（默认零后端改动，软删审查暴露真 bug 才最小修复）。

**Architecture:** 三页一分支 `feature/basedata-device`。纯函数 `utils/device.ts`（TDD，`tests/device.spec.ts`）承载 payload 构建/校验/成员 diff；API 层 `api/basedata/{device,component,deviceGroup}.ts` 按端点 form/JSON 编码对接；视图复用现有 `DataTable`/`FormDialog`/`MasterDetailLayout`/`PageContainer`/`SearchForm` 原语 + 新建 `DualListTransfer.vue`；菜单 seed + urlMap + router 接线。

**Tech Stack:** Vue 3.5 `<script setup>` + TS + Element Plus + Vitest；后端 Spring Boot + MyBatis-Plus（JDK11 系统 mvn，见 [[backend-build-mvnw-broken]]）。

---

## File Structure

**前端新建：**
- `src/types/basedata.ts`（追加 `SpDevice`/`SpComponent`/`SpDeviceGroup` + 3 个 `*PageReq`）
- `src/api/basedata/device.ts`、`component.ts`、`deviceGroup.ts`
- `src/utils/device.ts` + `tests/device.spec.ts`
- `src/components/DualListTransfer.vue`
- `src/views/basedata/device/DeviceList.vue` + `DeviceForm.vue`
- `src/views/basedata/component/ComponentList.vue` + `ComponentForm.vue`
- `src/views/basedata/device-group/DeviceGroupPage.vue` + `DeviceGroupForm.vue` + `DeviceGroupMembers.vue`

**前端修改：**
- `src/utils/urlMap.ts`（+3 条）
- `src/router/index.ts`（+3 路由）

**SQL 新建：**
- `scripts/sql/device-menu-seed.sql`（幂等，组 13 下补 132/133/134）

**后端（仅审查暴露真 bug 才改）：**
- `SpDeviceController` / `SpComponentController` / `SpDeviceGroupController` 或对应 ServiceImpl
- 守卫单测置于既有后端测试包

---

## Task 1: 类型层（SpDevice / SpComponent / SpDeviceGroup）

**Files:**
- Modify: `mes/vue3/src/types/basedata.ts`（文件末尾追加）

- [ ] **Step 1: 追加类型**

在 `src/types/basedata.ts` 末尾追加（`PageReq`/`IPage` 已在文件头 import）：

```typescript
/** 设备(sp_device) */
export interface SpDevice {
  id?: string
  code?: string
  name?: string
  type?: string
  model?: string
  specs?: string
  location?: string
  status?: string
  descr?: string
  // lineId 后端存在但本周期不在前端暴露(sp_line 无 list 接口)
}
export interface DevicePageReq extends PageReq {
  code?: string
  name?: string
}

/** 零部件(sp_component) */
export interface SpComponent {
  id?: string
  code?: string
  name?: string
  descr?: string
}
export interface ComponentPageReq extends PageReq {
  code?: string
  name?: string
}

/** 设备编组(sp_device_group) */
export interface SpDeviceGroup {
  id?: string
  code?: string
  name?: string
  descr?: string
}
export interface DeviceGroupPageReq extends PageReq {
  code?: string
  name?: string
}
```

- [ ] **Step 2: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 errors（仅新增类型，无消费方）

- [ ] **Step 3: Commit**

```bash
cd mes/vue3 && git add src/types/basedata.ts
git commit -m "🏷️ feat(vue3): 2b-1 设备/零部件/编组类型定义"
```

---

## Task 2: API 层（device / component / deviceGroup）

**Files:**
- Create: `mes/vue3/src/api/basedata/device.ts`
- Create: `mes/vue3/src/api/basedata/component.ts`
- Create: `mes/vue3/src/api/basedata/deviceGroup.ts`

> **编码约定（已勘探后端 @RequestBody）：** page 一律 form；device/deviceGroup 的 add-or-update + delete 走 **JSON**（`http.post(url,data,true)`）；**component 的 add-or-update 走 form**（后端无 @RequestBody），component delete 走 JSON；device-group 的 items/add、items/remove 走 JSON。

- [ ] **Step 1: device.ts**

```typescript
import { http } from '@/api/request'
import type { SpDevice, DevicePageReq, IPage } from '@/types/basedata'

export const devicePage = (req: DevicePageReq) =>
  http.post<IPage<SpDevice>>('/basedata/device/page', req)

export const deviceGetById = (id: string) =>
  http.get<SpDevice>(`/basedata/device/${encodeURIComponent(id)}`)

/** 新增/编辑(后端 @RequestBody → JSON) */
export const deviceAddOrUpdate = (dto: Partial<SpDevice>) =>
  http.post<string>('/basedata/device/add-or-update', dto, true)

/** 删除(后端 @RequestBody Map → JSON) */
export const deviceDelete = (id: string) =>
  http.post<void>('/basedata/device/delete', { id }, true)
```

- [ ] **Step 2: component.ts**

```typescript
import { http } from '@/api/request'
import type { SpComponent, ComponentPageReq, IPage } from '@/types/basedata'

export const componentPage = (req: ComponentPageReq) =>
  http.post<IPage<SpComponent>>('/basedata/component/page', req)

/** 新增/编辑(后端无 @RequestBody → form 编码) */
export const componentAddOrUpdate = (dto: Partial<SpComponent>) =>
  http.post<string>('/basedata/component/add-or-update', dto)

/** 删除(后端 @RequestBody Map → JSON) */
export const componentDelete = (id: string) =>
  http.post<void>('/basedata/component/delete', { id }, true)
```

- [ ] **Step 3: deviceGroup.ts**

```typescript
import { http } from '@/api/request'
import type { SpDeviceGroup, DeviceGroupPageReq, SpDevice, IPage } from '@/types/basedata'

export const deviceGroupPage = (req: DeviceGroupPageReq) =>
  http.post<IPage<SpDeviceGroup>>('/basedata/device-group/page', req)

export const deviceGroupGetById = (id: string) =>
  http.get<SpDeviceGroup>(`/basedata/device-group/${encodeURIComponent(id)}`)

export const deviceGroupAddOrUpdate = (dto: Partial<SpDeviceGroup>) =>
  http.post<string>('/basedata/device-group/add-or-update', dto, true)

export const deviceGroupDelete = (id: string) =>
  http.post<void>('/basedata/device-group/delete', { id }, true)

/** 组成员设备(GET) */
export const deviceGroupItems = (groupId: string) =>
  http.get<SpDevice[]>(`/basedata/device-group/items/${encodeURIComponent(groupId)}`)

/** 批量加入成员(JSON) */
export const deviceGroupItemsAdd = (groupId: string, deviceIds: string[]) =>
  http.post<void>('/basedata/device-group/items/add', { groupId, deviceIds }, true)

/** 移除单个成员(JSON) */
export const deviceGroupItemsRemove = (groupId: string, deviceId: string) =>
  http.post<void>('/basedata/device-group/items/remove', { groupId, deviceId }, true)
```

- [ ] **Step 4: typecheck + commit**

Run: `cd mes/vue3 && pnpm typecheck`（0 errors）

```bash
cd mes/vue3 && git add src/api/basedata/device.ts src/api/basedata/component.ts src/api/basedata/deviceGroup.ts
git commit -m "✨ feat(vue3): 2b-1 设备/零部件/编组 API 层(form/JSON 编码就位)"
```

---

## Task 3: 纯函数 `utils/device.ts`（TDD）

**Files:**
- Test: `mes/vue3/tests/device.spec.ts`
- Create: `mes/vue3/src/utils/device.ts`

- [ ] **Step 1: 写失败测试 `tests/device.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import {
  validateDevice,
  buildDevicePayload,
  validateComponent,
  buildComponentPayload,
  validateGroup,
  buildGroupPayload,
  excludeSelected,
  diffMembers,
  deviceToTransferItem,
} from '@/utils/device'

describe('validateDevice', () => {
  it('code/name 必填', () => {
    expect(validateDevice({ code: '', name: '' })).toContain('设备编码必填')
    expect(validateDevice({ code: 'D1', name: '' })).toContain('设备名称必填')
  })
  it('齐全 → 空数组', () => {
    expect(validateDevice({ code: 'D1', name: '车床' })).toEqual([])
  })
})

describe('buildDevicePayload', () => {
  it('剥空串字段、保留 id', () => {
    expect(buildDevicePayload({ id: 'x', code: 'D1', name: '车床', model: '', specs: undefined })).toEqual({
      id: 'x',
      code: 'D1',
      name: '车床',
    })
  })
  it('无 id 不带 id 键', () => {
    expect(buildDevicePayload({ code: 'D1', name: '车床' })).toEqual({ code: 'D1', name: '车床' })
  })
})

describe('validateComponent', () => {
  it('code/name 必填', () => {
    expect(validateComponent({ code: '', name: 'x' })).toContain('零部件编码必填')
    expect(validateComponent({ code: 'C1', name: '' })).toContain('零部件名称必填')
  })
  it('齐全 → 空数组', () => expect(validateComponent({ code: 'C1', name: '螺栓' })).toEqual([]))
})

describe('buildComponentPayload', () => {
  it('剥空串、保留 id', () =>
    expect(buildComponentPayload({ id: 'c', code: 'C1', name: '螺栓', descr: '' })).toEqual({
      id: 'c',
      code: 'C1',
      name: '螺栓',
    }))
})

describe('validateGroup', () => {
  it('code/name 必填', () => {
    expect(validateGroup({ code: '', name: 'g' })).toContain('编组编码必填')
    expect(validateGroup({ code: 'G1', name: '' })).toContain('编组名称必填')
  })
  it('齐全 → 空数组', () => expect(validateGroup({ code: 'G1', name: '组1' })).toEqual([]))
})

describe('buildGroupPayload', () => {
  it('剥空串、保留 id', () =>
    expect(buildGroupPayload({ id: 'g', code: 'G1', name: '组1', descr: '' })).toEqual({
      id: 'g',
      code: 'G1',
      name: '组1',
    }))
})

describe('excludeSelected', () => {
  it('剔除已选 id', () => {
    const all = [{ id: '1' }, { id: '2' }, { id: '3' }]
    expect(excludeSelected(all, new Set(['2'])).map((d) => d.id)).toEqual(['1', '3'])
  })
})

describe('diffMembers', () => {
  it('计算新增与移除', () => {
    expect(diffMembers(['a', 'b'], ['b', 'c'])).toEqual({ added: ['c'], removed: ['a'] })
  })
  it('无变化 → 空', () => expect(diffMembers(['a'], ['a'])).toEqual({ added: [], removed: [] }))
})

describe('deviceToTransferItem', () => {
  it('映射 id/name/code', () => {
    expect(deviceToTransferItem({ id: '1', code: 'D1', name: '车床' })).toEqual({
      id: '1',
      primary: '车床',
      secondary: 'D1',
    })
  })
  it('缺省兜底', () => {
    expect(deviceToTransferItem({ id: '1' })).toEqual({ id: '1', primary: '', secondary: '' })
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd mes/vue3 && pnpm test -- device`
Expected: FAIL（`@/utils/device` 不存在）

- [ ] **Step 3: 实现 `src/utils/device.ts`**

```typescript
import type { SpDevice, SpComponent, SpDeviceGroup } from '@/types/basedata'
import type { TransferItem } from '@/types/technology'

/** 剥去 undefined / 空串字段(保留有值字段，含 id) */
function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out as Partial<T>
}

export function validateDevice(form: Partial<SpDevice>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('设备编码必填')
  if (!form.name?.trim()) errs.push('设备名称必填')
  return errs
}

export function buildDevicePayload(form: Partial<SpDevice>): Partial<SpDevice> {
  return stripEmpty(form)
}

export function validateComponent(form: Partial<SpComponent>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('零部件编码必填')
  if (!form.name?.trim()) errs.push('零部件名称必填')
  return errs
}

export function buildComponentPayload(form: Partial<SpComponent>): Partial<SpComponent> {
  return stripEmpty(form)
}

export function validateGroup(form: Partial<SpDeviceGroup>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('编组编码必填')
  if (!form.name?.trim()) errs.push('编组名称必填')
  return errs
}

export function buildGroupPayload(form: Partial<SpDeviceGroup>): Partial<SpDeviceGroup> {
  return stripEmpty(form)
}

/** 候选 = 全集剔除已选 id */
export function excludeSelected<T extends { id?: string }>(all: T[], selectedIds: Set<string>): T[] {
  return all.filter((it) => !selectedIds.has(it.id ?? ''))
}

/** 成员 diff:新选集合相对原集合的 added / removed */
export function diffMembers(originalIds: string[], nextIds: string[]): { added: string[]; removed: string[] } {
  const orig = new Set(originalIds)
  const next = new Set(nextIds)
  return {
    added: nextIds.filter((id) => !orig.has(id)),
    removed: originalIds.filter((id) => !next.has(id)),
  }
}

/** SpDevice → 穿梭框项(primary=名称, secondary=编码) */
export function deviceToTransferItem(d: Partial<SpDevice>): TransferItem {
  return { id: d.id ?? '', primary: d.name ?? '', secondary: d.code ?? '' }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd mes/vue3 && pnpm test -- device`
Expected: PASS（全部用例绿）

- [ ] **Step 5: Commit**

```bash
cd mes/vue3 && git add src/utils/device.ts tests/device.spec.ts
git commit -m "✅ feat(vue3): 2b-1 utils/device 纯函数 + TDD"
```

---

## Task 4: `DualListTransfer.vue`（无序双列穿梭）

**Files:**
- Create: `mes/vue3/src/components/DualListTransfer.vue`

> 复用 `@/types/technology` 的 `TransferItem`（id/primary/secondary）。区别于 `OrderedTransfer`：**无上/下移、无首末标记、无链预览**；左候选搜索+点击加入、右已选移除。

- [ ] **Step 1: 实现组件**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TransferItem } from '@/types/technology'

const props = withDefaults(
  defineProps<{
    modelValue: TransferItem[]
    candidates: TransferItem[]
    titles?: [string, string]
    loading?: boolean
  }>(),
  { titles: () => ['可选项', '已选项'], loading: false },
)

const emit = defineEmits<{ 'update:modelValue': [TransferItem[]] }>()

const keyword = ref('')
const selectedIds = computed(() => new Set(props.modelValue.map((i) => i.id)))

/** 左侧可选 = 候选剔除已选 + 关键词过滤 */
const available = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return props.candidates
    .filter((c) => !selectedIds.value.has(c.id))
    .filter(
      (c) =>
        !kw ||
        c.primary.toLowerCase().includes(kw) ||
        (c.secondary ?? '').toLowerCase().includes(kw),
    )
})

function add(item: TransferItem) {
  if (selectedIds.value.has(item.id)) return
  emit('update:modelValue', [...props.modelValue, item])
}
function remove(id: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((i) => i.id !== id),
  )
}
</script>

<template>
  <div class="dlt" :aria-busy="loading">
    <div class="dlt__col">
      <div class="dlt__head">
        <span>{{ titles[0] }}</span>
        <el-tag size="small" round>{{ available.length }}</el-tag>
      </div>
      <el-input v-model="keyword" size="small" placeholder="搜索编码/名称" clearable />
      <div class="dlt__list" role="listbox">
        <button
          v-for="it in available"
          :key="it.id"
          type="button"
          class="dlt__item"
          @click="add(it)"
        >
          <span class="dlt__primary">{{ it.primary }}</span>
          <span v-if="it.secondary" class="dlt__secondary">{{ it.secondary }}</span>
        </button>
        <el-empty v-if="!available.length" description="无可选项" :image-size="48" />
      </div>
    </div>

    <div class="dlt__col">
      <div class="dlt__head">
        <span>{{ titles[1] }}</span>
        <el-tag size="small" type="primary" round>{{ modelValue.length }}</el-tag>
      </div>
      <div class="dlt__list" role="listbox">
        <div v-for="it in modelValue" :key="it.id" class="dlt__item dlt__item--selected">
          <span class="dlt__primary">{{ it.primary }}</span>
          <span v-if="it.secondary" class="dlt__secondary">{{ it.secondary }}</span>
          <el-button text size="small" aria-label="移除" @click="remove(it.id)">移除</el-button>
        </div>
        <el-empty v-if="!modelValue.length" description="尚未选择" :image-size="48" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dlt {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.dlt__col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 10px;
  min-height: 240px;
}
.dlt__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
.dlt__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  max-height: 300px;
}
.dlt__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font: inherit;
  color: inherit;
}
.dlt__item:hover {
  background: var(--el-fill-color);
}
.dlt__item--selected {
  cursor: default;
}
.dlt__primary {
  font-weight: 500;
}
.dlt__secondary {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.dlt__item--selected .el-button {
  margin-left: auto;
}
</style>
```

- [ ] **Step 2: typecheck + build**

Run: `cd mes/vue3 && pnpm typecheck && pnpm build`
Expected: 0 errors / build ✓

- [ ] **Step 3: Commit**

```bash
cd mes/vue3 && git add src/components/DualListTransfer.vue
git commit -m "✨ feat(vue3): 新增无序双列穿梭组件 DualListTransfer(2c 班组面板可复用)"
```

---

## Task 5: 设备维护页（DeviceList + DeviceForm）

**Files:**
- Create: `mes/vue3/src/views/basedata/device/DeviceList.vue`
- Create: `mes/vue3/src/views/basedata/device/DeviceForm.vue`

> **参考现有 CRUD 页 `src/views/basedata/materile/MaterileList.vue` 的结构**（`PageContainer` + `SearchForm` + `DataTable` + `FormDialog`，`useRequest`/分页约定）。本任务给出关键骨架；细节（列宽/loading/分页事件名）对齐 MaterileList。
> `type`/`status` 默认文本输入。实现前实连 dev DB（`localhost:3306/mes_data` root/12345678）查 `sp_sys_dict` 是否有设备类型/状态字典 type；**有则**用 `useDict(type)` 改下拉，无则保持文本。

- [ ] **Step 0: 先读参考页**

Run: `sed -n '1,200p' mes/vue3/src/views/basedata/materile/MaterileList.vue`
理解 `DataTable` props（`:data` `:total` `:loading` `@page-change` 等）、`FormDialog` 用法、新增/编辑/删除编排，照此实现本页。

- [ ] **Step 1: DeviceForm.vue**

```vue
<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { SpDevice } from '@/types/basedata'

const props = defineProps<{ modelValue: Partial<SpDevice> }>()
const emit = defineEmits<{ 'update:modelValue': [Partial<SpDevice>] }>()

const form = reactive<Partial<SpDevice>>({ ...props.modelValue })
watch(
  () => props.modelValue,
  (v) => Object.assign(form, v),
  { deep: true },
)
watch(form, () => emit('update:modelValue', { ...form }), { deep: true })
</script>

<template>
  <el-form :model="form" label-width="88px">
    <el-form-item label="设备编码" required>
      <el-input v-model="form.code" placeholder="如 DS11-1" />
    </el-form-item>
    <el-form-item label="设备名称" required>
      <el-input v-model="form.name" />
    </el-form-item>
    <el-form-item label="类型"><el-input v-model="form.type" /></el-form-item>
    <el-form-item label="型号"><el-input v-model="form.model" /></el-form-item>
    <el-form-item label="规格"><el-input v-model="form.specs" /></el-form-item>
    <el-form-item label="位置"><el-input v-model="form.location" /></el-form-item>
    <el-form-item label="状态"><el-input v-model="form.status" /></el-form-item>
    <el-form-item label="描述">
      <el-input v-model="form.descr" type="textarea" :rows="2" />
    </el-form-item>
  </el-form>
</template>
```

- [ ] **Step 2: DeviceList.vue**（编排，骨架；列/分页/loading 对齐 MaterileList）

```vue
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import FormDialog from '@/components/FormDialog.vue'
import DeviceForm from './DeviceForm.vue'
import { devicePage, deviceAddOrUpdate, deviceDelete } from '@/api/basedata/device'
import { validateDevice, buildDevicePayload } from '@/utils/device'
import type { SpDevice, DevicePageReq } from '@/types/basedata'

const loading = ref(false)
const rows = ref<SpDevice[]>([])
const total = ref(0)
const query = reactive<DevicePageReq>({ current: 1, size: 10, code: '', name: '' })

const dialogVisible = ref(false)
const editing = ref<Partial<SpDevice>>({})

async function load() {
  loading.value = true
  try {
    const page = await devicePage({ ...query })
    rows.value = page.records
    total.value = page.total
  } finally {
    loading.value = false
  }
}
onMounted(load)

function onSearch() {
  query.current = 1
  load()
}
function onReset() {
  query.code = ''
  query.name = ''
  onSearch()
}
function openCreate() {
  editing.value = {}
  dialogVisible.value = true
}
function openEdit(row: SpDevice) {
  editing.value = { ...row }
  dialogVisible.value = true
}
async function submit() {
  const errs = validateDevice(editing.value)
  if (errs.length) return ElMessage.warning(errs[0])
  await deviceAddOrUpdate(buildDevicePayload(editing.value))
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}
async function remove(row: SpDevice) {
  await ElMessageBox.confirm(`确认删除设备「${row.name}」?`, '提示', { type: 'warning' })
  await deviceDelete(row.id!)
  ElMessage.success('已删除')
  load()
}
</script>

<template>
  <PageContainer title="设备维护">
    <SearchForm @search="onSearch" @reset="onReset">
      <el-form-item label="编码"><el-input v-model="query.code" clearable /></el-form-item>
      <el-form-item label="名称"><el-input v-model="query.name" clearable /></el-form-item>
    </SearchForm>

    <DataTable
      :data="rows"
      :total="total"
      :loading="loading"
      v-model:current="query.current"
      v-model:size="query.size"
      @page-change="load"
    >
      <template #toolbar>
        <el-button type="primary" @click="openCreate">新增设备</el-button>
      </template>
      <el-table-column prop="code" label="编码" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="type" label="类型" />
      <el-table-column prop="model" label="型号" />
      <el-table-column prop="specs" label="规格" />
      <el-table-column prop="location" label="位置" />
      <el-table-column prop="status" label="状态" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button text type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button text type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <FormDialog
      v-model="dialogVisible"
      :title="editing.id ? '编辑设备' : '新增设备'"
      @confirm="submit"
    >
      <DeviceForm v-model="editing" />
    </FormDialog>
  </PageContainer>
</template>
```

> **注意：** `DataTable` / `FormDialog` / `SearchForm` / `PageContainer` 的确切 props/事件名以 MaterileList.vue 现用法为准；若分页 prop 非 `v-model:current`/`@page-change`，按现状改齐（Step 0 已读）。

- [ ] **Step 3: 校验 + 提交**

Run: `cd mes/vue3 && pnpm typecheck && pnpm lint:check`（0 err）

```bash
cd mes/vue3 && git add src/views/basedata/device/
git commit -m "✨ feat(vue3): 2b-1 设备维护页(CRUD + 软删确认)"
```

---

## Task 6: 零部件维护页（ComponentList + ComponentForm）

**Files:**
- Create: `mes/vue3/src/views/basedata/component/ComponentList.vue`
- Create: `mes/vue3/src/views/basedata/component/ComponentForm.vue`

> 形态同设备页但极简（仅 code/name/descr）。复制 Task 5 结构，替换 api（`componentPage`/`componentAddOrUpdate`/`componentDelete`）、utils（`validateComponent`/`buildComponentPayload`）、类型（`SpComponent`/`ComponentPageReq`）、文案与列。**不要写 "同设备页" 占位 —— 完整实现。**

- [ ] **Step 1: ComponentForm.vue**

```vue
<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { SpComponent } from '@/types/basedata'

const props = defineProps<{ modelValue: Partial<SpComponent> }>()
const emit = defineEmits<{ 'update:modelValue': [Partial<SpComponent>] }>()

const form = reactive<Partial<SpComponent>>({ ...props.modelValue })
watch(() => props.modelValue, (v) => Object.assign(form, v), { deep: true })
watch(form, () => emit('update:modelValue', { ...form }), { deep: true })
</script>

<template>
  <el-form :model="form" label-width="88px">
    <el-form-item label="零部件编码" required><el-input v-model="form.code" /></el-form-item>
    <el-form-item label="零部件名称" required><el-input v-model="form.name" /></el-form-item>
    <el-form-item label="描述">
      <el-input v-model="form.descr" type="textarea" :rows="2" />
    </el-form-item>
  </el-form>
</template>
```

- [ ] **Step 2: ComponentList.vue**（编排，结构同 Task 5 DeviceList，替换为 component 资源）

```vue
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import FormDialog from '@/components/FormDialog.vue'
import ComponentForm from './ComponentForm.vue'
import { componentPage, componentAddOrUpdate, componentDelete } from '@/api/basedata/component'
import { validateComponent, buildComponentPayload } from '@/utils/device'
import type { SpComponent, ComponentPageReq } from '@/types/basedata'

const loading = ref(false)
const rows = ref<SpComponent[]>([])
const total = ref(0)
const query = reactive<ComponentPageReq>({ current: 1, size: 10, code: '', name: '' })

const dialogVisible = ref(false)
const editing = ref<Partial<SpComponent>>({})

async function load() {
  loading.value = true
  try {
    const page = await componentPage({ ...query })
    rows.value = page.records
    total.value = page.total
  } finally {
    loading.value = false
  }
}
onMounted(load)

function onSearch() {
  query.current = 1
  load()
}
function onReset() {
  query.code = ''
  query.name = ''
  onSearch()
}
function openCreate() {
  editing.value = {}
  dialogVisible.value = true
}
function openEdit(row: SpComponent) {
  editing.value = { ...row }
  dialogVisible.value = true
}
async function submit() {
  const errs = validateComponent(editing.value)
  if (errs.length) return ElMessage.warning(errs[0])
  await componentAddOrUpdate(buildComponentPayload(editing.value))
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}
async function remove(row: SpComponent) {
  await ElMessageBox.confirm(`确认删除零部件「${row.name}」?`, '提示', { type: 'warning' })
  await componentDelete(row.id!)
  ElMessage.success('已删除')
  load()
}
</script>

<template>
  <PageContainer title="零部件维护">
    <SearchForm @search="onSearch" @reset="onReset">
      <el-form-item label="编码"><el-input v-model="query.code" clearable /></el-form-item>
      <el-form-item label="名称"><el-input v-model="query.name" clearable /></el-form-item>
    </SearchForm>

    <DataTable
      :data="rows"
      :total="total"
      :loading="loading"
      v-model:current="query.current"
      v-model:size="query.size"
      @page-change="load"
    >
      <template #toolbar>
        <el-button type="primary" @click="openCreate">新增零部件</el-button>
      </template>
      <el-table-column prop="code" label="编码" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="descr" label="描述" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button text type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button text type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <FormDialog
      v-model="dialogVisible"
      :title="editing.id ? '编辑零部件' : '新增零部件'"
      @confirm="submit"
    >
      <ComponentForm v-model="editing" />
    </FormDialog>
  </PageContainer>
</template>
```

- [ ] **Step 3: 校验 + 提交**

Run: `cd mes/vue3 && pnpm typecheck && pnpm lint:check`（0 err）

```bash
cd mes/vue3 && git add src/views/basedata/component/
git commit -m "✨ feat(vue3): 2b-1 零部件维护页(极简 CRUD)"
```

---

## Task 7: 设备编组主从页（DeviceGroupPage + Form + Members）

**Files:**
- Create: `mes/vue3/src/views/basedata/device-group/DeviceGroupForm.vue`
- Create: `mes/vue3/src/views/basedata/device-group/DeviceGroupMembers.vue`
- Create: `mes/vue3/src/views/basedata/device-group/DeviceGroupPage.vue`

> **参考现有主从页 `src/views/inventory/ReceiptPage.vue` 或 `src/views/system/dict/DictList.vue`** 看 `MasterDetailLayout` 的插槽/用法（左主表、右详情）。

- [ ] **Step 0: 读参考主从页**

Run: `sed -n '1,120p' mes/vue3/src/views/inventory/ReceiptPage.vue`
理解 `MasterDetailLayout` 的左右插槽命名、选中行如何驱动右侧。

- [ ] **Step 1: DeviceGroupForm.vue**

```vue
<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { SpDeviceGroup } from '@/types/basedata'

const props = defineProps<{ modelValue: Partial<SpDeviceGroup> }>()
const emit = defineEmits<{ 'update:modelValue': [Partial<SpDeviceGroup>] }>()

const form = reactive<Partial<SpDeviceGroup>>({ ...props.modelValue })
watch(() => props.modelValue, (v) => Object.assign(form, v), { deep: true })
watch(form, () => emit('update:modelValue', { ...form }), { deep: true })
</script>

<template>
  <el-form :model="form" label-width="88px">
    <el-form-item label="编组编码" required><el-input v-model="form.code" /></el-form-item>
    <el-form-item label="编组名称" required><el-input v-model="form.name" /></el-form-item>
    <el-form-item label="描述">
      <el-input v-model="form.descr" type="textarea" :rows="2" />
    </el-form-item>
  </el-form>
</template>
```

- [ ] **Step 2: DeviceGroupMembers.vue**（右侧成员面板）

> 取该组成员 + 全部设备 → 候选=全部设备、已选=成员。`DualListTransfer` 受控编辑本地副本，「保存成员」时 `diffMembers` 出 added/removed → 批量 add + 逐个 remove。

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import DualListTransfer from '@/components/DualListTransfer.vue'
import { devicePage } from '@/api/basedata/device'
import {
  deviceGroupItems,
  deviceGroupItemsAdd,
  deviceGroupItemsRemove,
} from '@/api/basedata/deviceGroup'
import { deviceToTransferItem, diffMembers } from '@/utils/device'
import type { SpDevice } from '@/types/basedata'
import type { TransferItem } from '@/types/technology'

const props = defineProps<{ groupId: string }>()

const allDevices = ref<SpDevice[]>([])
const originalMemberIds = ref<string[]>([])
const selected = ref<TransferItem[]>([])
const saving = ref(false)
const loading = ref(false)

const candidates = computed<TransferItem[]>(() => allDevices.value.map(deviceToTransferItem))

async function load() {
  if (!props.groupId) return
  loading.value = true
  try {
    // 全量设备(候选池):size 拉大兜底(demo 规模;PaginationInterceptor 上限隐患记 backlog)
    const [page, members] = await Promise.all([
      devicePage({ current: 1, size: 1000 }),
      deviceGroupItems(props.groupId),
    ])
    allDevices.value = page.records
    originalMemberIds.value = members.map((m) => m.id!).filter(Boolean)
    selected.value = members.map(deviceToTransferItem)
  } finally {
    loading.value = false
  }
}
watch(() => props.groupId, load, { immediate: true })

async function save() {
  const { added, removed } = diffMembers(
    originalMemberIds.value,
    selected.value.map((i) => i.id),
  )
  if (!added.length && !removed.length) return ElMessage.info('成员无变化')
  saving.value = true
  try {
    if (added.length) await deviceGroupItemsAdd(props.groupId, added)
    for (const id of removed) await deviceGroupItemsRemove(props.groupId, id)
    ElMessage.success('成员已保存')
    await load()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="group-members">
    <div class="group-members__bar">
      <span class="group-members__title">编组成员</span>
      <el-button type="primary" :loading="saving" @click="save">保存成员</el-button>
    </div>
    <DualListTransfer
      v-model="selected"
      :candidates="candidates"
      :titles="['可选设备', '编组成员']"
      :loading="loading"
    />
  </div>
</template>

<style scoped>
.group-members {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.group-members__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.group-members__title {
  font-weight: 600;
}
</style>
```

- [ ] **Step 3: DeviceGroupPage.vue**（主从编排）

```vue
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import DataTable from '@/components/DataTable.vue'
import FormDialog from '@/components/FormDialog.vue'
import DeviceGroupForm from './DeviceGroupForm.vue'
import DeviceGroupMembers from './DeviceGroupMembers.vue'
import {
  deviceGroupPage,
  deviceGroupAddOrUpdate,
  deviceGroupDelete,
} from '@/api/basedata/deviceGroup'
import { validateGroup, buildGroupPayload } from '@/utils/device'
import type { SpDeviceGroup, DeviceGroupPageReq } from '@/types/basedata'

const loading = ref(false)
const rows = ref<SpDeviceGroup[]>([])
const total = ref(0)
const query = reactive<DeviceGroupPageReq>({ current: 1, size: 10 })
const selected = ref<SpDeviceGroup | null>(null)

const dialogVisible = ref(false)
const editing = ref<Partial<SpDeviceGroup>>({})

async function load() {
  loading.value = true
  try {
    const page = await deviceGroupPage({ ...query })
    rows.value = page.records
    total.value = page.total
    // 选中行失效时清空右侧(避免陈旧引用)
    if (selected.value && !rows.value.some((r) => r.id === selected.value!.id)) {
      selected.value = null
    }
  } finally {
    loading.value = false
  }
}
onMounted(load)

function pick(row: SpDeviceGroup) {
  selected.value = row
}
function openCreate() {
  editing.value = {}
  dialogVisible.value = true
}
function openEdit(row: SpDeviceGroup) {
  editing.value = { ...row }
  dialogVisible.value = true
}
async function submit() {
  const errs = validateGroup(editing.value)
  if (errs.length) return ElMessage.warning(errs[0])
  await deviceGroupAddOrUpdate(buildGroupPayload(editing.value))
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}
async function remove(row: SpDeviceGroup) {
  await ElMessageBox.confirm(`确认删除编组「${row.name}」?`, '提示', { type: 'warning' })
  await deviceGroupDelete(row.id!)
  if (selected.value?.id === row.id) selected.value = null
  ElMessage.success('已删除')
  load()
}
</script>

<template>
  <PageContainer title="设备编组">
    <MasterDetailLayout>
      <template #master>
        <DataTable
          :data="rows"
          :total="total"
          :loading="loading"
          v-model:current="query.current"
          v-model:size="query.size"
          @page-change="load"
          @row-click="pick"
        >
          <template #toolbar>
            <el-button type="primary" @click="openCreate">新增编组</el-button>
          </template>
          <el-table-column prop="code" label="编码" />
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="descr" label="描述" />
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button text type="primary" @click.stop="openEdit(row)">编辑</el-button>
              <el-button text type="danger" @click.stop="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </DataTable>
      </template>
      <template #detail>
        <DeviceGroupMembers v-if="selected?.id" :key="selected.id" :group-id="selected.id" />
        <el-empty v-else description="请选择左侧编组以维护成员" />
      </template>
    </MasterDetailLayout>

    <FormDialog
      v-model="dialogVisible"
      :title="editing.id ? '编辑编组' : '新增编组'"
      @confirm="submit"
    >
      <DeviceGroupForm v-model="editing" />
    </FormDialog>
  </PageContainer>
</template>
```

> **注意：** `MasterDetailLayout` 插槽名（`#master`/`#detail`）、`DataTable` 的 `@row-click` 事件名以 Step 0 所读现状为准；若不同则改齐。

- [ ] **Step 4: 校验 + 提交**

Run: `cd mes/vue3 && pnpm typecheck && pnpm lint:check`（0 err）

```bash
cd mes/vue3 && git add src/views/basedata/device-group/
git commit -m "✨ feat(vue3): 2b-1 设备编组主从页(成员无序穿梭 + diff 保存)"
```

---

## Task 8: 菜单 seed + urlMap + router 接线

**Files:**
- Create: `scripts/sql/device-menu-seed.sql`（仓库根）
- Modify: `mes/vue3/src/utils/urlMap.ts`
- Modify: `mes/vue3/src/router/index.ts`

- [ ] **Step 1: device-menu-seed.sql**（幂等，组 13 物料管理下）

```sql
-- Cycle 2b-1 菜单种子:设备定义 / 零部件定义 / 设备编组(挂在组 13 物料管理下)
-- 幂等:NOT EXISTS 守卫;需手动执行
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '132', 'deviceDef', '设备定义', '/basedata/device/list-ui', '13', '3', 2, '0', 'device:add', 'fa-desktop', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '132');

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '133', 'componentDef', '零部件定义', '/basedata/component/list-ui', '13', '3', 3, '0', 'component:add', 'fa-puzzle-piece', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '133');

INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '134', 'deviceGroupDef', '设备编组', '/basedata/device-group/list-ui', '13', '3', 4, '0', 'device:add', 'fa-cogs', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '134');
```

> **注意：** `sp_sys_menu` 的 `name` 与 `code` 有 UNIQUE 约束（见 MySQL-init-all.sql）。若 `deviceGroup` code 已被 device-management.sql 的 108 占用，则本 134 的 code 用 `deviceGroupDef`（已避开），`name='设备编组'` 与 108 的 `'编组设备定义'` 不同名（不冲突）。执行前可 `SELECT id,code,name FROM sp_sys_menu WHERE parent_id IN ('10','13')` 核对。

- [ ] **Step 2: urlMap.ts 追加 3 条**

在 `src/utils/urlMap.ts` 的映射对象中追加（紧跟 `'/basedata/materile/list-ui'` 后）：

```typescript
  '/basedata/device/list-ui': '/basedata/device',
  '/basedata/component/list-ui': '/basedata/component',
  '/basedata/device-group/list-ui': '/basedata/device-group',
```

- [ ] **Step 3: router/index.ts 追加 3 路由**

在 AdminLayout 子路由数组中（紧跟 `basedata/materile` 条目后）追加：

```typescript
      {
        path: 'basedata/device',
        name: 'basedata-device',
        component: () => import('@/views/basedata/device/DeviceList.vue'),
        meta: { title: '设备维护', perm: 'device:add' },
      },
      {
        path: 'basedata/component',
        name: 'basedata-component',
        component: () => import('@/views/basedata/component/ComponentList.vue'),
        meta: { title: '零部件维护', perm: 'component:add' },
      },
      {
        path: 'basedata/device-group',
        name: 'basedata-device-group',
        component: () => import('@/views/basedata/device-group/DeviceGroupPage.vue'),
        meta: { title: '设备编组', perm: 'device:add' },
      },
```

- [ ] **Step 4: 全门禁 + 提交**

Run: `cd mes/vue3 && pnpm typecheck && pnpm lint:check && pnpm test && pnpm build`
Expected: typecheck 0 / lint 0 err / test 全绿（含新增 device 用例）/ build ✓

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add scripts/sql/device-menu-seed.sql mes/vue3/src/utils/urlMap.ts mes/vue3/src/router/index.ts
git commit -m "🌱 feat(vue3): 2b-1 菜单种子(组13:设备/零部件/编组) + urlMap + 路由接线"
```

---

## Task 9: 后端审查（软删一致性）+ 最小修复（按需）

**Files:**
- Read: `SpDeviceController.java` / `SpComponentController.java` / `SpDeviceGroupController.java` + 对应 ServiceImpl + Mapper.xml
- Modify（仅在发现真 bug 时）：对应 Controller/ServiceImpl
- Test（若改）：后端测试包新增 `Cycle2b1BackendTest`（JUnit4 + Mockito，AssertJ，对齐同包 `Cycle1c1BackendTest` 风格）

> 按 [[backend-deepseek-review-each-cycle]]：后端多为 DeepSeek 生成、常有 bug。**逐文件读码**，重点核查软删一致性（参照 1b 物料 `SpMaterileController` 的同款修法）。

- [ ] **Step 1: 逐文件读码核查**

核查清单（对 device / component / device-group 三者）：
1. `page`：是否 `ne("is_deleted","1")` 过滤软删行？（实体 `is_deleted` 是 `@TableField` 非 `@TableLogic`，MP 不会自动过滤）
2. `delete`：是物理删 `removeById`（错）还是软删 `UpdateWrapper.set("is_deleted","1")`（对）？
3. device-group `delete`：删头表时是否级联清 `sp_device_group_item`？（不清 → 孤儿行）
4. `items/add`：无 `@Transactional`（幂等循环 save，低危）。

```bash
# 实连 dev DB 佐证字段真实值(顺带确认 type/status 是否字典)
# mysql -h127.0.0.1 -uroot -p12345678 mes_data -e "SELECT DISTINCT type,status FROM sp_device LIMIT 20; SELECT type FROM sp_sys_dict WHERE type LIKE '%device%' OR type LIKE '%设备%';"
```

- [ ] **Step 2: 若发现软删 bug → 最小纯新增修复**

对每个漏过滤/漏软删的端点，参照 `SpMaterileController` 修法：
- `page`：`QueryWrapper` 加 `.ne("is_deleted","1")`（+ 可选 `orderByDesc("create_time")`）。
- `delete`：改为 `UpdateWrapper<SpXxx>().eq("id", id).set("is_deleted","1")` + `service.update(uw)`。
- （若改 device-group delete 级联：在同一 `@Transactional` 内先 `removeById` 头表再删 item 关系。）

> **若三者均已正确**（page 已过滤 + delete 已软删）：**零改动**，在 verify-results 记录「审查结论 OK」，跳到 Step 4。

- [ ] **Step 3: 守卫单测（仅在改了后端时）**

新增 `Cycle2b1BackendTest`（对齐同包既有 `Cycle1c1BackendTest` 的 JUnit4 `@RunWith(MockitoJUnitRunner.class)` + AssertJ 风格），断言修复点（如 `UpdateWrapper` 含 `is_deleted` 软删、page 含 `ne` 过滤）。

Run: `cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q test -Dtest=Cycle2b1BackendTest`
Expected: 守卫单测全绿（见 [[backend-build-mvnw-broken]] 用系统 mvn + JDK11）

- [ ] **Step 4: 提交（若有后端改动）**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/src/main/java/.../Sp*Controller.java mes/src/test/java/.../Cycle2b1BackendTest.java
git commit -m "🐛 fix(backend): 2b-1 设备/零部件/编组 软删一致性(page 过滤 + delete 软删) + 守卫单测"
```

---

## Task 10: 收尾（ROADMAP + 验证结论 + 合并）

**Files:**
- Modify: `mes/vue3/docs/ROADMAP.md`（§8 Cycle 2 段 + §9.2 模块矩阵 + §11 快照）
- Create: `mes/vue3/docs/specs/2026-06-22-cycle2b1-verify-results.md`
- Modify: `/Users/chengyiyang/.claude/.../memory/mes-rebuild-roadmap.md` 或 `vue3-homework-frontend.md`（记 2b-1 完成）

- [ ] **Step 1: 写验证结论 verify-results.md**

记录：门禁结果（typecheck/test/lint/build 数字）、后端审查结论（OK 或修了什么 + 守卫单测）、契约逐端点核对、backlog、人工冒烟待确认项（需后端 9090 + DB 跑 `device-management.sql` + `device-menu-seed.sql`）。

- [ ] **Step 2: 更新 ROADMAP**

- §8 Cycle 2 段：2b-1 标 ✅，列交付/沉淀/编码/后端结论/门禁。
- §9.2 矩阵：「设备 / 设备编组」行状态 C2 → ✅（零部件同）。
- §11 快照 + 「下一步」改为 2b-2（仓库库位 + 加工单元 CRUD）。

```bash
cd mes/vue3 && git add docs/ROADMAP.md docs/specs/2026-06-22-cycle2b1-verify-results.md
git commit -m "📝 docs(vue3): ROADMAP 标记 2b-1 完成 + 验证结论"
```

- [ ] **Step 3: subagent 两阶段审查 + opus 终审**

按既有节奏：逐任务两阶段审查（实现 + spec/质量），opus 整体终审前后端契约逐端点核对，得「Ready to merge」结论。

- [ ] **Step 4: `--no-ff` 合 develop**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git checkout develop
git merge --no-ff feature/basedata-device -m "🔀 Merge: 2b-1 设备/零部件/设备编组完成 (feature/basedata-device → develop)"
git branch -d feature/basedata-device
```

> develop 超前 origin、不自动 push（用户自行 push，见 [[vue3-homework-frontend]]）。

---

## Self-Review 记录

- **Spec 覆盖**：设备 CRUD（T1/T2/T3/T5）、零部件 CRUD（T1/T2/T3/T6）、设备编组主从（T1/T2/T3/T4/T7）、DualListTransfer 沉淀（T4）、菜单/urlMap/router（T8）、后端软删审查（T9）、收尾/验证/合并（T10）—— 全覆盖 spec 各节。
- **lineId 不做下拉、type/status 默认文本**：在 T5 Step 0 注明实连 DB 决策。
- **编码差异**（component add-or-update 走 form、其余 JSON）：在 T2 三处 api 显式体现。
- **类型一致性**：`SpDevice`/`SpComponent`/`SpDeviceGroup` + `*PageReq`（T1）→ api（T2）→ utils（T3）→ 视图（T5/6/7）签名一致；`TransferItem` 统一来自 `@/types/technology`（T3/T4/T7）；`deviceToTransferItem`/`diffMembers`/`excludeSelected` 在 T3 定义、T7 消费，命名一致。
- **占位符扫描**：T6 明确「不要写'同设备页'占位，完整实现」；各步均含完整代码。
- **现状对齐风险**：`DataTable`/`FormDialog`/`MasterDetailLayout` 的精确 props/插槽/事件名以参考页（MaterileList / ReceiptPage）现状为准 —— 已在 T5 Step0、T7 Step0 要求先读参考页对齐，避免凭空臆造接口。
