# 动态主数据(Cycle 3b)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 vue3 课程作业前端(`mes/vue3`)交付动态主数据两页——Layer1 动态表配置(`/basedata/manager`,列表+大弹窗)与 Layer2 通用动态数据维护(`/basedata/manager-item`,主从单页),对接已存在且已加固的后端,零后端生产代码改动。

**Architecture:** 纯函数(`utils/manager.ts` + `utils/managerData.ts`)承载校验/payload 构造逻辑并 TDD;API 层(`api/basedata/manager.ts` + `managerData.ts`)封装 7 端点并区分 form/JSON 编码;视图层复用既有原语 `DataTable`/`FormDialog`/`MasterDetailLayout` + composables `useRequest`/`usePagination`/`v-permission`。Layer1 用列表+大弹窗(表头+可排序明细行),Layer2 用主从(左选表→右按字段元数据动态渲染列与行表单)。

**Tech Stack:** Vue3 `<script setup>` + TS + Element Plus + Pinia;`@/api/request` 的 `http.post(url, data, json?)`(json=true 走 JSON,否则 form-urlencoded);vitest node 环境纯函数测试(`tests/*.spec.ts`)。

---

## 文件结构

**新建:**
- `src/types/manager.ts` — 类型:`SpTableManager` / `SpTableManagerItem` / `SpTableManagerDto` / `ManagerPageReq` / `ManagerDataPageReq` / `ManagerDataRow`
- `src/utils/manager.ts` — Layer1 纯函数(parseMustFill / validateManagerForm / buildUpsertPayload / moveRow)
- `src/utils/managerData.ts` — Layer2 纯函数(buildColumns / emptyRow / validateRow / buildDataPayload)
- `src/api/basedata/manager.ts` — Layer1 4 端点
- `src/api/basedata/managerData.ts` — Layer2 3 端点
- `src/views/basedata/manager/ManagerList.vue` — Layer1 列表页
- `src/views/basedata/manager/ManagerForm.vue` — Layer1 编辑大弹窗
- `src/views/basedata/manager-item/ManagerDataPage.vue` — Layer2 主从页
- `src/views/basedata/manager-item/ManagerDataForm.vue` — Layer2 动态行弹窗
- `tests/manager.spec.ts` — Layer1 纯函数测试
- `tests/managerData.spec.ts` — Layer2 纯函数测试
- `scripts/sql/manager-menu-seed.sql` — 幂等菜单种子(仅当 dev DB 缺 105/106 时)

**修改:**
- `src/utils/urlMap.ts` — +2 映射
- `src/router/index.ts` — +2 路由

---

## Task 1: 类型定义 `types/manager.ts`

**Files:**
- Create: `src/types/manager.ts`

- [ ] **Step 1: 写类型文件**

```ts
import type { PageReq, IPage } from '@/types/system'

export type { IPage }

/** 动态表表头(sp_table_manager) */
export interface SpTableManager {
  id?: string
  tableName: string
  tableDesc: string
  permission?: string
  isDeleted?: string
}

/** 字段明细(sp_table_manager_item) */
export interface SpTableManagerItem {
  id?: string
  tableNameId?: string
  field: string
  fieldDesc: string
  sortNum?: number
  /** 读容忍 Y/y/1;写回统一 "1"/"0" */
  mustFill?: string
}

/** Layer1 整体保存 DTO(表头 + 明细) */
export interface SpTableManagerDto extends SpTableManager {
  spTableManagerItems: SpTableManagerItem[]
}

/** Layer1 列表分页请求 */
export interface ManagerPageReq extends PageReq {
  tableName?: string
  tableDesc?: string
}

/** Layer2 动态数据分页请求 */
export interface ManagerDataPageReq extends PageReq {
  tableName: string
  tableNameId: string
}

/** Layer2 动态数据行(后端返回 Map<String,String>) */
export type ManagerDataRow = Record<string, string>
```

- [ ] **Step 2: typecheck 通过**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 退出码 0(无报错)

- [ ] **Step 3: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/types/manager.ts
git commit -m "✨ feat(vue3): 3b 动态主数据类型定义(SpTableManager/Item/Dto)"
```

---

## Task 2: Layer1 纯函数 `utils/manager.ts`(TDD)

**Files:**
- Test: `tests/manager.spec.ts`
- Create: `src/utils/manager.ts`

- [ ] **Step 1: 写失败测试**

写 `tests/manager.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  parseMustFill,
  validateManagerForm,
  buildUpsertPayload,
  moveRow,
} from '@/utils/manager'
import type { SpTableManager, SpTableManagerItem } from '@/types/manager'

