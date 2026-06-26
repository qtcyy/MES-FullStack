# 子周期 1d 计划（工单/派工/甘特）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mes/vue3` 实现计划模块三屏——工单下达 CRUD、员工作业派工、甘特排程（双视角 + 拖拽改期 + 执行回填），对接后端已存在的 15 个端点。

**Architecture:** Vue3 `<script setup>` + Element Plus。沿用既有范式：`useRequest`/`usePagination` 取数、`DataTable`/`SearchForm`/`FormDialog`/`PageContainer` 通用组件、纯函数（`utils/order.ts`、`utils/gantt.ts`）承载校验/payload/甘特几何并 TDD（vitest，`tests/*.spec.ts`）。甘特自研 CSS/div，UI 独立设计，不抄 mes-new。后端默认零改动，仅审查+暴露 bug 才最小修。

**Tech Stack:** Vue 3.5 / TypeScript / Element Plus / Vite / Pinia / Vitest / axios（`http` 封装，表单编码默认、JSON 显式 `http.post(url,body,true)`）。

**前置（人工/DB）：** 后端 9090 + DB 已跑 `scripts/sql/dispatch-management.sql`（建 sp_order_dispatch + 菜单122）、`scripts/sql/gantt-migration.sql`（加 oper_id/progress 列 + 菜单123）、可选 `scripts/sql/gantt-mock-seed.sql`（演示数据）。菜单121 工单下达在主 SQL 已存在。

**门禁（每完成若干任务跑一次，收尾必跑）：** `cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`

---

## 文件结构

**新建：**
- `src/types/order.ts` —— 计划模块全部 TS 类型
- `src/api/order/order.ts` / `dispatch.ts` / `gantt.ts` —— 三组 API
- `src/utils/order.ts` —— 工单/派工纯函数（payload/校验/状态 label）
- `src/utils/gantt.ts` —— 甘特几何/分组/拖拽纯函数
- `src/views/order/release/OrderList.vue` / `OrderForm.vue`
- `src/views/order/dispatch/DispatchList.vue` / `DispatchDialog.vue`
- `src/views/order/gantt/GanttPage.vue` / `GanttChart.vue` / `TaskDetailSheet.vue`
- `tests/order.spec.ts` / `tests/gantt.spec.ts`

**修改：**
- `src/components/DataTable.vue` —— 加可选多选列（派工屏需要）
- `src/utils/urlMap.ts` —— 加 3 条映射
- `src/router/index.ts` —— 加 3 路由
- `mes/vue3/docs/ROADMAP.md` —— 收尾更新进度

---

## Task 1: 类型定义 `src/types/order.ts`

**Files:**
- Create: `src/types/order.ts`

- [ ] **Step 1: 写类型文件**

```ts
// src/types/order.ts —— 计划模块（工单/派工/甘特）类型

/** 生产订单（sp_order） */
export interface SpOrder {
  id?: string
  orderCode?: string
  orderDescription?: string
  qty?: number
  /** P=量产 A=验证 F=返工 */
  orderType?: string
  flowId?: string
  materiel?: string
  materielDesc?: string
  /** yyyy-MM-dd HH:mm:ss */
  planStartTime?: string
  planEndTime?: string
  /** 0待派工 1已派工 2进行中 3结束 4终结 */
  statue?: number
  createTime?: string
  updateTime?: string
}

/** 工单分页查询请求 */
export interface OrderPageReq {
  current: number
  size: number
  orderCodeLike?: string
  materielLike?: string
}

/** 派工列表行（含派工元信息） */
export interface DispatchableOrder extends SpOrder {
  dispatchStatus?: number | null
  workerName?: string | null
  teamName?: string | null
}

/** 派工分页请求 */
export interface DispatchPageReq {
  current: number
  size: number
  orderCode?: string
}

/** 派工提交体（JSON） */
export interface SpDispatchAssign {
  orderIds: string[]
  teamId: string
  userId: string
  laborHours: number
  planStartTime?: string
  planEndTime?: string
  remark?: string
}

export interface SpTeamOption {
  id: string
  code?: string
  name: string
}
export interface TeamUserOption {
  id: string
  name: string
  username?: string
}

/** 甘特只读聚合任务（GanttTaskVO） */
export interface GanttTask {
  id: string
  orderId: string
  orderCode: string
  materiel?: string
  materielDesc?: string
  qty?: number
  orderType?: string
  orderStatue?: number
  operId?: string
  operName?: string
  teamId?: string
  teamName?: string
  userId?: string
  userName?: string
  planStartTime?: string
  planEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  /** 1派工 2开工 3完工 */
  dispatchStatus: number
  progress?: number
}

export interface GanttQueryParams {
  startTime?: string
  endTime?: string
  orderCode?: string
  teamId?: string
}

/** 甘特写请求 DTO（均 JSON） */
export interface GanttReschedule { id: string; planStartTime: string; planEndTime: string }
export interface GanttStart { id: string; actualStartTime?: string }
export interface GanttFinish { id: string; actualEndTime?: string }
export interface GanttProgress { id: string; progress: number }
export interface GanttActual { id: string; actualStartTime?: string; actualEndTime?: string }
```

- [ ] **Step 2: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误（新文件无引用方，单独编译通过）

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/types/order.ts
git commit -m "✨ feat(vue3): 计划模块类型定义(工单/派工/甘特)"
```

---

## Task 2: API 层 `src/api/order/{order,dispatch,gantt}.ts`

**Files:**
- Create: `src/api/order/order.ts`, `src/api/order/dispatch.ts`, `src/api/order/gantt.ts`

- [ ] **Step 1: 写 order.ts**

```ts
// src/api/order/order.ts
import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { SpOrder, OrderPageReq } from '@/types/order'

/** 工单分页（form） */
export const orderPage = (req: OrderPageReq) =>
  http.post<IPage<SpOrder>>('/order/release/page', req)

/** 按 id 取工单（GET） */
export const orderGetById = (id: string) =>
  http.get<SpOrder>('/order/release/get-by-id', { id })

/** 新增/更新（form，无 id=新增） */
export const orderAddOrUpdate = (dto: Partial<SpOrder>) =>
  http.post<void>('/order/release/add-or-update', dto)

/** 删除（form，后端物理删） */
export const orderDelete = (id: string) =>
  http.post<void>('/order/release/delete', { id })
```

- [ ] **Step 2: 写 dispatch.ts**

```ts
// src/api/order/dispatch.ts
import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { DispatchableOrder, DispatchPageReq, SpDispatchAssign, SpTeamOption, TeamUserOption } from '@/types/order'

/** 待派工工单分页（form，后端仅返 statue=0） */
export const dispatchPage = (req: DispatchPageReq) =>
  http.post<IPage<DispatchableOrder>>('/order/dispatch/page', req)

/** 批量派工（JSON） */
export const dispatchAssign = (dto: SpDispatchAssign) =>
  http.post<void>('/order/dispatch/assign', dto, true)

/** 班组下拉（GET） */
export const dispatchTeams = () =>
  http.get<SpTeamOption[]>('/order/dispatch/teams')

/** 班组成员下拉（GET，级联） */
export const dispatchTeamUsers = (teamId: string) =>
  http.get<TeamUserOption[]>(`/order/dispatch/team-users/${encodeURIComponent(teamId)}`)
```

- [ ] **Step 3: 写 gantt.ts**

```ts
// src/api/order/gantt.ts
import { http } from '@/api/request'
import type { GanttTask, GanttQueryParams, GanttReschedule, GanttStart, GanttFinish, GanttProgress, GanttActual } from '@/types/order'

/** 甘特任务（form，只读聚合） */
export const ganttTasks = (params: GanttQueryParams = {}) =>
  http.post<GanttTask[]>('/order/gantt/tasks', params)

/** 拖拽改期（JSON） */
export const ganttReschedule = (body: GanttReschedule) =>
  http.post<void>('/order/gantt/reschedule', body, true)

/** 记录开工（JSON，空时间后端取 now） */
export const ganttStart = (body: GanttStart) =>
  http.post<void>('/order/gantt/start', body, true)

/** 记录完工（JSON） */
export const ganttFinish = (body: GanttFinish) =>
  http.post<void>('/order/gantt/finish', body, true)

/** 更新进度（JSON） */
export const ganttProgress = (body: GanttProgress) =>
  http.post<void>('/order/gantt/progress', body, true)

/** 纠正实际时间（JSON） */
export const ganttActual = (body: GanttActual) =>
  http.post<void>('/order/gantt/actual', body, true)
