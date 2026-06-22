# 子周期 2c 组织·班组 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Vue3 前端交付「组织·班组」业务线——班组管理（含成员维护）新页 + 改造加工单元页为主从（右侧关联班组面板），对接后端已存在端点，零后端生产代码改动（仅按每周期约定复核）。

**Architecture:** 精确镜像 2b-1 `device-group` 的「主从 + 内联 `DualListTransfer`(v-model) + 保存按钮 + diff」姊妹模式。班组页 = `TeamPage`(左 CRUD)/`TeamMembers`(右成员)/`TeamForm`(弹窗)，三件套对应 `DeviceGroupPage/Members/Form`。加工单元页就地升级为 `MasterDetailLayout`，右侧 `ProcessUnitTeams` 面板。纯函数沉淀 `utils/team`（TDD）。

**Tech Stack:** Vue 3.5 `<script setup>` + TS + Element Plus + Vitest；`http`(`@/api/request`)；复用 `MasterDetailLayout`/`DataTable`/`DualListTransfer`/`FormDialog`/`usePagination`/`useRequest`/`excludeSelected`/`diffMembers`。

---

## 设计基线（实现前必读）

- `DualListTransfer` 是 **v-model 内联组件**（`modelValue: TransferItem[]` + `candidates: TransferItem[]` + `titles`），**非弹窗**；保存时用 `diffMembers(原ids, 现ids)` 求 added/removed。
- `TransferItem = { id: string; primary: string; secondary?: string }`（`@/types/technology`）。
- `http.post<T>(url, data, json=false)`：第三参 `true` = JSON（`@RequestBody`）；缺省 = form 编码。`http.get<T>(url, params?)`。
- `excludeSelected(all, selectedIds: Set<string>)` 与 `diffMembers(originalIds, nextIds)` 已在 `@/utils/device` 实现，**直接 import 复用，勿重复定义**。
- `SysUser`（`@/types/system`）：`{ id, username, name, ... }`。
- 测试目录：`mes/vue3/tests/*.spec.ts`，vitest node 环境，**仅测纯函数**（组件不做渲染测）。
- 所有命令在 `mes/vue3/` 下执行。

## 文件清单

**新建：**
- `src/types/team.ts` — `SpTeam` / `SpTeamDTO` / `TeamPageReq` / `TeamFormModel`
- `src/utils/team.ts` — `WEEKDAYS`/`parseWorkdays`/`formatWorkdays`/`workdaysLabel`/`validateTeam`/`buildTeamPayload`/`teamUserToTransferItem`/`teamToTransferItem`
- `tests/team.spec.ts` — utils/team 单测
- `src/api/system/team.ts` — 8 端点
- `src/views/system/team/TeamForm.vue` — 班组新增/编辑弹窗
- `src/views/system/team/TeamMembers.vue` — 成员维护面板
- `src/views/system/team/TeamPage.vue` — 班组主从页
- `src/views/basedata/process-unit/ProcessUnitTeams.vue` — 加工单元关联班组面板

**修改：**
- `src/api/basedata/processUnit.ts` — 补 `processUnitTeams`/`processUnitTeamAdd`/`processUnitTeamRemove`
- `src/views/basedata/process-unit/ProcessUnitList.vue` — 就地升级为 `MasterDetailLayout`（保留文件名/路由名）
- `src/utils/urlMap.ts` — 加 `/admin/sys/team/list-ui` → `/system/team`
- `src/router/index.ts` — 加 `system/team` 路由
- `mes/vue3/docs/ROADMAP.md` — 矩阵 §9.1 班组 ☐→✅ + Cycle 2 进度段

---

## Task 1: 类型定义 `src/types/team.ts`

**Files:**
- Create: `src/types/team.ts`

- [ ] **Step 1: 写类型文件**