describe('parseMustFill', () => {
  it('Y/y/1 → true,其余 → false', () => {
    expect(parseMustFill('Y')).toBe(true)
    expect(parseMustFill('y')).toBe(true)
    expect(parseMustFill('1')).toBe(true)
    expect(parseMustFill('0')).toBe(false)
    expect(parseMustFill('N')).toBe(false)
    expect(parseMustFill(undefined)).toBe(false)
  })
})

describe('validateManagerForm', () => {
  const header = (p: Partial<SpTableManager> = {}): SpTableManager => ({ tableName: 'sp_demo', tableDesc: '演示', ...p })
  const rows = (): SpTableManagerItem[] => [{ field: 'code', fieldDesc: '编码' }]

  it('齐全 → null', () => {
    expect(validateManagerForm(header(), rows())).toBeNull()
  })
  it('表名空 → 报错', () => {
    expect(validateManagerForm(header({ tableName: '  ' }), rows())).toContain('表名')
  })
  it('明细为空 → 报错', () => {
    expect(validateManagerForm(header(), [])).toContain('字段')
  })
  it('字段名为空 → 报错', () => {
    expect(validateManagerForm(header(), [{ field: ' ', fieldDesc: 'x' }])).toContain('字段名')
  })
  it('字段名重复 → 报错', () => {
    expect(
      validateManagerForm(header(), [
        { field: 'code', fieldDesc: 'a' },
        { field: 'code', fieldDesc: 'b' },
      ]),
    ).toContain('重复')
  })
})

describe('buildUpsertPayload', () => {
  it('mustFill 归一为 "1"/"0"、按序生成 sortNum(从1)、剥 item id', () => {
    const out = buildUpsertPayload(
      { tableName: 'sp_demo', tableDesc: '演示' },
      [
        { id: 'old1', field: 'code', fieldDesc: '编码', mustFill: 'Y' },
        { id: 'old2', field: 'name', fieldDesc: '名称', mustFill: '0' },
      ],
    )
    expect(out.tableName).toBe('sp_demo')
    expect(out.id).toBeUndefined()
    expect(out.spTableManagerItems).toEqual([
      { field: 'code', fieldDesc: '编码', mustFill: '1', sortNum: 1 },
      { field: 'name', fieldDesc: '名称', mustFill: '0', sortNum: 2 },
    ])
  })
  it('编辑(传 existingId)→ 表头带 id', () => {
    const out = buildUpsertPayload({ tableName: 'sp_demo', tableDesc: 'x' }, [{ field: 'code', fieldDesc: '编码' }], 'H1')
    expect(out.id).toBe('H1')
  })
})