```

- [ ] **Step 4: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。若报 `IPage` 导入路径错，确认 `src/types/api.ts` 导出 `IPage`（既有 materile.ts 同款导入 `import type { IPage } from '@/types/api'`）。

- [ ] **Step 5: Commit**

```bash
git add mes/vue3/src/api/order
git commit -m "✨ feat(vue3): 计划模块 API 层(工单/派工/甘特 15 端点)"
```

---

## Task 3: 工单/派工纯函数 `src/utils/order.ts`（TDD）

**Files:**
- Create: `src/utils/order.ts`
- Test: `tests/order.spec.ts`

- [ ] **Step 1: 写失败测试 `tests/order.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  buildOrderPayload,
  validateOrder,
  orderTypeLabel,
  orderStatusMeta,
  buildDispatchPayload,
  validateDispatch,
} from '@/utils/order'

describe('buildOrderPayload', () => {
  it('剥空串、qty 数值化、保留 id', () => {
    const p = buildOrderPayload({ id: 'o1', orderCode: 'OD1', qty: '5' as unknown as number, orderDescription: '', orderType: 'P', materiel: 'M1' })
    expect(p).toEqual({ id: 'o1', orderCode: 'OD1', qty: 5, orderType: 'P', materiel: 'M1' })
  })
  it('新增无 id', () => {
    const p = buildOrderPayload({ orderCode: 'OD2', qty: 1, orderType: 'A', materiel: 'M2' })
    expect(p.id).toBeUndefined()
  })
})

describe('validateOrder', () => {
  it('编码必填', () => { expect(validateOrder({ qty: 1, orderType: 'P', materiel: 'M' })).toBe('请输入工单编号') })
  it('数量须为正', () => { expect(validateOrder({ orderCode: 'O', qty: 0, orderType: 'P', materiel: 'M' })).toBe('数量须为正整数') })
  it('类型必填', () => { expect(validateOrder({ orderCode: 'O', qty: 1, materiel: 'M' })).toBe('请选择工单类型') })
  it('物料必填', () => { expect(validateOrder({ orderCode: 'O', qty: 1, orderType: 'P' })).toBe('请选择物料') })
  it('合法返回空串', () => { expect(validateOrder({ orderCode: 'O', qty: 1, orderType: 'P', materiel: 'M' })).toBe('') })
})

describe('orderTypeLabel', () => {
  it('映射 P/A/F', () => {
    expect(orderTypeLabel('P')).toBe('量产')
    expect(orderTypeLabel('A')).toBe('验证')
    expect(orderTypeLabel('F')).toBe('返工')
    expect(orderTypeLabel('X')).toBe('X')
  })
})

describe('orderStatusMeta', () => {
  it('0→待派工 warning', () => { expect(orderStatusMeta(0)).toEqual({ label: '待派工', tag: 'warning' }) })
  it('3→已结束 success', () => { expect(orderStatusMeta(3)).toEqual({ label: '已结束', tag: 'success' }) })
  it('未知→info', () => { expect(orderStatusMeta(9).tag).toBe('info') })
})

describe('buildDispatchPayload', () => {
  it('组装 orderIds + 剥空可选项', () => {
    const p = buildDispatchPayload(['a', 'b'], { teamId: 't1', userId: 'u1', laborHours: 8, planStartTime: '', remark: '' })
    expect(p).toEqual({ orderIds: ['a', 'b'], teamId: 't1', userId: 'u1', laborHours: 8 })
  })
})

describe('validateDispatch', () => {
  it('未选工单', () => { expect(validateDispatch([], { teamId: 't', userId: 'u', laborHours: 8 })).toBe('请至少选择一张工单') })
  it('未选班组', () => { expect(validateDispatch(['a'], { teamId: '', userId: 'u', laborHours: 8 })).toBe('请选择班组') })
  it('未选作业员', () => { expect(validateDispatch(['a'], { teamId: 't', userId: '', laborHours: 8 })).toBe('请选择作业员') })
  it('工时须为正', () => { expect(validateDispatch(['a'], { teamId: 't', userId: 'u', laborHours: 0 })).toBe('工时须大于 0') })
  it('合法空串', () => { expect(validateDispatch(['a'], { teamId: 't', userId: 'u', laborHours: 8 })).toBe('') })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd mes/vue3 && pnpm test order`
Expected: FAIL（`@/utils/order` 不存在）

- [ ] **Step 3: 写实现 `src/utils/order.ts`**

```ts
// src/utils/order.ts —— 工单/派工纯函数
import type { SpOrder, SpDispatchAssign } from '@/types/order'

/** 剥空串/空值，qty 数值化；返回可直接提交的 payload */
export function buildOrderPayload(form: Partial<SpOrder>): Partial<SpOrder> {
  const out: Record<string, unknown> = {}
  Object.entries(form).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    out[k] = v
  })
  if (out.qty !== undefined) out.qty = Number(out.qty)
  return out as Partial<SpOrder>
}

/** 校验，返回首条错误文案；合法返回空串 */
export function validateOrder(form: Partial<SpOrder>): string {
  if (!form.orderCode?.trim()) return '请输入工单编号'
  if (!form.qty || Number(form.qty) <= 0) return '数量须为正整数'
  if (!form.orderType) return '请选择工单类型'
  if (!form.materiel) return '请选择物料'
  return ''
}

const TYPE_LABEL: Record<string, string> = { P: '量产', A: '验证', F: '返工' }
export function orderTypeLabel(t?: string): string {
  return (t && TYPE_LABEL[t]) || t || '-'
}

type TagType = 'success' | 'warning' | 'info' | 'primary' | 'danger'
const STATUS_META: Record<number, { label: string; tag: TagType }> = {
  0: { label: '待派工', tag: 'warning' },
  1: { label: '已派工', tag: 'primary' },
  2: { label: '进行中', tag: 'primary' },
  3: { label: '已结束', tag: 'success' },
  4: { label: '已终结', tag: 'info' },
}
export function orderStatusMeta(s?: number): { label: string; tag: TagType } {
  return (s !== undefined && STATUS_META[s]) || { label: '未知', tag: 'info' }
}

/** 派工提交体：注入 orderIds，剥空可选项 */
export function buildDispatchPayload(
  orderIds: string[],
  form: { teamId: string; userId: string; laborHours: number; planStartTime?: string; planEndTime?: string; remark?: string },
): SpDispatchAssign {
  const out: SpDispatchAssign = { orderIds, teamId: form.teamId, userId: form.userId, laborHours: Number(form.laborHours) }
  if (form.planStartTime) out.planStartTime = form.planStartTime
  if (form.planEndTime) out.planEndTime = form.planEndTime
  if (form.remark) out.remark = form.remark
  return out
}