```ts
import type { PageReq } from '@/types/system'

/** 班组(sp_team)。workdays 为 CSV "1,2,3";is_deleted 映射后端 deleted */
export interface SpTeam {
  id?: string
  code?: string
  name?: string
  descr?: string
  startTime?: string
  endTime?: string
  /** 工作日 CSV:"1,2,3,4,5" */
  workdays?: string
  deleted?: string
}

/** 班组分页记录(含后端派生只读字段) */
export interface SpTeamDTO extends SpTeam {
  userCount?: number
  lineName?: string
  workshopName?: string
}

export interface TeamPageReq extends PageReq {
  code?: string
  name?: string
}

/** 班组表单模型:workdays 用数组驱动多选,提交时经 formatWorkdays 转 CSV */
export interface TeamFormModel {
  id?: string
  code?: string
  name?: string
  startTime?: string
  endTime?: string
  workdays?: string[]
  descr?: string
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误（新文件无消费者，应通过）

- [ ] **Step 3: Commit**

```bash
git add src/types/team.ts
git commit -m "🏷️ feat(vue3): 2c 班组类型定义(SpTeam/SpTeamDTO/TeamFormModel)"
```

---

## Task 2: 纯函数 `src/utils/team.ts`（TDD）

**Files:**
- Create: `tests/team.spec.ts`
- Create: `src/utils/team.ts`

- [ ] **Step 1: 写失败测试 `tests/team.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  parseWorkdays,
  formatWorkdays,
  workdaysLabel,
  validateTeam,
  buildTeamPayload,
  teamUserToTransferItem,
  teamToTransferItem,
} from '@/utils/team'

describe('parseWorkdays', () => {
  it('CSV → 数组,去空白去空段保序', () => {
    expect(parseWorkdays('3, 1 ,2')).toEqual(['3', '1', '2'])
  })
  it('空/undefined → []', () => {
    expect(parseWorkdays('')).toEqual([])
    expect(parseWorkdays(undefined)).toEqual([])
  })
})

describe('formatWorkdays', () => {
  it('数组 → CSV,过滤非法/去重/数值升序', () => {
    expect(formatWorkdays(['3', '1', '2', '1', '9'])).toBe('1,2,3')
  })
  it('空 → 空串', () => {
    expect(formatWorkdays([])).toBe('')
    expect(formatWorkdays(undefined)).toBe('')
  })
})

describe('workdaysLabel', () => {
  it('CSV → 中文升序空格连接', () => {
    expect(workdaysLabel('2,1')).toBe('周一 周二')
  })
  it('空/全非法 → -', () => {
    expect(workdaysLabel('')).toBe('-')
    expect(workdaysLabel('9,0')).toBe('-')
  })
})

describe('validateTeam', () => {
  it('code/name 必填', () => {
    expect(validateTeam({ code: '', name: '' })).toContain('班组代码必填')
    expect(validateTeam({ code: 'BZ', name: '' })).toContain('班组名称必填')
  })
  it('齐全 → []', () => {
    expect(validateTeam({ code: 'BZ', name: '班组1' })).toEqual([])
  })
})

describe('buildTeamPayload', () => {
  it('workdays 数组转 CSV、剥空串、保留 id', () => {
    expect(
      buildTeamPayload({ id: 'x', code: 'BZ', name: '班组1', startTime: '08:00', endTime: '', workdays: ['2', '1'], descr: undefined }),
    ).toEqual({ id: 'x', code: 'BZ', name: '班组1', startTime: '08:00', workdays: '1,2' })
  })
  it('空 workdays 不出现在 payload', () => {
    expect(buildTeamPayload({ code: 'BZ', name: '班组1', workdays: [] })).toEqual({ code: 'BZ', name: '班组1' })
  })
})

describe('teamUserToTransferItem', () => {
  it('primary=name, secondary=username', () => {
    expect(teamUserToTransferItem({ id: 'u1', name: '张三', username: 'zs' })).toEqual({
      id: 'u1',
      primary: '张三',
      secondary: 'zs',
    })
  })
})