describe('moveRow', () => {
  const r = (): SpTableManagerItem[] => [
    { field: 'a', fieldDesc: 'A' },
    { field: 'b', fieldDesc: 'B' },
    { field: 'c', fieldDesc: 'C' },
  ]
  it('下移', () => {
    expect(moveRow(r(), 0, 'down').map((x) => x.field)).toEqual(['b', 'a', 'c'])
  })
  it('上移', () => {
    expect(moveRow(r(), 2, 'up').map((x) => x.field)).toEqual(['a', 'c', 'b'])
  })
  it('越界返回原序', () => {
    expect(moveRow(r(), 0, 'up').map((x) => x.field)).toEqual(['a', 'b', 'c'])
    expect(moveRow(r(), 2, 'down').map((x) => x.field)).toEqual(['a', 'b', 'c'])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd mes/vue3 && pnpm test -- manager.spec`
Expected: FAIL（`Cannot find module '@/utils/manager'`）

- [ ] **Step 3: 写实现**

写 `src/utils/manager.ts`:

```ts
import type { SpTableManager, SpTableManagerItem, SpTableManagerDto } from '@/types/manager'

/** 必填读取:Y/y/1 视为必填 */
export function parseMustFill(raw?: string): boolean {
  return raw === 'Y' || raw === 'y' || raw === '1'
}

/** 表单校验:返回首个错误文案,合法则 null */
export function validateManagerForm(header: SpTableManager, rows: SpTableManagerItem[]): string | null {
  if (!header.tableName?.trim()) return '表名不能为空'
  if (!rows.length) return '至少配置一个字段'
  for (const r of rows) {
    if (!r.field?.trim()) return '字段名不能为空'
  }
  const fields = rows.map((r) => r.field.trim())
  if (new Set(fields).size !== fields.length) return '字段名不能重复'
  return null
}

/** 构造整体保存 payload:mustFill→"1"/"0"、按行序生成 sortNum(从1)、剥离 item id、编辑回带表头 id */
export function buildUpsertPayload(
  header: SpTableManager,
  rows: SpTableManagerItem[],
  existingId?: string,
): SpTableManagerDto {
  const items: SpTableManagerItem[] = rows.map((r, i) => ({
    field: r.field.trim(),
    fieldDesc: r.fieldDesc?.trim() ?? '',
    mustFill: parseMustFill(r.mustFill) ? '1' : '0',
    sortNum: i + 1,
  }))
  return {
    ...(existingId ? { id: existingId } : {}),
    tableName: header.tableName.trim(),
    tableDesc: header.tableDesc?.trim() ?? '',
    spTableManagerItems: items,
  }
}

/** 行上/下移(纯函数,越界返回原数组) */
export function moveRow(
  rows: SpTableManagerItem[],
  index: number,
  dir: 'up' | 'down',
): SpTableManagerItem[] {
  const target = dir === 'up' ? index - 1 : index + 1
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return rows
  const next = [...rows]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd mes/vue3 && pnpm test -- manager.spec`
Expected: PASS(全部用例绿)

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/manager.ts mes/vue3/tests/manager.spec.ts
git commit -m "✨ feat(vue3): 3b Layer1 纯函数 utils/manager + TDD(parseMustFill/validate/buildUpsert/moveRow)"
```

---

## Task 3: Layer2 纯函数 `utils/managerData.ts`(TDD)

**Files:**
- Test: `tests/managerData.spec.ts`
- Create: `src/utils/managerData.ts`

- [ ] **Step 1: 写失败测试**

写 `tests/managerData.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildColumns, emptyRow, validateRow, buildDataPayload } from '@/utils/managerData'
import type { SpTableManagerItem } from '@/types/manager'

const items: SpTableManagerItem[] = [
  { field: 'code', fieldDesc: '编码', sortNum: 2, mustFill: '1' },
  { field: 'name', fieldDesc: '名称', sortNum: 1, mustFill: '0' },
]

describe('buildColumns', () => {
  it('按 sortNum 升序映射 field/label', () => {
    expect(buildColumns(items)).toEqual([
      { field: 'name', label: '名称' },
      { field: 'code', label: '编码' },
    ])
  })
  it('fieldDesc 缺失退化为 field', () => {
    expect(buildColumns([{ field: 'x', fieldDesc: '' }])).toEqual([{ field: 'x', label: 'x' }])
  })
})

describe('emptyRow', () => {
  it('各字段初值空串', () => {
    expect(emptyRow(items)).toEqual({ code: '', name: '' })
  })
})

describe('validateRow', () => {
  it('必填(mustFill)字段空 → 报错', () => {
    expect(validateRow(items, { code: '', name: 'x' })).toContain('编码')
  })
  it('必填齐全 → null(非必填可空)', () => {
    expect(validateRow(items, { code: 'C1', name: '' })).toBeNull()
  })
})

describe('buildDataPayload', () => {
  it('平铺白名单字段 + jsTableName/jsTableNameId,新增不带 id', () => {
    expect(buildDataPayload(items, { code: 'C1', name: '产品', extra: 'x' }, 'sp_demo', 'T1')).toEqual({
      jsTableName: 'sp_demo',
      jsTableNameId: 'T1',
      code: 'C1',
      name: '产品',
    })
  })
  it('编辑(传 id)→ 带 id', () => {
    const out = buildDataPayload(items, { code: 'C1', name: '产品' }, 'sp_demo', 'T1', 'ROW9')
    expect(out.id).toBe('ROW9')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd mes/vue3 && pnpm test -- managerData.spec`
Expected: FAIL（`Cannot find module '@/utils/managerData'`）

- [ ] **Step 3: 写实现**

写 `src/utils/managerData.ts`:

```ts
import type { SpTableManagerItem } from '@/types/manager'
import { parseMustFill } from '@/utils/manager'

/** 字段明细 → 动态列定义(按 sortNum 升序,缺失退化为字段名) */
export function buildColumns(items: SpTableManagerItem[]): { field: string; label: string }[] {
  return [...items]
    .sort((a, b) => (a.sortNum ?? 0) - (b.sortNum ?? 0))
    .map((it) => ({ field: it.field, label: it.fieldDesc?.trim() || it.field }))
}

/** 新建行初值:各配置字段空串 */
export function emptyRow(items: SpTableManagerItem[]): Record<string, string> {
  const row: Record<string, string> = {}
  for (const it of items) row[it.field] = ''
  return row
}

/** 行校验:必填字段(mustFill)不能空,返回首个错误文案,合法 null */
export function validateRow(items: SpTableManagerItem[], values: Record<string, string>): string | null {
  for (const it of items) {
    if (parseMustFill(it.mustFill) && !values[it.field]?.trim()) {
      return `${it.fieldDesc?.trim() || it.field} 不能为空`
    }
  }
  return null
}

/** 构造 form 平铺 body:仅白名单字段值 + jsTableName/jsTableNameId + 可选 id */
export function buildDataPayload(
  items: SpTableManagerItem[],
  values: Record<string, string>,
  tableName: string,
  tableNameId: string,
  id?: string,
): Record<string, string> {
  const body: Record<string, string> = { jsTableName: tableName, jsTableNameId: tableNameId }
  for (const it of items) body[it.field] = values[it.field] ?? ''
  if (id) body.id = id
  return body
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd mes/vue3 && pnpm test -- managerData.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/managerData.ts mes/vue3/tests/managerData.spec.ts
git commit -m "✨ feat(vue3): 3b Layer2 纯函数 utils/managerData + TDD(buildColumns/emptyRow/validateRow/buildDataPayload)"
```

---

## Task 4: API 层(Layer1 + Layer2)

**Files:**
- Create: `src/api/basedata/manager.ts`
- Create: `src/api/basedata/managerData.ts`

- [ ] **Step 1: 写 Layer1 API**

写 `src/api/basedata/manager.ts`:

```ts
import { http } from '@/api/request'
import type { SpTableManager, SpTableManagerItem, SpTableManagerDto, ManagerPageReq, IPage } from '@/types/manager'

/** 列表分页(form) */
export const managerPage = (req: ManagerPageReq) =>
  http.post<IPage<SpTableManager>>('/basedata/manager/page', req)

/** 字段明细(form,@RequestParam tableNameId) */
export const managerItemsByTableNameId = (tableNameId: string) =>
  http.post<SpTableManagerItem[]>('/basedata/manager/item/by/tableNameId', { tableNameId })

/** 整体保存表头+明细(JSON)→ 返回表头 id */
export const managerAddOrUpdate = (dto: SpTableManagerDto) =>
  http.post<string>('/basedata/manager/add-or-update', dto, true)

/** 级联删除(form) */
export const managerDelete = (id: string) =>
  http.post<void>('/basedata/manager/delete/by/tableNameId', { id })
```

- [ ] **Step 2: 写 Layer2 API**

写 `src/api/basedata/managerData.ts`:

```ts
import { http } from '@/api/request'
import type { ManagerDataPageReq, ManagerDataRow, IPage } from '@/types/manager'

/** 动态数据分页(form) */
export const managerDataPage = (req: ManagerDataPageReq) =>
  http.post<IPage<ManagerDataRow>>('/basedata/common/page', req)

/** 新增/编辑(form 平铺:jsTableName/jsTableNameId/id?/动态字段值) */
export const managerDataAddOrUpdate = (body: Record<string, string>) =>
  http.post<void>('/basedata/common/add-or-update', body)

/** 删除(form) */
export const managerDataDelete = (tableName: string, id: string) =>
  http.post<void>('/basedata/common/delete', { tableName, id })
```

- [ ] **Step 3: typecheck 通过**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 退出码 0

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/api/basedata/manager.ts mes/vue3/src/api/basedata/managerData.ts
git commit -m "✨ feat(vue3): 3b 动态主数据 API(manager 4 端点 + managerData 3 端点,form/JSON 编码区分)"
```

---

## Task 5: Layer1 视图(ManagerForm + ManagerList)

**Files:**
- Create: `src/views/basedata/manager/ManagerForm.vue`
- Create: `src/views/basedata/manager/ManagerList.vue`

- [ ] **Step 1: 写编辑大弹窗 `ManagerForm.vue`**

```vue
<template>
  <FormDialog v-model="visible" :title="model?.id ? '编辑动态表' : '新建动态表'" width="760px" :loading="loading" @submit="onSubmit">
    <el-form :model="header" label-width="90px">
      <el-form-item label="表名" required>
        <el-input v-model="header.tableName" placeholder="物理表名,如 sp_demo" :disabled="!!model?.id" />
      </el-form-item>
      <el-form-item label="表描述">
        <el-input v-model="header.tableDesc" placeholder="中文描述" />
      </el-form-item>
    </el-form>

    <div class="rows-toolbar">
      <span class="rows-title">字段明细</span>
      <el-button type="primary" :icon="Plus" size="small" @click="addRow">添加字段</el-button>
    </div>
    <el-table :data="rows" size="small" border>
      <el-table-column label="序" type="index" width="48" />
      <el-table-column label="字段名(物理列)">
        <template #default="{ row }"><el-input v-model="row.field" placeholder="如 code" /></template>
      </el-table-column>
      <el-table-column label="字段描述">
        <template #default="{ row }"><el-input v-model="row.fieldDesc" placeholder="中文表头" /></template>
      </el-table-column>
      <el-table-column label="必填" width="80">
        <template #default="{ row }"><el-switch v-model="row.mustFill" active-value="1" inactive-value="0" /></template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ $index }">
          <el-button link size="small" :disabled="$index === 0" @click="rows = moveRow(rows, $index, 'up')">上移</el-button>
          <el-button link size="small" :disabled="$index === rows.length - 1" @click="rows = moveRow(rows, $index, 'down')">下移</el-button>
          <el-button link type="danger" size="small" @click="rows.splice($index, 1)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import FormDialog from '@/components/FormDialog.vue'
import { validateManagerForm, buildUpsertPayload, parseMustFill, moveRow } from '@/utils/manager'
import { managerItemsByTableNameId } from '@/api/basedata/manager'
import type { SpTableManager, SpTableManagerItem, SpTableManagerDto } from '@/types/manager'

const props = defineProps<{ modelValue: boolean; model: SpTableManager | null; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [SpTableManagerDto] }>()

const visible = ref(props.modelValue)
watch(() => props.modelValue, (v) => (visible.value = v))
watch(visible, (v) => emit('update:modelValue', v))

const header = reactive<SpTableManager>({ tableName: '', tableDesc: '' })
const rows = ref<SpTableManagerItem[]>([])

const addRow = () => rows.value.push({ field: '', fieldDesc: '', mustFill: '0' })

// 弹窗打开时回填:新建清空,编辑拉明细
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    header.tableName = props.model?.tableName ?? ''
    header.tableDesc = props.model?.tableDesc ?? ''
    if (props.model?.id) {
      const items = await managerItemsByTableNameId(props.model.id)
      rows.value = items.map((it) => ({ ...it, mustFill: parseMustFill(it.mustFill) ? '1' : '0' }))
    } else {
      rows.value = []
    }
  },
)

const onSubmit = () => {
  const err = validateManagerForm(header, rows.value)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildUpsertPayload(header, rows.value, props.model?.id))
}
</script>

<style scoped>
.rows-toolbar { display: flex; align-items: center; justify-content: space-between; margin: var(--sp-3) 0 var(--sp-2); }
.rows-title { font-weight: 600; }
</style>
```

- [ ] **Step 2: 写列表页 `ManagerList.vue`**

```vue
<template>
  <PageContainer title="动态表配置">
    <DataTable
      :data="tableData"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <template #toolbar>
        <el-input v-model="search.tableName" placeholder="表名" clearable class="qbox" @keyup.enter="handleSearch" />
        <el-input v-model="search.tableDesc" placeholder="表描述" clearable class="qbox" @keyup.enter="handleSearch" />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button v-permission="'manager:add'" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </template>
      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click.stop="openEdit(row as SpTableManager)">编辑</el-button>
        <el-button type="danger" link size="small" @click.stop="handleDelete(row as SpTableManager)">删除</el-button>
      </template>
    </DataTable>

    <ManagerForm v-model="dialogVisible" :model="editing" :loading="submitLoading" @submit="handleSubmit" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ManagerForm from './ManagerForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { managerPage, managerAddOrUpdate, managerDelete } from '@/api/basedata/manager'
import type { SpTableManager, SpTableManagerDto } from '@/types/manager'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ tableName: '', tableDesc: '' })
const tableData = ref<SpTableManager[]>([])
const columns: Column[] = [
  { prop: 'tableName', label: '表名' },
  { prop: 'tableDesc', label: '表描述' },
]