export function validateDispatch(
  orderIds: string[],
  form: { teamId: string; userId: string; laborHours: number },
): string {
  if (!orderIds.length) return '请至少选择一张工单'
  if (!form.teamId) return '请选择班组'
  if (!form.userId) return '请选择作业员'
  if (!form.laborHours || Number(form.laborHours) <= 0) return '工时须大于 0'
  return ''
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd mes/vue3 && pnpm test order`
Expected: PASS（全部 order.spec 用例绿）

- [ ] **Step 5: Commit**

```bash
git add mes/vue3/src/utils/order.ts mes/vue3/tests/order.spec.ts
git commit -m "✅ test(vue3): 工单/派工纯函数 + 单测(payload/校验/状态label)"
```

---

## Task 4: DataTable 加可选多选列

**Files:**
- Modify: `src/components/DataTable.vue`

派工屏需要行多选。给 DataTable 加 `selectable` prop（默认 false）渲染 `type="selection"` 列，并 `@selection-change` 透出选中行。**保持默认行为不变**（不传 selectable 的既有页面零影响）。

- [ ] **Step 1: 在 el-table 内首列前插入 selection 列**

在 `src/components/DataTable.vue` 的 `<el-table ...>` 上加 `@selection-change`，并在第一个 `<el-table-column v-for=...>` **之前**插入：

```html
      <el-table-column v-if="selectable" type="selection" width="46" :reserve-selection="true" />
```

把第 7 行的 el-table 开标签改为带 selection-change 透传（row-click 保留）：

```html
    <el-table v-else v-loading="loading" :data="data" :row-key="rowKey" stripe v-auto-animate
      @row-click="(row: T) => emit('row-click', row)"
      @selection-change="(rows: T[]) => emit('selection-change', rows)">
```

- [ ] **Step 2: props/emits 增补**

在 `defineProps` 对象内加 `selectable?: boolean`，`withDefaults` 第二参加 `selectable: false`：

```ts
withDefaults(
  defineProps<{
    data: T[]
    loading?: boolean
    columns: Column[]
    pager: { current: number; size: number; total: number }
    rowKey?: string
    actionWidth?: number | string
    selectable?: boolean
  }>(),
  { loading: false, rowKey: 'id', actionWidth: 180, selectable: false },
)
const emit = defineEmits<{
  'page-change': [number]
  'size-change': [number]
  'row-click': [T]
  'selection-change': [T[]]
}>()
```

- [ ] **Step 3: typecheck + 既有测试回归**

Run: `cd mes/vue3 && pnpm typecheck && pnpm test`
Expected: typecheck 0 错误；既有测试全绿（DataTable 改动向后兼容）。

- [ ] **Step 4: Commit**

```bash
git add mes/vue3/src/components/DataTable.vue
git commit -m "✨ feat(vue3): DataTable 增可选多选列(selectable + selection-change)"
```

---

## Task 5: 路由 + urlMap

**Files:**
- Modify: `src/utils/urlMap.ts`, `src/router/index.ts`

- [ ] **Step 1: urlMap 加 3 条**

在 `src/utils/urlMap.ts` 的 `URL_MAP` 对象内（`bom-flow` 那行后）追加：

```ts
  '/order/release/list-ui': '/order/release',
  '/order/dispatch': '/order/dispatch',
  '/order/gantt': '/order/gantt',
```

- [ ] **Step 2: router 加 3 路由**

在 `src/router/index.ts` 的 `bom-flow` 路由对象后、`children` 数组内追加：

```ts
      {
        path: 'order/release',
        name: 'order-release',
        component: () => import('@/views/order/release/OrderList.vue'),
        meta: { title: '工单下达', perm: 'order:add' },
      },
      {
        path: 'order/dispatch',
        name: 'order-dispatch',
        component: () => import('@/views/order/dispatch/DispatchList.vue'),
        meta: { title: '员工作业派工', perm: 'order:dispatch' },
      },
      {
        path: 'order/gantt',
        name: 'order-gantt',
        component: () => import('@/views/order/gantt/GanttPage.vue'),
        meta: { title: '生产甘特图', perm: 'order:gantt' },
      },
```

- [ ] **Step 3: urlMap 测试回归**

Run: `cd mes/vue3 && pnpm test urlMap`
Expected: PASS（既有 urlMap.spec 不因新增映射而破；如该 spec 断言映射表条数，按需补 3 条断言）。

注：此步 typecheck/build 会因 view 文件尚未创建而失败属正常——路由动态 import 在运行时解析，但 `pnpm build`（Vite）会校验存在性。**本任务先不跑 build**，等 Task 6/7/10 视图建好后统一跑。typecheck（vue-tsc）对动态 import 缺失文件不报错。

- [ ] **Step 4: Commit**

```bash
git add mes/vue3/src/utils/urlMap.ts mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 计划模块路由接入(urlMap 3 映射 + 3 路由)"
```

---

## Task 6: 工单下达页 `views/order/release/`

**Files:**
- Create: `src/views/order/release/OrderForm.vue`, `src/views/order/release/OrderList.vue`

- [ ] **Step 1: 写 OrderForm.vue**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑工单' : '新增工单'"
    width="640px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" label-width="96px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="工单编号">
            <el-input v-model="form.orderCode" placeholder="请输入工单编号" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="工单类型">
            <el-select v-model="form.orderType" placeholder="请选择" clearable style="width: 100%">
              <el-option label="量产 (P)" value="P" />
              <el-option label="验证 (A)" value="A" />
              <el-option label="返工 (F)" value="F" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="物料">
            <el-select
              v-model="form.materiel"
              placeholder="请选择物料"
              clearable filterable
              style="width: 100%"
              @change="onMaterielChange"
            >
              <el-option v-for="m in materials" :key="m.id" :label="`${m.materielCode} ${m.materielDesc ?? ''}`" :value="m.materielCode!" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="数量">
            <el-input-number v-model="form.qty" :min="1" :precision="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="物料描述">
        <el-input v-model="form.materielDesc" placeholder="选物料后自动带出，可改" clearable />
      </el-form-item>

      <el-form-item label="工艺路线">
        <el-select v-model="form.flowId" placeholder="请选择工艺路线" clearable filterable style="width: 100%">
          <el-option v-for="f in flows" :key="f.id" :label="f.flow" :value="f.id!" />
        </el-select>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="计划开始">
            <el-date-picker v-model="form.planStartTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="计划开始时间" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="计划结束">
            <el-date-picker v-model="form.planEndTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="计划结束时间" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="工单描述">
        <el-input v-model="form.orderDescription" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { materilePage } from '@/api/basedata/materile'
import { flowList } from '@/api/technology/flow'
import { buildOrderPayload, validateOrder } from '@/utils/order'
import type { SpOrder } from '@/types/order'
import type { SpMaterile } from '@/types/basedata'
import type { SpFlow } from '@/types/technology'

const props = defineProps<{ modelValue: boolean; model: Partial<SpOrder> | null; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [Partial<SpOrder>] }>()

const formRef = ref()
const isEdit = computed(() => !!props.model?.id)
const form = reactive<Partial<SpOrder>>({})

// 物料下拉（取较大页，简单起见一次拉 200 条）
const { data: matPage } = useRequest(() => materilePage({ current: 1, size: 200 }), { immediate: true })
const materials = computed<SpMaterile[]>(() => matPage.value?.records ?? [])

const { data: flows } = useRequest(() => flowList(), { immediate: true }) // SpFlow[]

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const m = props.model ?? {}
      Object.keys(form).forEach((k) => delete (form as Record<string, unknown>)[k])
      Object.assign(form, { qty: 1, ...m })
    }
  },
  { immediate: true },
)

function onMaterielChange(code: string) {
  const hit = materials.value.find((m) => m.materielCode === code)
  if (hit) form.materielDesc = hit.materielDesc
}

function handleSubmit() {
  const err = validateOrder(form)
  if (err) { ElMessage.warning(err); return }
  emit('submit', buildOrderPayload(form))
}
</script>
```

> 注：`SpMaterile` 字段名以 `src/types/basedata.ts` 实际为准（物料编码 `materielCode`、描述 `materielDesc`）。执行时若字段名不同，按该文件修正 `:label`/`onMaterielChange`/`:value`。`flowList()` 返回 `SpFlow[]`，显示字段为 `flow`（工艺路线名），见 `tests`/既有 FlowList。

- [ ] **Step 2: 写 OrderList.vue（镜像 OperList 范式）**

```vue
<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="工单编号">
        <el-input v-model="search.orderCodeLike" placeholder="工单编号" clearable />
      </el-form-item>
      <el-form-item label="物料">
        <el-input v-model="search.materielLike" placeholder="物料编码" clearable />
      </el-form-item>
    </SearchForm>

    <DataTable
      :data="tableData" :loading="loading" :columns="columns" :pager="pager"
      @page-change="handlePageChange" @size-change="handleSizeChange"
    >
      <template #toolbar>
        <el-button v-permission="'order:add'" type="primary" :icon="Plus" @click="openCreate">新增工单</el-button>
      </template>

      <template #col-orderType="{ row }">
        <el-tag size="small" type="info">{{ orderTypeLabel(row.orderType) }}</el-tag>
      </template>
      <template #col-statue="{ row }">
        <el-tag size="small" :type="orderStatusMeta(row.statue).tag">{{ orderStatusMeta(row.statue).label }}</el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpOrder)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpOrder)">删除</el-button>
      </template>
    </DataTable>

    <OrderForm v-model="dialogVisible" :model="editingModel" :loading="submitLoading" @submit="handleFormSubmit" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import OrderForm from './OrderForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { orderPage, orderAddOrUpdate, orderDelete } from '@/api/order/order'
import { orderTypeLabel, orderStatusMeta } from '@/utils/order'
import type { SpOrder } from '@/types/order'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ orderCodeLike: '', materielLike: '' })

const { data: pageData, loading, run } = useRequest(
  () => orderPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)
const tableData = computed<SpOrder[]>(() => {
  const r = pageData.value
  if (r) setTotal(r.total)
  return r?.records ?? []
})

const columns: Column[] = [
  { prop: 'orderCode', label: '工单编号', width: 150 },
  { prop: 'orderDescription', label: '描述', minWidth: 140 },
  { prop: 'qty', label: '数量', width: 80 },
  { prop: 'orderType', label: '类型', width: 90 },
  { prop: 'materiel', label: '物料', width: 120 },
  { prop: 'planStartTime', label: '计划开始', minWidth: 150 },
  { prop: 'planEndTime', label: '计划结束', minWidth: 150 },
  { prop: 'statue', label: '状态', width: 90 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpOrder> | null>(null)
const submitLoading = ref(false)

function openCreate() { editingModel.value = null; dialogVisible.value = true }
function openEdit(row: SpOrder) { editingModel.value = { ...row }; dialogVisible.value = true }
function handlePageChange(p: number) { pager.current = p; run() }
function handleSizeChange(s: number) { pager.size = s; reset(); run() }
function handleSearch() { reset(); run() }
function handleReset() { search.orderCodeLike = ''; search.materielLike = ''; reset(); run() }

async function handleFormSubmit(dto: Partial<SpOrder>) {
  submitLoading.value = true
  try {
    await orderAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally { submitLoading.value = false }
}

async function handleDelete(row: SpOrder) {
  try {
    await ElMessageBox.confirm(`确认删除工单「${row.orderCode}」?`, '提示', { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' })
  } catch { return }
  try { await orderDelete(row.id!); ElMessage.success('删除成功'); run() } catch { /* 拦截器已提示 */ }
}
</script>
```

- [ ] **Step 3: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。若 `SpMaterile`/`SpFlow` 字段名不符，按 `src/types/basedata.ts`、`src/types/technology.ts` 修正。

- [ ] **Step 4: Commit**

```bash
git add mes/vue3/src/views/order/release
git commit -m "✨ feat(vue3): 工单下达页(列表搜索/分页 + 新增编辑弹窗/物料带描述/工艺路线/删除)"
```

---

## Task 7: 员工作业派工页 `views/order/dispatch/`

**Files:**
- Create: `src/views/order/dispatch/DispatchDialog.vue`, `src/views/order/dispatch/DispatchList.vue`

- [ ] **Step 1: 写 DispatchDialog.vue**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="`派工（已选 ${count} 张工单）`"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form :model="form" label-width="92px">
      <el-form-item label="班组">
        <el-select v-model="form.teamId" placeholder="请选择班组" clearable style="width: 100%" @change="onTeamChange">
          <el-option v-for="t in teams" :key="t.id" :label="t.code ? `${t.code} ${t.name}` : t.name" :value="t.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="作业员">
        <el-select v-model="form.userId" placeholder="请先选班组" clearable :disabled="!form.teamId" style="width: 100%">
          <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="工时(小时)">
        <el-input-number v-model="form.laborHours" :min="0.5" :step="0.5" :precision="1" controls-position="right" style="width: 100%" />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="计划开始">
            <el-date-picker v-model="form.planStartTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="可选" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="计划结束">
            <el-date-picker v-model="form.planEndTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="可选" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { dispatchTeams, dispatchTeamUsers } from '@/api/order/dispatch'
import { buildDispatchPayload, validateDispatch } from '@/utils/order'
import type { SpDispatchAssign, SpTeamOption, TeamUserOption } from '@/types/order'

const props = defineProps<{ modelValue: boolean; orderIds: string[]; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [SpDispatchAssign] }>()

const count = computed(() => props.orderIds.length)
const teams = ref<SpTeamOption[]>([])
const users = ref<TeamUserOption[]>([])
const form = reactive({ teamId: '', userId: '', laborHours: 8, planStartTime: '', planEndTime: '', remark: '' })

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      Object.assign(form, { teamId: '', userId: '', laborHours: 8, planStartTime: '', planEndTime: '', remark: '' })
      users.value = []
      teams.value = await dispatchTeams()
    }
  },
  { immediate: true },
)