describe('teamToTransferItem', () => {
  it('primary=name, secondary=code', () => {
    expect(teamToTransferItem({ id: 't1', name: '班组1', code: 'BZ001' })).toEqual({
      id: 't1',
      primary: '班组1',
      secondary: 'BZ001',
    })
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test team`
Expected: FAIL（`@/utils/team` 不存在 / 函数未定义）

- [ ] **Step 3: 写实现 `src/utils/team.ts`**

```ts
import type { SpTeam, SpTeamDTO, TeamFormModel } from '@/types/team'
import type { SysUser } from '@/types/system'
import type { TransferItem } from '@/types/technology'

export interface Weekday {
  value: string
  label: string
}

/** 周一(1)..周日(7) */
export const WEEKDAYS: Weekday[] = [
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
  { value: '7', label: '周日' },
]

const LABEL_MAP: Record<string, string> = Object.fromEntries(WEEKDAYS.map((w) => [w.value, w.label]))
const isValidDay = (v: string): boolean => /^[1-7]$/.test(v)

/** CSV "3, 1 ,2" → ['3','1','2']:去空白、去空段、保序 */
export function parseWorkdays(csv?: string): string[] {
  if (!csv) return []
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** ['3','1','2'] → "1,2,3":过滤非法值、去重、数值升序;空 → '' */
export function formatWorkdays(days?: string[]): string {
  if (!days || days.length === 0) return ''
  const uniq = Array.from(new Set(days.map((d) => d.trim()).filter(isValidDay)))
  uniq.sort((a, b) => Number(a) - Number(b))
  return uniq.join(',')
}

/** CSV → "周一 周二"(升序空格连接);空/全非法 → '-' */
export function workdaysLabel(csv?: string): string {
  const labels = parseWorkdays(csv)
    .filter(isValidDay)
    .sort((a, b) => Number(a) - Number(b))
    .map((v) => LABEL_MAP[v])
  return labels.length > 0 ? labels.join(' ') : '-'
}

export function validateTeam(form: Partial<TeamFormModel>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('班组代码必填')
  if (!form.name?.trim()) errs.push('班组名称必填')
  return errs
}

/** 表单模型 → 提交体:workdays 数组转 CSV、剥 undefined/空串、保留有值字段(含 id) */
export function buildTeamPayload(form: TeamFormModel): Partial<SpTeam> {
  const csv = formatWorkdays(form.workdays)
  const raw: Record<string, unknown> = {
    id: form.id,
    code: form.code,
    name: form.name,
    startTime: form.startTime,
    endTime: form.endTime,
    workdays: csv,
    descr: form.descr,
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out as Partial<SpTeam>
}

/** SysUser → 穿梭框项(primary=姓名, secondary=登录名) */
export function teamUserToTransferItem(u: Partial<SysUser>): TransferItem {
  return { id: u.id ?? '', primary: u.name ?? '', secondary: u.username ?? '' }
}

/** SpTeam → 穿梭框项(primary=名称, secondary=编码) */
export function teamToTransferItem(t: Partial<SpTeamDTO>): TransferItem {
  return { id: t.id ?? '', primary: t.name ?? '', secondary: t.code ?? '' }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test team`
Expected: PASS（全部用例绿）

- [ ] **Step 5: Commit**

```bash
git add src/utils/team.ts tests/team.spec.ts
git commit -m "✅ test(vue3): 2c utils/team 纯函数 + TDD(工作日CSV/校验/payload/穿梭项)"
```

---

## Task 3: API `src/api/system/team.ts`

**Files:**
- Create: `src/api/system/team.ts`

- [ ] **Step 1: 写 API 文件**

```ts
import { http } from '@/api/request'
import type { IPage } from '@/types/basedata'
import type { SpTeam, SpTeamDTO, TeamPageReq } from '@/types/team'
import type { SysUser } from '@/types/system'

/** 班组分页(form);记录含 userCount 等派生字段 */
export const teamPage = (req: TeamPageReq) =>
  http.post<IPage<SpTeamDTO>>('/admin/sys/team/page', req)

/** 单个(GET) */
export const teamGetById = (id: string) =>
  http.get<SpTeam>(`/admin/sys/team/${encodeURIComponent(id)}`)

/** 新增/编辑(form;后端 SpTeam record,非 @RequestBody) */
export const teamAddOrUpdate = (record: Partial<SpTeam>) =>
  http.post<string>('/admin/sys/team/add-or-update', record)

/** 软删(JSON;后端 @RequestBody {id},置 is_deleted='1') */
export const teamDelete = (id: string) =>
  http.post<void>('/admin/sys/team/delete', { id }, true)

/** 班组成员(GET) */
export const teamUsers = (teamId: string) =>
  http.get<SysUser[]>(`/admin/sys/team/users/${encodeURIComponent(teamId)}`)

/** 全部可选用户(is_deleted='0');候选池由前端 excludeSelected 排除已在组者 */
export const teamAvailableUsers = () =>
  http.get<SysUser[]>('/admin/sys/team/available-users')

/** 批量加成员(JSON;{teamId,userIds});后端按 (team_id,user_id) 去重 */
export const teamUsersAdd = (teamId: string, userIds: string[]) =>
  http.post<void>('/admin/sys/team/users/add', { teamId, userIds }, true)

/** 移除单个成员(JSON;{teamId,userId}) */
export const teamUserRemove = (teamId: string, userId: string) =>
  http.post<void>('/admin/sys/team/users/remove', { teamId, userId }, true)
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: Commit**

```bash
git add src/api/system/team.ts
git commit -m "✨ feat(vue3): 2c 班组 API(8 端点,form/JSON 编码差异)"
```

---

## Task 4: 加工单元 API 补 3 个 teams 端点

**Files:**
- Modify: `src/api/basedata/processUnit.ts`

- [ ] **Step 1: 追加端点 + 类型 import**

在文件顶部 import 区追加：

```ts
import type { SpTeam } from '@/types/team'
```

在文件末尾追加：

```ts
/** 某加工单元已绑班组(GET) */
export const processUnitTeams = (unitId: string) =>
  http.get<SpTeam[]>(`/basedata/process-unit/teams/${encodeURIComponent(unitId)}`)

/** 绑定班组(JSON {unitId,teamId};后端按 unit_id+team_id 去重) */
export const processUnitTeamAdd = (unitId: string, teamId: string) =>
  http.post<void>('/basedata/process-unit/teams/add', { unitId, teamId }, true)

/** 解绑班组(JSON {unitId,teamId}) */
export const processUnitTeamRemove = (unitId: string, teamId: string) =>
  http.post<void>('/basedata/process-unit/teams/remove', { unitId, teamId }, true)
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: Commit**

```bash
git add src/api/basedata/processUnit.ts
git commit -m "✨ feat(vue3): 2c 加工单元 API 补 teams 关联端点(get/add/remove)"
```

---

## Task 5: 班组表单弹窗 `TeamForm.vue`

**Files:**
- Create: `src/views/system/team/TeamForm.vue`

- [ ] **Step 1: 写组件（镜像 DeviceGroupForm，扩展时间/工作日）**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑班组' : '新增班组'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-form-item label="班组代码" prop="code">
        <el-input v-model="form.code" placeholder="如 BZ001" clearable />
      </el-form-item>
      <el-form-item label="班组名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入班组名称" clearable />
      </el-form-item>
      <el-form-item label="上班时间" prop="startTime">
        <el-time-picker
          v-model="form.startTime"
          format="HH:mm"
          value-format="HH:mm"
          placeholder="如 08:00"
          clearable
        />
      </el-form-item>
      <el-form-item label="下班时间" prop="endTime">
        <el-time-picker
          v-model="form.endTime"
          format="HH:mm"
          value-format="HH:mm"
          placeholder="如 17:00"
          clearable
        />
      </el-form-item>
      <el-form-item label="工作日" prop="workdays">
        <el-select v-model="form.workdays" multiple placeholder="选择工作日" style="width: 100%">
          <el-option v-for="w in WEEKDAYS" :key="w.value" :label="w.label" :value="w.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注" prop="descr">
        <el-input v-model="form.descr" type="textarea" :rows="3" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { WEEKDAYS, buildTeamPayload, parseWorkdays } from '@/utils/team'
import type { SpTeam, SpTeamDTO, TeamFormModel } from '@/types/team'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;有 id = 编辑(传入分页记录 SpTeamDTO) */
  model: Partial<SpTeamDTO> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpTeam>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const form = reactive<TeamFormModel>({
  id: undefined,
  code: '',
  name: '',
  startTime: undefined,
  endTime: undefined,
  workdays: [],
  descr: undefined,
})

function resetForm() {
  form.id = undefined
  form.code = ''
  form.name = ''
  form.startTime = undefined
  form.endTime = undefined
  form.workdays = []
  form.descr = undefined
}

watch(
  () => props.model,
  (val) => {
    if (val) {
      resetForm()
      Object.assign(form, {
        id: val.id,
        code: val.code,
        name: val.name,
        startTime: val.startTime,
        endTime: val.endTime,
        workdays: parseWorkdays(val.workdays),
        descr: val.descr,
      })
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

const rules: FormRules = {
  code: [{ required: true, message: '请输入班组代码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入班组名称', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildTeamPayload({ ...form }))
}
</script>
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: Commit**

```bash
git add src/views/system/team/TeamForm.vue
git commit -m "✨ feat(vue3): 2c 班组表单弹窗(代码/名称/上下班/工作日多选/备注)"
```

---

## Task 6: 成员维护面板 `TeamMembers.vue`

**Files:**
- Create: `src/views/system/team/TeamMembers.vue`

- [ ] **Step 1: 写组件（镜像 DeviceGroupMembers，候选=available-users 排除已在组）**

```vue
<template>
  <div class="members">
    <div class="members__bar">
      <span class="members__title">班组成员维护</span>
      <el-button type="primary" size="small" :loading="saving" @click="save">保存成员</el-button>
    </div>
    <DualListTransfer
      v-model="selected"
      :candidates="candidates"
      :titles="['可选用户', '班组成员']"
      :loading="loading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import DualListTransfer from '@/components/DualListTransfer.vue'
import { teamUsers, teamAvailableUsers, teamUsersAdd, teamUserRemove } from '@/api/system/team'
import { teamUserToTransferItem } from '@/utils/team'
import { diffMembers } from '@/utils/device'
import type { TransferItem } from '@/types/technology'

const props = defineProps<{ teamId: string }>()

const candidates = ref<TransferItem[]>([])
const selected = ref<TransferItem[]>([])
const originalMemberIds = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)

async function load() {
  if (!props.teamId) return
  loading.value = true
  try {
    // 候选池=全量可选用户(后端已过滤 is_deleted='0');成员=当前班组成员
    const [allUsers, members] = await Promise.all([teamAvailableUsers(), teamUsers(props.teamId)])
    candidates.value = (allUsers ?? []).map(teamUserToTransferItem)
    selected.value = (members ?? []).map(teamUserToTransferItem)
    originalMemberIds.value = (members ?? []).map((m) => m.id ?? '')
  } finally {
    loading.value = false
  }
}

// 父组件以 :key="team.id" 强制按班组重挂载本组件,避免 load() 并行拉取的后写覆盖竞态
watch(() => props.teamId, load, { immediate: true })

async function save() {
  const nextIds = selected.value.map((i) => i.id)
  const { added, removed } = diffMembers(originalMemberIds.value, nextIds)
  if (!added.length && !removed.length) {
    ElMessage.info('成员未发生变化')
    return
  }
  saving.value = true
  try {
    if (added.length) await teamUsersAdd(props.teamId, added)
    for (const id of removed) {
      await teamUserRemove(props.teamId, id)
    }
    ElMessage.success('成员保存成功')
  } catch {
    /* 响应拦截器已提示 */
  } finally {
    // 无论成功或部分失败,都从服务端真值重新对账,避免残留乐观态
    await load()
    saving.value = false
  }
}
</script>

<style scoped>
.members {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.members__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.members__title {
  font-weight: 600;
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: Commit**

```bash
git add src/views/system/team/TeamMembers.vue
git commit -m "✨ feat(vue3): 2c 班组成员面板(穿梭框 v-model + diff 保存 + 服务端对账)"
```

---

## Task 7: 班组主从页 `TeamPage.vue` + 路由 + urlMap

**Files:**
- Create: `src/views/system/team/TeamPage.vue`
- Modify: `src/utils/urlMap.ts`
- Modify: `src/router/index.ts`

- [ ] **Step 1: 写主从页（镜像 DeviceGroupPage，列含上下班/工作日/成员数）**

```vue
<template>
  <PageContainer title="班组员工定义">
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
            <el-input v-model="search.code" placeholder="班组代码" clearable class="qbox" @keyup.enter="handleSearch" />
            <el-input v-model="search.name" placeholder="班组名称" clearable class="qbox" @keyup.enter="handleSearch" />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-button v-permission="'team:add'" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
          </template>

          <template #col-shift="{ row }">
            {{ shiftText(row as SpTeamDTO) }}
          </template>
          <template #col-workdays="{ row }">
            {{ workdaysLabel((row as SpTeamDTO).workdays) }}
          </template>

          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="openEdit(row as SpTeamDTO)">编辑</el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row as SpTeamDTO)">删除</el-button>
          </template>
        </DataTable>
      </template>

      <template #detail>
        <TeamMembers v-if="selected?.id" :key="selected.id" :team-id="selected.id" />
      </template>
      <template #detail-empty>
        <el-empty description="请选择左侧班组以维护成员" />
      </template>
    </MasterDetailLayout>

    <TeamForm
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
import TeamForm from './TeamForm.vue'
import TeamMembers from './TeamMembers.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { teamPage, teamAddOrUpdate, teamDelete } from '@/api/system/team'
import { workdaysLabel } from '@/utils/team'
import type { SpTeam, SpTeamDTO } from '@/types/team'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })
const selected = ref<SpTeamDTO | null>(null)

const { data: pageData, loading, run } = useRequest(
  () => teamPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpTeamDTO[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

// 列表刷新后,选中班组若已不在行集中,清空选中避免陈旧引用
watch(tableData, (rows) => {
  if (selected.value && !rows.some((r) => r.id === selected.value!.id)) {
    selected.value = null
  }
})

const columns: Column[] = [
  { prop: 'code', label: '班组代码', width: 120 },
  { prop: 'name', label: '班组名称', minWidth: 140 },
  { prop: 'shift', label: '上下班', width: 130 },
  { prop: 'workdays', label: '工作日', minWidth: 160 },
  { prop: 'userCount', label: '成员数', width: 90 },
]

function shiftText(row: SpTeamDTO): string {
  if (!row.startTime && !row.endTime) return '-'
  return `${row.startTime ?? '--'} ~ ${row.endTime ?? '--'}`
}

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpTeamDTO> | null>(null)
const submitLoading = ref(false)

function select(row: SpTeamDTO) {
  selected.value = row
}
function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpTeamDTO) {
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

async function handleFormSubmit(dto: Partial<SpTeam>) {
  submitLoading.value = true
  try {
    await teamAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpTeamDTO) {
  try {
    await ElMessageBox.confirm(`确认删除班组「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await teamDelete(row.id!)
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

- [ ] **Step 2: urlMap 加映射**

`src/utils/urlMap.ts` 在 `'/admin/sys/department/list-ui': '/system/department',` 之后加一行：

```ts
  '/admin/sys/team/list-ui': '/system/team',
```

- [ ] **Step 3: router 加路由**

`src/router/index.ts` 在 `system/dict` 路由对象之后、`basedata/materile` 之前插入：

```ts
      {
        path: 'system/team',
        component: () => import('@/views/system/team/TeamPage.vue'),
        meta: { title: '班组员工定义', perm: 'team:add' },
      },
```

- [ ] **Step 4: 类型检查 + 构建**

Run: `pnpm typecheck && pnpm build`
Expected: 0 错误 / build ✓

- [ ] **Step 5: Commit**

```bash
git add src/views/system/team/TeamPage.vue src/utils/urlMap.ts src/router/index.ts
git commit -m "✨ feat(vue3): 2c 班组主从页 + 路由 + urlMap(/system/team)"
```

---

## Task 8: 加工单元关联班组面板 `ProcessUnitTeams.vue`

**Files:**
- Create: `src/views/basedata/process-unit/ProcessUnitTeams.vue`

- [ ] **Step 1: 写面板（候选=全量班组排除已绑;镜像成员面板的 diff 保存）**

```vue
<template>
  <div class="punit-teams">
    <div class="punit-teams__bar">
      <span class="punit-teams__title">关联班组维护</span>
      <el-button type="primary" size="small" :loading="saving" @click="save">保存关联</el-button>
    </div>
    <DualListTransfer
      v-model="selected"
      :candidates="candidates"
      :titles="['可选班组', '已关联班组']"
      :loading="loading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import DualListTransfer from '@/components/DualListTransfer.vue'
import { teamPage } from '@/api/system/team'
import { processUnitTeams, processUnitTeamAdd, processUnitTeamRemove } from '@/api/basedata/processUnit'
import { teamToTransferItem } from '@/utils/team'
import { diffMembers } from '@/utils/device'
import type { TransferItem } from '@/types/technology'

const props = defineProps<{ unitId: string }>()

const candidates = ref<TransferItem[]>([])
const selected = ref<TransferItem[]>([])
const originalIds = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)

async function load() {
  if (!props.unitId) return
  loading.value = true
  try {
    // 候选=全量班组(大 size 兜底全量,已知 PaginationInterceptor 上限,见 backlog);已绑=该单元关联班组
    const [allRes, bound] = await Promise.all([
      teamPage({ current: 1, size: 1000 }),
      processUnitTeams(props.unitId),
    ])
    candidates.value = (allRes?.records ?? []).map(teamToTransferItem)
    selected.value = (bound ?? []).map(teamToTransferItem)
    originalIds.value = (bound ?? []).map((t) => t.id ?? '')
  } finally {
    loading.value = false
  }
}

// 父组件以 :key="unit.id" 强制重挂载,隔离并行加载竞态
watch(() => props.unitId, load, { immediate: true })

async function save() {
  const nextIds = selected.value.map((i) => i.id)
  const { added, removed } = diffMembers(originalIds.value, nextIds)
  if (!added.length && !removed.length) {
    ElMessage.info('关联未发生变化')
    return
  }
  saving.value = true
  try {
    for (const id of added) {
      await processUnitTeamAdd(props.unitId, id)
    }
    for (const id of removed) {
      await processUnitTeamRemove(props.unitId, id)
    }
    ElMessage.success('关联保存成功')
  } catch {
    /* 响应拦截器已提示 */
  } finally {
    await load()
    saving.value = false
  }
}
</script>

<style scoped>
.punit-teams {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.punit-teams__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.punit-teams__title {
  font-weight: 600;
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: Commit**

```bash
git add src/views/basedata/process-unit/ProcessUnitTeams.vue
git commit -m "✨ feat(vue3): 2c 加工单元关联班组面板(穿梭框 + diff 保存)"
```

---

## Task 9: 加工单元页升级为主从 `ProcessUnitList.vue`

**Files:**
- Modify: `src/views/basedata/process-unit/ProcessUnitList.vue`

> 保留文件名与路由名 `basedata-process-unit`，就地把 `PageContainer + DataTable` 改成 `PageContainer + MasterDetailLayout(左 DataTable / 右 ProcessUnitTeams)`。左侧 CRUD 逻辑全保留，新增 `selected` 选中 + `@row-click`。

- [ ] **Step 1: 全量替换 `ProcessUnitList.vue`**

```vue
<template>
  <PageContainer>
    <MasterDetailLayout :has-selection="!!selected?.id">
      <template #master>
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
          @row-click="select"
          @page-change="handlePageChange"
          @size-change="handleSizeChange"
        >
          <template #toolbar>
            <el-button v-permission="'process-unit:add'" type="primary" :icon="Plus" @click="openCreate">
              新增
            </el-button>
          </template>

          <template #col-hasLineWarehouse="{ row }">
            <el-tag :type="(row as SpProcessUnit).hasLineWarehouse === '1' ? 'success' : 'info'" effect="plain">
              {{ (row as SpProcessUnit).hasLineWarehouse === '1' ? '是' : '否' }}
            </el-tag>
          </template>

          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="openEdit(row as SpProcessUnit)">编辑</el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row as SpProcessUnit)">删除</el-button>
          </template>
        </DataTable>
      </template>

      <template #detail>
        <ProcessUnitTeams v-if="selected?.id" :key="selected.id" :unit-id="selected.id" />
      </template>
      <template #detail-empty>
        <el-empty description="请选择左侧加工单元以维护关联班组" />
      </template>
    </MasterDetailLayout>

    <ProcessUnitFormDialog
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
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ProcessUnitFormDialog from './ProcessUnitFormDialog.vue'
import ProcessUnitTeams from './ProcessUnitTeams.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { processUnitPage, processUnitAddOrUpdate, processUnitDelete } from '@/api/basedata/processUnit'
import type { SpProcessUnit } from '@/types/processUnit'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })
const selected = ref<SpProcessUnit | null>(null)

const { data: pageData, loading, run } = useRequest(
  () => processUnitPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpProcessUnit[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

// 列表刷新后,选中单元若已不在行集中,清空选中避免陈旧引用
watch(tableData, (rows) => {
  if (selected.value && !rows.some((r) => r.id === selected.value!.id)) {
    selected.value = null
  }
})

const columns: Column[] = [
  { prop: 'code', label: '单元代码', width: 140 },
  { prop: 'name', label: '单元名称', minWidth: 160 },
  { prop: 'type', label: '类型', minWidth: 120 },
  { prop: 'hasLineWarehouse', label: '线边库', width: 90 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpProcessUnit> | null>(null)
const submitLoading = ref(false)

function select(row: SpProcessUnit) {
  selected.value = row
}
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
    if (selected.value?.id === row.id) selected.value = null
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
```

- [ ] **Step 2: 类型检查 + 构建**

Run: `pnpm typecheck && pnpm build`
Expected: 0 错误 / build ✓

- [ ] **Step 3: Commit**

```bash
git add src/views/basedata/process-unit/ProcessUnitList.vue
git commit -m "✨ feat(vue3): 2c 加工单元页升级主从(右侧关联班组面板)"
```

---

## Task 10: 后端审查 + 全门禁 + ROADMAP

**Files:**
- Modify: `mes/vue3/docs/ROADMAP.md`
- （后端仅在发现暴露 bug 时改动）

- [ ] **Step 1: 后端审查（按 [[backend-deepseek-review-each-cycle]]）**

逐项读码复核（预期零改动）：
- `SpTeamController`：`add-or-update`(saveOrUpdate 空 id 走雪花插入)、`delete`(软删 is_deleted='1')、`available-users`(过滤 is_deleted='0')、`users/add`(按 team_id+user_id 去重)、`users/remove`、`getTeamUsers`。
- `SpProcessUnitController` 的 `/teams/{unitId}`、`/teams/add`(去重守卫)、`/teams/remove`(物理删) + 相关 `ISpProcessUnitTeamService`。
- `pageWithRelations`：确认 page 过滤 is_deleted、userCount 派生正确。

若发现暴露 bug → 最小纯新增修正 + Mockito 守卫单测（JUnit4，AssertJ 风格对齐同包 `Cycle*BackendTest`）；否则记 backlog（见 spec §9）。

- [ ] **Step 2: 前端全门禁**

Run: `pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: typecheck 0 / test 全绿(较 281 上升约 +9) / lint 0 err / build ✓

- [ ] **Step 3: 更新 ROADMAP**

`mes/vue3/docs/ROADMAP.md`：
- §9.1 矩阵「班组管理（成员）」`C2 | ☐` → `C2·2c | ✅`
- §8 Cycle 2 段补 2c 完成条目（参考 2b-2 条目风格：分支/交付/沉淀/后端审查结论/菜单/门禁数/backlog/人工冒烟待确认）
- §11 进度快照补 2c 一行

- [ ] **Step 4: Commit**

```bash
git add mes/vue3/docs/ROADMAP.md
git commit -m "📝 docs(vue3): ROADMAP 标记 2c 组织·班组完成"
```

---

## 验证清单（完成全部任务后）

- [ ] 前端门禁全绿：`pnpm typecheck`(0) / `pnpm test`(全绿) / `pnpm lint:check`(0 err) / `pnpm build`(✓)
- [ ] 后端 `mvn compile` BUILD SUCCESS（若有改动）+ 守卫单测绿
- [ ] subagent 驱动逐任务两阶段审查 + opus 整体终审
- [ ] **人工 :4200 冒烟（用户确认）**：后端 9090 + DB 跑 `scripts/sql/team-management.sql`，`admin/123` 登录
  - 系统管理 → 班组员工定义：新增班组(填上下班/工作日多选) → 列表显示上下班/工作日中文/成员数 → 选中 → 成员面板穿梭加/减 → 保存成员 → 编辑(回填工作日) → 软删消失
  - 物料管理 → 加工单元：选中单元 → 右侧关联班组穿梭加/减 → 保存关联 → 删单元右面板回退空态

## backlog（预登记）

- `getTeamUsers`/`processUnitTeams` 不过滤成员/班组软删（与 mes-new 2l 一致判定，避免与 userCount 徽标不一致）。
- 候选池 `teamPage`/`available-users` 大 size 兜底全量（PaginationInterceptor 上限，同 1f/2a/2b-1）。
- `process-unit/teams/add` 无 `@Transactional`（单行 insert，低危）。
- `DualListTransfer` 内联保存形态（非弹窗）——对齐 device-group 姊妹模式；与 spec §3 文字描述的「弹窗」略有出入，已统一为内联（更一致、更简单）。
</content>