const { loading, run: load } = useRequest(async () => {
  const res = await managerPage({ ...search, current: pager.current, size: pager.size })
  tableData.value = res.records
  setTotal(res.total)
})
load()

const handleSearch = () => {
  reset()
  load()
}
const handleReset = () => {
  search.tableName = ''
  search.tableDesc = ''
  handleSearch()
}
const handlePageChange = (p: number) => {
  pager.current = p
  load()
}
const handleSizeChange = (s: number) => {
  pager.size = s
  reset()
  load()
}

const dialogVisible = ref(false)
const editing = ref<SpTableManager | null>(null)
const submitLoading = ref(false)
const openCreate = () => {
  editing.value = null
  dialogVisible.value = true
}
const openEdit = (row: SpTableManager) => {
  editing.value = row
  dialogVisible.value = true
}
const handleSubmit = async (dto: SpTableManagerDto) => {
  submitLoading.value = true
  try {
    await managerAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } finally {
    submitLoading.value = false
  }
}
const handleDelete = async (row: SpTableManager) => {
  await ElMessageBox.confirm(`确认删除动态表「${row.tableName}」及其字段配置?`, '提示', { type: 'warning' })
  await managerDelete(row.id!)
  ElMessage.success('删除成功')
  load()
}
</script>

<style scoped>
.qbox { width: 160px; }
</style>
```

- [ ] **Step 3: typecheck 通过**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 退出码 0

> 注:`useRequest`/`usePagination` 的具体返回结构以同目录范例 `src/views/basedata/device-group/DeviceGroupPage.vue` 为准——若 `useRequest` 返回字段名不同(如 `run` vs `execute`),按该范例对齐后再 typecheck。

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/basedata/manager/
git commit -m "✨ feat(vue3): 3b Layer1 动态表配置页(列表 + 表头/明细编辑大弹窗)"
```