async function onTeamChange(teamId: string) {
  form.userId = ''
  users.value = teamId ? await dispatchTeamUsers(teamId) : []
}

function handleSubmit() {
  const err = validateDispatch(props.orderIds, form)
  if (err) { ElMessage.warning(err); return }
  emit('submit', buildDispatchPayload(props.orderIds, form))
}
</script>
```

- [ ] **Step 2: 写 DispatchList.vue**

```vue
<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="工单编号">
        <el-input v-model="search.orderCode" placeholder="工单编号" clearable />
      </el-form-item>
    </SearchForm>

    <DataTable
      :data="tableData" :loading="loading" :columns="columns" :pager="pager" selectable
      @page-change="handlePageChange" @size-change="handleSizeChange" @selection-change="onSelection"
    >
      <template #toolbar>
        <el-button v-permission="'order:dispatch'" type="primary" :icon="Promotion" :disabled="!selectedIds.length" @click="openDispatch">
          派工（{{ selectedIds.length }}）
        </el-button>
      </template>
      <template #col-orderType="{ row }">
        <el-tag size="small" type="info">{{ orderTypeLabel(row.orderType) }}</el-tag>
      </template>
    </DataTable>

    <DispatchDialog v-model="dialogVisible" :order-ids="selectedIds" :loading="submitLoading" @submit="handleDispatch" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Promotion } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import DispatchDialog from './DispatchDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { dispatchPage, dispatchAssign } from '@/api/order/dispatch'
import { orderTypeLabel } from '@/utils/order'
import type { DispatchableOrder, SpDispatchAssign } from '@/types/order'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ orderCode: '' })

const { data: pageData, loading, run } = useRequest(
  () => dispatchPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)
const tableData = computed<DispatchableOrder[]>(() => {
  const r = pageData.value
  if (r) setTotal(r.total)
  return r?.records ?? []
})

const columns: Column[] = [
  { prop: 'orderCode', label: '工单编号', width: 150 },
  { prop: 'orderDescription', label: '描述', minWidth: 140 },
  { prop: 'qty', label: '数量', width: 80 },
  { prop: 'orderType', label: '类型', width: 90 },
  { prop: 'materiel', label: '物料', width: 120 },
  { prop: 'planStartTime', label: '计划开始', minWidth: 150 },
  { prop: 'planEndTime', label: '计划结束', minWidth: 150 },
]

const selectedIds = ref<string[]>([])
function onSelection(rows: DispatchableOrder[]) { selectedIds.value = rows.map((r) => r.id!).filter(Boolean) }

const dialogVisible = ref(false)
const submitLoading = ref(false)
function openDispatch() { dialogVisible.value = true }

function handlePageChange(p: number) { pager.current = p; run() }
function handleSizeChange(s: number) { pager.size = s; reset(); run() }
function handleSearch() { reset(); run() }
function handleReset() { search.orderCode = ''; reset(); run() }

async function handleDispatch(dto: SpDispatchAssign) {
  submitLoading.value = true
  try {
    await dispatchAssign(dto)
    ElMessage.success(`已派工 ${dto.orderIds.length} 张工单`)
    dialogVisible.value = false
    selectedIds.value = []
    run()
  } finally { submitLoading.value = false }
}
</script>
```

> 注：`reserve-selection` 需 `row-key=id`（DataTable 默认 rowKey='id'）。派工成功后 `selectedIds=[]` 并 `run()` 重取列表（已派工工单从 statue=0 列表消失）。el-table 的勾选视觉会随数据刷新自动清空。

- [ ] **Step 3: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 4: Commit**

```bash
git add mes/vue3/src/views/order/dispatch
git commit -m "✨ feat(vue3): 员工作业派工页(待派工多选 + 班组级联作业员派工弹窗)"
```

---

## Task 8: 甘特纯函数 `src/utils/gantt.ts`（TDD）

**Files:**
- Create: `src/utils/gantt.ts`
- Test: `tests/gantt.spec.ts`

甘特几何/状态/分组/拖拽全部纯函数化。DAY_W=44px 每天宽。

- [ ] **Step 1: 写失败测试 `tests/gantt.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  parseDay, daysBetween, getDisplayStatus, computeRange, enumerateDays,
  timeToX, pxToDays, shiftPlanByDays, groupByResource, groupByOrder,
} from '@/utils/gantt'
import type { GanttTask } from '@/types/order'

const task = (o: Partial<GanttTask>): GanttTask => ({
  id: 'd1', orderId: 'o1', orderCode: 'OD1', dispatchStatus: 1, ...o,
})
// 2026-06-21 00:00 本地
const D = (s: string) => parseDay(s)!

describe('parseDay', () => {
  it('解析到本地 00:00 毫秒', () => {
    const ms = parseDay('2026-06-21 13:30:00')!
    const d = new Date(ms)
    expect(d.getHours()).toBe(0)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5)
    expect(d.getDate()).toBe(21)
  })
  it('空值返回 null', () => { expect(parseDay(undefined)).toBeNull(); expect(parseDay('')).toBeNull() })
})

describe('daysBetween', () => {
  it('整天差', () => { expect(daysBetween(D('2026-06-21'), D('2026-06-24'))).toBe(3) })
})

describe('getDisplayStatus', () => {
  const now = D('2026-06-21')
  it('有实际完工=completed', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-10', actualEndTime: '2026-06-12' }), now)).toBe('completed')
  })
  it('已开工未逾期=inProgress', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-20', planEndTime: '2026-06-25' }), now)).toBe('inProgress')
  })
  it('已开工且今日超计划结束=overdue', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-10', planEndTime: '2026-06-15' }), now)).toBe('overdue')
  })
  it('未开工=notStarted', () => {
    expect(getDisplayStatus(task({ planStartTime: '2026-06-22', planEndTime: '2026-06-25' }), now)).toBe('notStarted')
  })
})

describe('computeRange', () => {
  it('空任务回退到 now±3 天', () => {
    const now = D('2026-06-21')
    const r = computeRange([], now)
    expect(daysBetween(r.startMs, now)).toBe(3)
    expect(daysBetween(now, r.endMs)).toBe(3)
  })
  it('覆盖全部计划/实际边界', () => {
    const now = D('2026-06-21')
    const r = computeRange([task({ planStartTime: '2026-06-10', planEndTime: '2026-06-15' })], now)
    expect(r.startMs).toBeLessThanOrEqual(D('2026-06-10'))
    expect(r.endMs).toBeGreaterThanOrEqual(D('2026-06-15'))
  })
})

describe('enumerateDays', () => {
  it('逐天枚举闭区间', () => {
    const days = enumerateDays(D('2026-06-21'), D('2026-06-23'))
    expect(days.length).toBe(3)
    expect(days[0]).toBe(D('2026-06-21'))
  })
})

describe('timeToX', () => {
  it('按天宽换算 x', () => {
    expect(timeToX(D('2026-06-23'), D('2026-06-21'), 44)).toBe(88)
  })
})

describe('pxToDays', () => {
  it('像素按天宽四舍五入', () => {
    expect(pxToDays(88, 44)).toBe(2)
    expect(pxToDays(60, 44)).toBe(1)
  })
})

describe('shiftPlanByDays', () => {
  const t = task({ planStartTime: '2026-06-21 08:30:00', planEndTime: '2026-06-23 17:00:00' })
  it('move 平移两端、保留时分秒', () => {
    const r = shiftPlanByDays(t, 2, 'move')
    expect(r.planStartTime).toBe('2026-06-23 08:30:00')
    expect(r.planEndTime).toBe('2026-06-25 17:00:00')
  })
  it('resize-end 只移结束', () => {
    const r = shiftPlanByDays(t, 1, 'resize-end')
    expect(r.planStartTime).toBe('2026-06-21 08:30:00')
    expect(r.planEndTime).toBe('2026-06-24 17:00:00')
  })
  it('resize-start 只移开始', () => {
    const r = shiftPlanByDays(t, 1, 'resize-start')
    expect(r.planStartTime).toBe('2026-06-22 08:30:00')
    expect(r.planEndTime).toBe('2026-06-23 17:00:00')
  })
  it('resize-end 不得越过开始(至少留1天)', () => {
    const r = shiftPlanByDays(t, -10, 'resize-end')
    expect(daysBetween(parseDay(r.planStartTime!)!, parseDay(r.planEndTime!)!)).toBeGreaterThanOrEqual(1)
  })
})

describe('groupByResource', () => {
  it('班组→作业员两层，保持插入序', () => {
    const groups = groupByResource([
      task({ id: 'a', teamId: 't1', teamName: '班A', userId: 'u1', userName: '张' }),
      task({ id: 'b', teamId: 't1', teamName: '班A', userId: 'u1', userName: '张' }),
      task({ id: 'c', teamId: 't2', teamName: '班B', userId: 'u2', userName: '李' }),
    ])
    expect(groups.length).toBe(2)
    expect(groups[0].label).toBe('班A')
    expect(groups[0].rows.length).toBe(1)
    expect(groups[0].rows[0].tasks.length).toBe(2)
  })
})