---

## Task 6: Layer2 视图(ManagerDataForm + ManagerDataPage)

**Files:**
- Create: `src/views/basedata/manager-item/ManagerDataForm.vue`
- Create: `src/views/basedata/manager-item/ManagerDataPage.vue`

- [ ] **Step 1: 写动态行弹窗 `ManagerDataForm.vue`**

```vue
<template>
  <FormDialog v-model="visible" :title="rowId ? '编辑数据' : '新增数据'" width="560px" :loading="loading" @submit="onSubmit">
    <el-form :model="values" label-width="120px">
      <el-form-item v-for="it in items" :key="it.field" :label="it.fieldDesc || it.field" :required="parseMustFill(it.mustFill)">
        <el-input v-model="values[it.field]" :placeholder="it.field" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { parseMustFill } from '@/utils/manager'
import { emptyRow, validateRow, buildDataPayload } from '@/utils/managerData'
import type { SpTableManagerItem, ManagerDataRow } from '@/types/manager'

const props = defineProps<{
  modelValue: boolean
  items: SpTableManagerItem[]
  tableName: string
  tableNameId: string
  row: ManagerDataRow | null
  loading?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [Record<string, string>] }>()

const visible = ref(props.modelValue)
watch(() => props.modelValue, (v) => (visible.value = v))
watch(visible, (v) => emit('update:modelValue', v))

const values = reactive<Record<string, string>>({})
const rowId = ref<string | undefined>(undefined)

// 打开时回填:编辑用 row 值,新增用空行
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    const base = props.row ?? emptyRow(props.items)
    for (const k of Object.keys(values)) delete values[k]
    for (const it of props.items) values[it.field] = base[it.field] ?? ''
    rowId.value = props.row?.id
  },
)

const onSubmit = () => {
  const err = validateRow(props.items, values)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildDataPayload(props.items, values, props.tableName, props.tableNameId, rowId.value))
}
</script>
```

- [ ] **Step 2: 写主从页 `ManagerDataPage.vue`**

```vue
<template>
  <PageContainer title="动态数据维护">
    <MasterDetailLayout :has-selection="!!selected?.id">
      <template #master>
        <DataTable
          :data="tables"
          :loading="tablesLoading"
          :columns="tableColumns"
          :pager="tablePager"
          @row-click="selectTable"
          @page-change="handleTablePage"
          @size-change="handleTableSize"
        >
          <template #toolbar>
            <span class="hint">选择要维护数据的表</span>
          </template>
          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="selectTable(row as SpTableManager)">维护</el-button>
          </template>
        </DataTable>
      </template>

      <template #detail>
        <div class="detail-head">
          <span class="detail-title">{{ selected?.tableDesc || selected?.tableName }}</span>
          <el-button v-permission="'manager:add'" type="primary" :icon="Plus" size="small" @click="openCreate">新增数据</el-button>
        </div>
        <DataTable
          :key="selected!.id"
          :data="rows"
          :loading="rowsLoading"
          :columns="dataColumns"
          :pager="dataPager"
          @page-change="handleDataPage"
          @size-change="handleDataSize"
        >
          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="openEdit(row as ManagerDataRow)">编辑</el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row as ManagerDataRow)">删除</el-button>
          </template>
        </DataTable>
      </template>
      <template #detail-empty>
        <el-empty description="请选择左侧表以维护数据" />
      </template>
    </MasterDetailLayout>

    <ManagerDataForm
      v-if="selected?.id"
      v-model="dialogVisible"
      :items="items"
      :table-name="selected.tableName"
      :table-name-id="selected.id"
      :row="editingRow"
      :loading="submitLoading"
      @submit="handleSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ManagerDataForm from './ManagerDataForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { managerPage, managerItemsByTableNameId } from '@/api/basedata/manager'
import { managerDataPage, managerDataAddOrUpdate, managerDataDelete } from '@/api/basedata/managerData'
import { buildColumns } from '@/utils/managerData'
import type { SpTableManager, SpTableManagerItem, ManagerDataRow } from '@/types/manager'

// ---- 左:表列表 ----
const { pager: tablePager, setTotal: setTableTotal, reset: resetTable } = usePagination()
const tables = ref<SpTableManager[]>([])
const tableColumns: Column[] = [{ prop: 'tableName', label: '表名' }, { prop: 'tableDesc', label: '描述' }]
const { loading: tablesLoading, run: loadTables } = useRequest(async () => {
  const res = await managerPage({ current: tablePager.current, size: tablePager.size })
  tables.value = res.records
  setTableTotal(res.total)
})
loadTables()
const handleTablePage = (p: number) => { tablePager.current = p; loadTables() }
const handleTableSize = (s: number) => { tablePager.size = s; resetTable(); loadTables() }

// ---- 选中表 ----
const selected = ref<SpTableManager | null>(null)
const items = ref<SpTableManagerItem[]>([])
const dataColumns = computed<Column[]>(() => buildColumns(items.value).map((c) => ({ prop: c.field, label: c.label })))

// ---- 右:动态数据 ----
const { pager: dataPager, setTotal: setDataTotal, reset: resetData } = usePagination()
const rows = ref<ManagerDataRow[]>([])
const { loading: rowsLoading, run: loadRows } = useRequest(async () => {
  if (!selected.value?.id) return
  const res = await managerDataPage({
    tableName: selected.value.tableName,
    tableNameId: selected.value.id,
    current: dataPager.current,
    size: dataPager.size,
  })
  rows.value = res.records
  setDataTotal(res.total)
})

const selectTable = async (row: SpTableManager) => {
  selected.value = row
  items.value = await managerItemsByTableNameId(row.id!)
  resetData()
  loadRows()
}
const handleDataPage = (p: number) => { dataPager.current = p; loadRows() }
const handleDataSize = (s: number) => { dataPager.size = s; resetData(); loadRows() }

// ---- 增删改 ----
const dialogVisible = ref(false)
const editingRow = ref<ManagerDataRow | null>(null)
const submitLoading = ref(false)
const openCreate = () => { editingRow.value = null; dialogVisible.value = true }
const openEdit = (row: ManagerDataRow) => { editingRow.value = row; dialogVisible.value = true }
const handleSubmit = async (body: Record<string, string>) => {
  submitLoading.value = true
  try {
    await managerDataAddOrUpdate(body)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadRows()
  } finally {
    submitLoading.value = false
  }
}
const handleDelete = async (row: ManagerDataRow) => {
  await ElMessageBox.confirm('确认删除该行数据?', '提示', { type: 'warning' })
  await managerDataDelete(selected.value!.tableName, row.id)
  ElMessage.success('删除成功')
  loadRows()
}
</script>

<style scoped>
.detail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-3); }
.detail-title { font-weight: 600; }
.hint { color: var(--el-text-color-secondary); font-size: 13px; }
</style>
```