describe('groupByOrder', () => {
  it('订单→工序，按 planStartTime 排序', () => {
    const groups = groupByOrder([
      task({ id: 'a', orderId: 'o1', orderCode: 'OD1', operName: '工序2', planStartTime: '2026-06-22' }),
      task({ id: 'b', orderId: 'o1', orderCode: 'OD1', operName: '工序1', planStartTime: '2026-06-20' }),
    ])
    expect(groups.length).toBe(1)
    expect(groups[0].rows[0].tasks[0].operName).toBe('工序1')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd mes/vue3 && pnpm test gantt`
Expected: FAIL（`@/utils/gantt` 不存在）

- [ ] **Step 3: 写实现 `src/utils/gantt.ts`**

```ts
// src/utils/gantt.ts —— 甘特几何/状态/分组/拖拽纯函数
import type { GanttTask } from '@/types/order'

const DAY_MS = 86400000

/** 解析 'yyyy-MM-dd[ HH:mm:ss]' 到当天本地 00:00 毫秒；空值 null */
export function parseDay(s?: string | null): number | null {
  if (!s) return null
  const m = String(s).slice(0, 10).split('-')
  if (m.length !== 3) return null
  const [y, mo, d] = m.map(Number)
  if (!y || !mo || !d) return null
  return new Date(y, mo - 1, d).getTime()
}

/** 向下取整到当天 00:00 */
export function floorDay(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function daysBetween(a: number, b: number): number {
  return Math.round((floorDay(b) - floorDay(a)) / DAY_MS)
}

export type DisplayStatus = 'notStarted' | 'inProgress' | 'overdue' | 'completed'

/** 派生视觉状态 */
export function getDisplayStatus(task: GanttTask, nowMs: number): DisplayStatus {
  if (task.actualEndTime) return 'completed'
  if (task.actualStartTime) {
    const planEnd = parseDay(task.planEndTime)
    if (planEnd !== null && nowMs > planEnd) return 'overdue'
    return 'inProgress'
  }
  return 'notStarted'
}

/** 计算时间窗：覆盖全部计划/实际边界，空任务回退 now±3 天 */
export function computeRange(tasks: GanttTask[], nowMs: number): { startMs: number; endMs: number } {
  const pts: number[] = []
  tasks.forEach((t) => {
    ;[t.planStartTime, t.planEndTime, t.actualStartTime, t.actualEndTime].forEach((s) => {
      const ms = parseDay(s)
      if (ms !== null) pts.push(ms)
    })
  })
  if (!pts.length) return { startMs: floorDay(nowMs) - 3 * DAY_MS, endMs: floorDay(nowMs) + 3 * DAY_MS }
  return { startMs: Math.min(...pts) - DAY_MS, endMs: Math.max(...pts) + DAY_MS }
}

/** 逐天枚举闭区间 [start,end] 的每天 00:00 */
export function enumerateDays(startMs: number, endMs: number): number[] {
  const out: number[] = []
  for (let d = floorDay(startMs); d <= floorDay(endMs); d += DAY_MS) out.push(d)
  return out
}

/** 日期→x 像素 */
export function timeToX(dateMs: number, rangeStart: number, dayWidth: number): number {
  return daysBetween(rangeStart, dateMs) * dayWidth
}

/** 像素位移→天数（四舍五入） */
export function pxToDays(deltaPx: number, dayWidth: number): number {
  return Math.round(deltaPx / dayWidth)
}

export type DragMode = 'move' | 'resize-start' | 'resize-end'

/** 拖拽后新计划时间（保留时分秒）；缩放至少留 1 天 */
export function shiftPlanByDays(task: GanttTask, deltaDays: number, mode: DragMode): { planStartTime?: string; planEndTime?: string } {
  const shift = (s: string | undefined, days: number): string | undefined => {
    if (!s) return s
    const time = String(s).slice(10) // ' HH:mm:ss' 或 ''
    const base = parseDay(s)
    if (base === null) return s
    const d = new Date(base + days * DAY_MS)
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return time ? `${ymd}${time}` : ymd
  }
  if (mode === 'move') {
    return { planStartTime: shift(task.planStartTime, deltaDays), planEndTime: shift(task.planEndTime, deltaDays) }
  }
  const ps = parseDay(task.planStartTime)
  const pe = parseDay(task.planEndTime)
  if (mode === 'resize-start') {
    if (ps !== null && pe !== null) {
      const newStart = floorDay(ps) + deltaDays * DAY_MS
      const clamped = Math.min(newStart, pe - DAY_MS)
      const days = daysBetween(ps, clamped)
      return { planStartTime: shift(task.planStartTime, days), planEndTime: task.planEndTime }
    }
    return { planStartTime: shift(task.planStartTime, deltaDays), planEndTime: task.planEndTime }
  }
  // resize-end
  if (ps !== null && pe !== null) {
    const newEnd = floorDay(pe) + deltaDays * DAY_MS
    const clamped = Math.max(newEnd, ps + DAY_MS)
    const days = daysBetween(pe, clamped)
    return { planStartTime: task.planStartTime, planEndTime: shift(task.planEndTime, days) }
  }
  return { planStartTime: task.planStartTime, planEndTime: shift(task.planEndTime, deltaDays) }
}

export interface GanttRow { id: string; label: string; sub?: string; tasks: GanttTask[] }
export interface GanttGroup { id: string; label: string; tag?: string; rows: GanttRow[] }

/** 资源视角：班组→作业员（保持插入序，作业员一行可多任务） */
export function groupByResource(tasks: GanttTask[]): GanttGroup[] {
  const groups: GanttGroup[] = []
  const gIdx = new Map<string, GanttGroup>()
  const rIdx = new Map<string, GanttRow>()
  tasks.forEach((t) => {
    const gid = t.teamId || '__noteam'
    let g = gIdx.get(gid)
    if (!g) { g = { id: gid, label: t.teamName || '未分组', rows: [] }; gIdx.set(gid, g); groups.push(g) }
    const rid = `${gid}::${t.userId || '__nouser'}`
    let r = rIdx.get(rid)
    if (!r) { r = { id: rid, label: t.userName || '未分配', tasks: [] }; rIdx.set(rid, r); g.rows.push(r) }
    r.tasks.push(t)
  })
  return groups
}

/** 订单视角：订单→工序（工序按 planStartTime 排序，一工序一行） */
export function groupByOrder(tasks: GanttTask[]): GanttGroup[] {
  const groups: GanttGroup[] = []
  const gIdx = new Map<string, GanttGroup>()
  tasks.forEach((t) => {
    let g = gIdx.get(t.orderId)
    if (!g) { g = { id: t.orderId, label: t.orderCode, tag: t.materielDesc, rows: [] }; gIdx.set(t.orderId, g); groups.push(g) }
    g.rows.push({ id: t.id, label: t.operName || '工序', sub: t.userName, tasks: [t] })
  })
  groups.forEach((g) => {
    g.rows.sort((a, b) => (parseDay(a.tasks[0].planStartTime) ?? 0) - (parseDay(b.tasks[0].planStartTime) ?? 0))
  })
  return groups
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd mes/vue3 && pnpm test gantt`
Expected: PASS（全部 gantt.spec 用例绿）

- [ ] **Step 5: Commit**

```bash
git add mes/vue3/src/utils/gantt.ts mes/vue3/tests/gantt.spec.ts
git commit -m "✅ test(vue3): 甘特纯函数 + 单测(几何/状态/分组/拖拽 shiftPlanByDays)"
```

---

## Task 9: 甘特任务详情抽屉 `TaskDetailSheet.vue`

**Files:**
- Create: `src/views/order/gantt/TaskDetailSheet.vue`

按 dispatchStatus 门控执行回填（1→开工、2→完工/进度、≥2→纠时、3→只读提示）。普通 ref 受控。

- [ ] **Step 1: 写 TaskDetailSheet.vue**

```vue
<template>
  <el-drawer :model-value="modelValue" :title="task?.orderCode ?? '任务详情'" size="420px" @update:model-value="(v) => emit('update:modelValue', v)">
    <template v-if="task">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="物料">{{ task.materielDesc || task.materiel || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ task.qty ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="工序">{{ task.operName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="班组">{{ task.teamName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="作业员">{{ task.userName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="计划">{{ task.planStartTime || '?' }} ~ {{ task.planEndTime || '?' }}</el-descriptions-item>
        <el-descriptions-item label="实际">{{ task.actualStartTime || '?' }} ~ {{ task.actualEndTime || '进行中' }}</el-descriptions-item>
      </el-descriptions>

      <div class="sheet-progress">
        <span>进度</span>
        <el-progress :percentage="task.progress ?? 0" :status="task.dispatchStatus === 3 ? 'success' : undefined" />
      </div>

      <!-- status=1 已派工：记录开工 -->
      <el-card v-if="task.dispatchStatus === 1" shadow="never" class="sheet-card">
        <div class="sheet-card__title">记录开工</div>
        <el-date-picker v-model="actStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="留空取当前时间" style="width: 100%" />
        <el-button type="primary" :loading="busy" style="margin-top: 8px" @click="emit('start', task.id, actStart)">确认开工</el-button>
      </el-card>

      <!-- status=2 已开工：完工 + 进度 -->
      <template v-if="task.dispatchStatus === 2">
        <el-card shadow="never" class="sheet-card">
          <div class="sheet-card__title">更新进度</div>
          <el-input-number v-model="prog" :min="0" :max="100" controls-position="right" style="width: 100%" />
          <el-button type="primary" :loading="busy" style="margin-top: 8px" @click="emit('progress', task.id, prog)">保存进度</el-button>
        </el-card>
        <el-card shadow="never" class="sheet-card">
          <div class="sheet-card__title">记录完工</div>
          <el-date-picker v-model="actEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="留空取当前时间" style="width: 100%" />
          <el-button type="success" :loading="busy" style="margin-top: 8px" @click="emit('finish', task.id, actEnd)">确认完工</el-button>
        </el-card>
      </template>

      <!-- status>=2：纠时 -->
      <el-card v-if="task.dispatchStatus >= 2" shadow="never" class="sheet-card">
        <div class="sheet-card__title">纠正实际时间</div>
        <el-date-picker v-model="actStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="实际开始" style="width: 100%; margin-bottom: 8px" />
        <el-date-picker v-model="actEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="实际结束" style="width: 100%" />
        <el-button :loading="busy" style="margin-top: 8px" @click="emit('adjust', task.id, actStart, actEnd)">保存纠时</el-button>
      </el-card>

      <el-alert v-if="task.dispatchStatus === 3" type="success" :closable="false" title="任务已完工，仅可纠正实际时间" style="margin-top: 12px" />
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { GanttTask } from '@/types/order'

const props = defineProps<{ modelValue: boolean; task: GanttTask | null; busy?: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  start: [string, string]
  finish: [string, string]
  progress: [string, number]
  adjust: [string, string, string]
}>()

const actStart = ref('')
const actEnd = ref('')
const prog = ref(0)

watch(
  () => props.task,
  (t) => {
    actStart.value = t?.actualStartTime ?? ''
    actEnd.value = t?.actualEndTime ?? ''
    prog.value = t?.progress ?? 0
  },
  { immediate: true },
)
</script>

<style scoped>
.sheet-progress { margin: 16px 0; display: flex; flex-direction: column; gap: 6px; }
.sheet-card { margin-top: 12px; }
.sheet-card__title { font-weight: 600; margin-bottom: 8px; }
</style>
```

- [ ] **Step 2: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/order/gantt/TaskDetailSheet.vue
git commit -m "✨ feat(vue3): 甘特任务详情抽屉(按状态门控开工/进度/完工/纠时)"
```

---

## Task 10: 甘特图组件 `GanttChart.vue`

**Files:**
- Create: `src/views/order/gantt/GanttChart.vue`

自研 CSS/div：左粘性标签列 + 右按天网格 + 计划条(灰,上)/实际条(状态色,下) + 今日红线 + plan 条拖拽（move/resize）。

- [ ] **Step 1: 写 GanttChart.vue**

```vue
<template>
  <div class="gantt" :style="{ '--day-w': dayW + 'px', '--label-w': labelW + 'px' }">
    <!-- 时间轴 -->
    <div class="gantt__axis" :style="{ paddingLeft: labelW + 'px', width: labelW + days.length * dayW + 'px' }">
      <div v-for="d in days" :key="d" class="gantt__day">{{ fmtDay(d) }}</div>
    </div>

    <div class="gantt__body" :style="{ width: labelW + days.length * dayW + 'px' }">
      <!-- 今日红线 -->
      <div class="gantt__today" :style="{ left: labelW + timeToX(floorNow, rangeStart, dayW) + dayW / 2 + 'px' }" />

      <template v-for="g in groups" :key="g.id">
        <div class="gantt__group">
          <span class="gantt__group-label">{{ g.label }}</span>
          <el-tag v-if="g.tag" size="small" type="info">{{ g.tag }}</el-tag>
        </div>
        <div v-for="row in g.rows" :key="row.id" class="gantt__row">
          <div class="gantt__row-label">
            <div>{{ row.label }}</div>
            <small v-if="row.sub">{{ row.sub }}</small>
          </div>
          <div class="gantt__track" :style="{ width: days.length * dayW + 'px' }">
            <template v-for="t in row.tasks" :key="t.id">
              <!-- 计划条（可拖拽） -->
              <div
                v-if="planBar(t)"
                class="gantt__bar gantt__bar--plan"
                :style="planBar(t)!"
                :title="planTitle(t)"
                @pointerdown="(e) => onPointerDown(e, t)"
              >
                <span class="gantt__handle gantt__handle--l" />
                <span class="gantt__handle gantt__handle--r" />
              </div>
              <!-- 实际条（点击开抽屉） -->
              <div
                v-if="actualBar(t)"
                class="gantt__bar gantt__bar--actual"
                :class="`is-${statusOf(t)}`"
                :style="actualBar(t)!"
                :title="actualTitle(t)"
                @click="emit('task-click', t)"
              >
                <span class="gantt__bar-progress" :style="{ width: (t.progress ?? 0) + '%' }" />
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  computeRange, enumerateDays, timeToX, parseDay, floorDay, daysBetween,
  getDisplayStatus, pxToDays, shiftPlanByDays,
  type GanttGroup, type DragMode,
} from '@/utils/gantt'
import type { GanttTask } from '@/types/order'

const props = defineProps<{ groups: GanttGroup[]; tasks: GanttTask[]; nowMs: number }>()
const emit = defineEmits<{
  'task-click': [GanttTask]
  reschedule: [GanttTask, { planStartTime?: string; planEndTime?: string }]
}>()

const dayW = 44
const labelW = 176
const floorNow = computed(() => floorDay(props.nowMs))

const range = computed(() => computeRange(props.tasks, props.nowMs))
const rangeStart = computed(() => range.value.startMs)
const days = computed(() => enumerateDays(range.value.startMs, range.value.endMs))

function fmtDay(ms: number): string {
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function statusOf(t: GanttTask) { return getDisplayStatus(t, props.nowMs) }

// 拖拽预览覆盖：taskId → deltaDays + mode
const dragId = ref<string | null>(null)
const dragMode = ref<DragMode>('move')
const dragDelta = ref(0)
let startX = 0

function effective(t: GanttTask): GanttTask {
  if (dragId.value === t.id && dragDelta.value !== 0) {
    const s = shiftPlanByDays(t, dragDelta.value, dragMode.value)
    return { ...t, ...s }
  }
  return t
}

function planBar(t0: GanttTask): Record<string, string> | null {
  const t = effective(t0)
  const ps = parseDay(t.planStartTime); const pe = parseDay(t.planEndTime)
  if (ps === null || pe === null) return null
  const x = timeToX(ps, rangeStart.value, dayW)
  const w = (daysBetween(ps, pe) + 1) * dayW
  return { left: x + 'px', width: w + 'px' }
}
function actualBar(t: GanttTask): Record<string, string> | null {
  const as = parseDay(t.actualStartTime)
  if (as === null) return null
  const end = parseDay(t.actualEndTime) ?? floorNow.value
  const x = timeToX(as, rangeStart.value, dayW)
  const w = (daysBetween(as, end) + 1) * dayW
  return { left: x + 'px', width: w + 'px' }
}
function planTitle(t: GanttTask) { return `计划 ${t.planStartTime ?? '?'} ~ ${t.planEndTime ?? '?'}` }
function actualTitle(t: GanttTask) { return `实际 ${t.actualStartTime ?? '?'} ~ ${t.actualEndTime ?? '进行中'}（${t.progress ?? 0}%）` }

function onPointerDown(e: PointerEvent, t: GanttTask) {
  e.stopPropagation()
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const off = e.clientX - rect.left
  dragMode.value = off < 8 ? 'resize-start' : off > rect.width - 8 ? 'resize-end' : 'move'
  dragId.value = t.id
  dragDelta.value = 0
  startX = e.clientX
  el.setPointerCapture(e.pointerId)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', (ev) => onUp(ev, t, el), { once: true })
}
function onMove(e: PointerEvent) {
  dragDelta.value = pxToDays(e.clientX - startX, dayW)
}
function onUp(e: PointerEvent, t: GanttTask, el: HTMLElement) {
  el.removeEventListener('pointermove', onMove)
  const delta = dragDelta.value
  const mode = dragMode.value
  dragId.value = null
  dragDelta.value = 0
  if (delta === 0) { emit('task-click', t); return }
  emit('reschedule', t, shiftPlanByDays(t, delta, mode))
}
</script>

<style scoped>
.gantt { overflow-x: auto; font-size: 12px; }
.gantt__axis { display: flex; position: sticky; top: 0; z-index: 3; background: var(--el-bg-color); border-bottom: 1px solid var(--el-border-color); }
.gantt__day { width: var(--day-w); flex: 0 0 var(--day-w); text-align: center; color: var(--el-text-color-secondary); padding: 4px 0; }
.gantt__body { position: relative; }
.gantt__today { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--el-color-danger); z-index: 2; }
.gantt__group { display: flex; align-items: center; gap: 8px; height: 30px; padding-left: 8px; background: var(--el-fill-color-light); font-weight: 600; position: sticky; left: 0; }
.gantt__row { display: flex; height: 40px; border-bottom: 1px solid var(--el-border-color-lighter); }
.gantt__row-label { width: var(--label-w); flex: 0 0 var(--label-w); padding: 4px 8px; position: sticky; left: 0; background: var(--el-bg-color); z-index: 1; border-right: 1px solid var(--el-border-color-lighter); }
.gantt__row-label small { color: var(--el-text-color-secondary); }
.gantt__track { position: relative; }
.gantt__bar { position: absolute; height: 14px; border-radius: 4px; }
.gantt__bar--plan { top: 4px; background: var(--el-color-info-light-5); cursor: grab; }
.gantt__bar--actual { top: 20px; height: 16px; overflow: hidden; cursor: pointer; background: var(--el-color-info); }
.gantt__bar--actual.is-notStarted { background: var(--el-color-info); }
.gantt__bar--actual.is-inProgress { background: var(--el-color-warning); }
.gantt__bar--actual.is-overdue { background: var(--el-color-danger); }
.gantt__bar--actual.is-completed { background: var(--el-color-success); }
.gantt__bar-progress { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(255,255,255,0.35); }
.gantt__handle { position: absolute; top: 0; bottom: 0; width: 6px; cursor: ew-resize; }
.gantt__handle--l { left: 0; }
.gantt__handle--r { right: 0; }
</style>
```

- [ ] **Step 2: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/order/gantt/GanttChart.vue
git commit -m "✨ feat(vue3): 自研甘特图(CSS/div 双条+状态色+今日线+plan条拖拽改期)"
```

---

## Task 11: 甘特页编排 `GanttPage.vue`

**Files:**
- Create: `src/views/order/gantt/GanttPage.vue`

- [ ] **Step 1: 写 GanttPage.vue**

```vue
<template>
  <PageContainer>
    <div class="gantt-toolbar">
      <el-input v-model="filters.orderCode" placeholder="工单编号" clearable style="width: 180px" @keyup.enter="reload" />
      <el-select v-model="filters.teamId" placeholder="全部班组" clearable style="width: 180px">
        <el-option v-for="t in teams" :key="t.id" :label="t.name" :value="t.id" />
      </el-select>
      <el-button type="primary" @click="reload">查询</el-button>
      <el-radio-group v-model="view" style="margin-left: auto">
        <el-radio-button value="resource">资源视角</el-radio-button>
        <el-radio-button value="order">订单视角</el-radio-button>
      </el-radio-group>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-empty v-else-if="!filtered.length" description="暂无甘特任务" />
    <GanttChart
      v-else
      :groups="groups"
      :tasks="filtered"
      :now-ms="nowMs"
      @task-click="onTaskClick"
      @reschedule="onReschedule"
    />

    <TaskDetailSheet
      v-model="sheetVisible"
      :task="activeTask"
      :busy="busy"
      @start="onStart"
      @finish="onFinish"
      @progress="onProgress"
      @adjust="onAdjust"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import GanttChart from './GanttChart.vue'
import TaskDetailSheet from './TaskDetailSheet.vue'
import { useRequest } from '@/composables/useRequest'
import { ganttTasks, ganttReschedule, ganttStart, ganttFinish, ganttProgress, ganttActual } from '@/api/order/gantt'
import { dispatchTeams } from '@/api/order/dispatch'
import { groupByResource, groupByOrder } from '@/utils/gantt'
import type { GanttTask, SpTeamOption } from '@/types/order'

const nowMs = Date.now()
const view = ref<'resource' | 'order'>('resource')
const filters = reactive({ orderCode: '', teamId: '' })

const { data: taskData, loading, run } = useRequest(() => ganttTasks(), { immediate: true })
const allTasks = computed<GanttTask[]>(() => taskData.value ?? [])

const teams = ref<SpTeamOption[]>([])
dispatchTeams().then((t) => (teams.value = t)).catch(() => {})

const filtered = computed(() =>
  allTasks.value.filter(
    (t) =>
      (!filters.orderCode || (t.orderCode ?? '').includes(filters.orderCode)) &&
      (!filters.teamId || t.teamId === filters.teamId),
  ),
)
const groups = computed(() => (view.value === 'resource' ? groupByResource(filtered.value) : groupByOrder(filtered.value)))

function reload() { run() }

// 详情抽屉
const sheetVisible = ref(false)
const activeId = ref<string | null>(null)
const activeTask = computed(() => filtered.value.find((t) => t.id === activeId.value) ?? null)
const busy = ref(false)
function onTaskClick(t: GanttTask) { activeId.value = t.id; sheetVisible.value = true }

async function withBusy(fn: () => Promise<void>, okMsg: string) {
  busy.value = true
  try { await fn(); ElMessage.success(okMsg); run() } finally { busy.value = false }
}

async function onReschedule(t: GanttTask, body: { planStartTime?: string; planEndTime?: string }) {
  if (!body.planStartTime || !body.planEndTime) return
  await withBusy(() => ganttReschedule({ id: t.id, planStartTime: body.planStartTime!, planEndTime: body.planEndTime! }), '改期成功')
}
async function onStart(id: string, actualStartTime: string) {
  await withBusy(() => ganttStart({ id, actualStartTime: actualStartTime || undefined }), '已记录开工')
  sheetVisible.value = false
}
async function onFinish(id: string, actualEndTime: string) {
  await withBusy(() => ganttFinish({ id, actualEndTime: actualEndTime || undefined }), '已记录完工')
  sheetVisible.value = false
}
async function onProgress(id: string, progress: number) {
  await withBusy(() => ganttProgress({ id, progress }), '进度已更新')
}
async function onAdjust(id: string, actualStartTime: string, actualEndTime: string) {
  await withBusy(() => ganttActual({ id, actualStartTime: actualStartTime || undefined, actualEndTime: actualEndTime || undefined }), '纠时成功')
}
</script>

<style scoped>
.gantt-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
</style>
```

- [ ] **Step 2: 全门禁**

Run: `cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: typecheck 0；test 全绿（order + gantt + 既有）；lint 0 error；build 成功（甘特/order 视图进 chunk）。lint 若报新代码 warning（如 `no-explicit-any`）按既有降 warn 规则不阻断；error 必须 0。

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/order/gantt/GanttPage.vue
git commit -m "✨ feat(vue3): 甘特页编排(双视角+过滤+拖拽改期+执行回填,成功 refetch)"
```

---

## Task 12: 后端审查（按「每周期必审」约定）

**Files:**
- Read-only 审查：`mes/src/main/java/com/wangziyang/mes/order/**`
- 若发现暴露 bug：最小修 + `mes/src/test/java/com/wangziyang/mes/order/Cycle1dBackendTest.java`（Mockito 守卫）

后端默认零改动。本任务为「审查」，仅当发现**暴露出来的正确性 bug** 才动手。

- [ ] **Step 1: 派审查子代理**

派一个 subagent 读以下文件，判定有无暴露的正确性 bug（不做越界重构、不修 latent/性能项，记 backlog）：
- `SpOrderController` / `SpOrderServiceImpl`：add-or-update 是否假成功（无 return）、是否缺 `@Transactional`、delete 物理删有无副作用、page 排序。
- `SpDispatchServiceImpl`：assign 是否 `@Transactional`、statue 0→1 一致、dispatchStatus 初值=1、orderIds 批量处理无遗漏。
- `SpGanttServiceImpl`：5 写端点状态机守卫（reschedule 非3 / start 1→2 / finish 2→3 且 progress=100 / progress status=2 / actual status≥2 + 部分更新）与时间校验是否正确。
- 确认是否已有 gantt 守卫的后端单测（mes-new 周期写过 15 例 Mockito）；若该测试**不在本 `mes` 工程**测试目录，按需补 `Cycle1dBackendTest`。

约定：`Result extends HashMap`（取 `get("code")`，成功 0 失败 1）；JUnit4 `@RunWith(MockitoJUnitRunner)`；MyBatis-Plus 3.1.2 `count()` 返回 `int`。

- [ ] **Step 2: 若无暴露 bug**

记录「审查结论：无暴露 bug」到 spec/roadmap，**不改任何后端文件**，直接进 Step 4。

- [ ] **Step 3: 若有暴露 bug（按需）**

最小修复 + 补 Mockito 守卫单测，跑：

Run: `cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q -pl . test -Dtest=Cycle1dBackendTest`
Expected: 守卫单测全绿（参考 [[backend-build-mvnw-broken]]：mvnw 损坏，用 JDK11 系统 mvn）。

- [ ] **Step 4: Commit（仅当有改动）**

```bash
git add mes/src/main/java/com/wangziyang/mes/order mes/src/test/java/com/wangziyang/mes/order
git commit -m "🐛 fix(backend): 计划模块审查修正 + Mockito 守卫单测"
```

---

## Task 13: 收尾 — 路线图更新 + 合并

**Files:**
- Modify: `mes/vue3/docs/ROADMAP.md`

- [ ] **Step 1: 更新 ROADMAP.md**

在「9.4 计划 order」矩阵把工单下达/派工/甘特三行状态改 ✅；在「11. 当前进度快照」追加 1d 完成条目（分支、交付、纯函数清单、后端审查结论、门禁结果、待人工冒烟项）。把「8. 开发周期划分」的 1d 标 ✅。

- [ ] **Step 2: 最终全门禁**

Run: `cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: 全绿。

- [ ] **Step 3: Commit + 合并 develop**

```bash
git add mes/vue3/docs/ROADMAP.md
git commit -m "📝 docs(vue3): 路线图更新 — 子周期 1d 计划(工单/派工/甘特)完成"
git checkout develop
git merge --no-ff feature/order-planning -m "🔀 Merge: 子周期 1d 计划(工单/派工/甘特)完成 (feature/order-planning → develop)"
```

- [ ] **Step 4: 人工冒烟提示**

提示用户：启动后端 9090 + DB 已跑 `dispatch-management.sql` + `gantt-migration.sql`（+可选 `gantt-mock-seed.sql`）后，浏览器 `:4200`（`admin/123`）按 spec §11 验收三屏。develop 超前 origin，用户自行 push。

---

## Self-Review（计划自检）

- **Spec 覆盖：** §3 工单CRUD→Task1/2/6；§4 API/类型→Task1/2；§5 派工→Task4(多选)/7；§6 甘特双视角→Task8(groupBy*)；§6 拖拽改期→Task8(shiftPlanByDays)+Task10；§6 执行回填→Task9/11；§3 路由菜单→Task5；§8 后端审查→Task12；§9 门禁→各任务+Task13；§9 路线图/合并→Task13。无遗漏。
- **Placeholder 扫描：** 无 TBD/TODO；所有 step 含实际代码或精确命令。SpMaterile/SpFlow 字段名在 Task6 显式提示「以 types 文件为准」，非占位（已给默认 materielCode/materielDesc/flow）。
- **类型一致性：** `GanttTask`/`SpOrder`/`SpDispatchAssign` 全程一致；`shiftPlanByDays`/`groupByResource`/`groupByOrder`/`GanttGroup`/`GanttRow`/`DragMode` 在 Task8 定义、Task10 消费签名吻合；事件名 `reschedule`/`task-click`/`start`/`finish`/`progress`/`adjust` 在组件 emit 与父 GanttPage 监听一致。
- **DataTable selectable：** Task4 加的 prop/emit 在 Task7 DispatchList 消费一致（`selectable` + `@selection-change`）。