- [ ] **Step 3: typecheck 通过**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 退出码 0

> 注:`useRequest`/`usePagination` 返回结构以 `DeviceGroupPage.vue` / `MaterileList.vue` 范例为准对齐;`ManagerDataRow` 的 `id` 字段由后端返回的 Map 携带(每行含 id),`row.id` 直接可用。

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/basedata/manager-item/
git commit -m "✨ feat(vue3): 3b Layer2 动态数据维护主从页(选表→动态列+动态行表单 CRUD)"
```

---

## Task 7: urlMap + 路由接线

**Files:**
- Modify: `src/utils/urlMap.ts`
- Modify: `src/router/index.ts`

- [ ] **Step 1: urlMap +2**

在 `src/utils/urlMap.ts` 的 `URL_MAP` 对象内,`'/basedata/process-unit/list-ui': '/basedata/process-unit',` 之后加入:

```ts
  '/basedata/manager/list-ui': '/basedata/manager',
  '/basedata/manager/item/list-ui': '/basedata/manager-item',
```

- [ ] **Step 2: 路由 +2**

在 `src/router/index.ts` 的 basedata 路由块(`basedata/process-unit` 路由对象之后)加入两条:

```ts
      {
        path: 'basedata/manager',
        name: 'basedata-manager',
        component: () => import('@/views/basedata/manager/ManagerList.vue'),
      },
      {
        path: 'basedata/manager-item',
        name: 'basedata-manager-item',
        component: () => import('@/views/basedata/manager-item/ManagerDataPage.vue'),
      },
```

> 注:确认这两条对象插入到与 `basedata/process-unit` 同级的 `children` 数组里(同 AdminLayout 子路由),保持逗号/缩进与相邻条目一致。

- [ ] **Step 3: typecheck + build 通过**

Run: `cd mes/vue3 && pnpm typecheck && pnpm build`
Expected: 退出码 0,两页落入独立懒加载 chunk

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/urlMap.ts mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 3b 动态主数据 urlMap +2 + router +2(/basedata/manager, /basedata/manager-item)"
```

---

## Task 8: 菜单核验 + 后端审查 + 门禁

**Files:**
- Create (条件性): `scripts/sql/manager-menu-seed.sql`

- [ ] **Step 1: 核验 dev DB 是否有菜单 105/106**

Run(需本地 MySQL `mes_data` root/12345678 起):
```bash
mysql -uroot -p12345678 mes_data -e "SELECT id, name, url, permission FROM sp_sys_menu WHERE id IN ('105','106');"
```
Expected:若返回两行(105 `/basedata/manager/list-ui`、106 `/basedata/manager/item/list-ui`)→ 菜单已存在,跳到 Step 3。若缺行 → 执行 Step 2 补种子。

> 若本地无 MySQL 客户端或后端未起,跳过实测,直接按 Step 2 写出幂等 seed(幂等不会重复插入),并在收尾说明"需用户手动跑确认"。

- [ ] **Step 2(条件性): 写幂等菜单种子**

写 `scripts/sql/manager-menu-seed.sql`(参照既有 `device-menu-seed.sql` 风格,父菜单 id 与基础数据组对齐——核验时确认基础数据组 id,schema 中 105/106 的 parent_id=10):

```sql
-- 动态主数据菜单(Layer1 配置 105 / Layer2 维护 106),幂等
INSERT INTO sp_sys_menu (id, name, title, url, parent_id, grade, sort, is_deleted, permission, icon, remark, create_time, create_username, update_time, update_username)
SELECT '105', 'basedata', '动态表配置', '/basedata/manager/list-ui', '10', '3', 5, '0', 'manager:add', 'Grid', '', NOW(), 'system', NOW(), 'system'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '105');

INSERT INTO sp_sys_menu (id, name, title, url, parent_id, grade, sort, is_deleted, permission, icon, remark, create_time, create_username, update_time, update_username)
SELECT '106', 'basedatamanager', '动态数据维护', '/basedata/manager/item/list-ui', '10', '3', 6, '0', 'manager:add', 'Tickets', '', NOW(), 'system', NOW(), 'system'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '106');
```

> 注:列名/列序须与 dev DB 实际 `sp_sys_menu` 表结构对齐(核验时 `DESC sp_sys_menu;` 确认;若列与上述不符,按实际列调整)。若 Step 1 证实菜单已存在则不创建此文件。

- [ ] **Step 3: 后端独立审查(按 backend-deepseek-review-each-cycle)**

不改后端,只读审查并在 verify-results 记录结论:
- Layer1 `SpTableManagerServiceImpl.saveOrUpdateWithItems`:确认 `@Transactional` 在位、更新前删旧明细、明细统一 `id=null`+`tableNameId=header.id`、返回 header.id。
- Layer2 `TableNameDataServiceImpl`:确认 `assertTableWhitelisted`(表名白名单+is_deleted='0')、`assertSafeColumn`(正则 `^[A-Za-z0-9_]+$`)、Mapper 值 `#{}` 参数化、`is_deleted` 缺省 putIfAbsent。
- 预期结论:零暴露 bug,零改动(mes-new 2j/2j-2 已 curl 端到端验证同份后端)。

- [ ] **Step 4: 全门禁**

Run: `cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: 全部退出码 0;test 新增 ~22 例(manager + managerData)全绿。

- [ ] **Step 5: 写验证结果文档 + Commit**

写 `mes/vue3/docs/specs/2026-06-22-cycle3b-verify-results.md`(记录:门禁结果、后端审查结论、菜单核验结论、人工 :4200 冒烟待确认清单),然后:

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add scripts/sql/manager-menu-seed.sql mes/vue3/docs/specs/2026-06-22-cycle3b-verify-results.md
git commit -m "✅ chore(vue3): 3b 菜单核验/种子 + 后端审查结论 + 验证结果"
```

> 若 Step 2 未创建 seed 文件,从 `git add` 中去掉该路径。

---

## 自检清单(实现完成后)

- [ ] spec §2 全部 7 端点都有对应 API 函数(Task 4)与消费页面(Task 5/6)。
- [ ] mustFill "1"/"0" 编码:写在 `buildUpsertPayload`(Task 2)+ ManagerForm 的 el-switch active/inactive-value(Task 5);读容忍 Y/y/1 在 `parseMustFill`。
- [ ] 编辑剥 item id:`buildUpsertPayload` 不回带 item id(Task 2 测试断言)。
- [ ] Layer2 form 平铺:`buildDataPayload` 含 jsTableName/jsTableNameId(Task 3 测试断言),`managerDataAddOrUpdate` 不传 json=true(Task 4)。
- [ ] form vs JSON:仅 `managerAddOrUpdate` 带 `true`(JSON),其余 6 端点走 form(Task 4)。
- [ ] 类型名一致:`SpTableManagerDto.spTableManagerItems`、`ManagerDataRow`、`ManagerPageReq`/`ManagerDataPageReq` 在各 Task 一致。
- [ ] 菜单 105/106 核验(Task 8 Step 1),缺则幂等种子。
