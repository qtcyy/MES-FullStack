# 子周期 1c-1 工艺路线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Vue3 实现「工艺路线线」第一段——工序定义 CRUD + 工艺路线管理（有序穿梭框配工序），对接现有后端，菜单驱动可达。

**Architecture:** 沿用 `mes/vue3` 既有分层（`api/` + `types/` + `utils/`纯函数TDD + `views/`业务页 + `components/`通用原语）。新增通用有序穿梭框 `OrderedTransfer.vue`。工艺路线顺序由穿梭框有序数组承载，提交 `SpFlowDto` 给后端推导前后道/排序/链串。后端做两处最小修正（删除引用守卫 + 删除事务性）。

**Tech Stack:** Vue 3.5 `<script setup>` + TS + Element Plus（按需）+ Pinia + Vitest（纯函数）+ 后端 Spring Boot/MyBatis-Plus（JDK11 系统 mvn）。

参考 spec：`mes/vue3/docs/specs/2026-06-20-cycle1c1-technology-flow-design.md`。

> **路径基准**：前端命令在 `mes/vue3/` 下执行（`pnpm test` / `pnpm typecheck` / `pnpm lint:check` / `pnpm build`）。后端命令在仓库根 `mes/` 下用系统 `mvn`（`JAVA_HOME=corretto-11`）。Git 操作在仓库根 `/Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue`。当前分支 `feature/technology-flow`。

---

## File Structure

**新建（前端）**
- `mes/vue3/src/types/technology.ts` — 工艺/工序实体与 DTO 类型 + `TransferItem`。
- `mes/vue3/src/api/technology/oper.ts` — 工序 5 端点。
- `mes/vue3/src/api/technology/flow.ts` — 工艺路线/关系 5 端点。
- `mes/vue3/src/utils/technology.ts` — 纯函数（payload/校验/重排/转换）。
- `mes/vue3/tests/technology.spec.ts` — 纯函数单测。
- `mes/vue3/src/components/OrderedTransfer.vue` — 通用有序穿梭框。
- `mes/vue3/src/views/technology/oper/OperList.vue` + `OperForm.vue` — 工序定义页。
- `mes/vue3/src/views/technology/flow/FlowList.vue` + `FlowProcessEditor.vue` — 工艺路线页。
- `scripts/sql/oper-menu-seed.sql` — 工序定义菜单种子（id 153）。

**修改（前端）**
- `mes/vue3/src/utils/urlMap.ts` — 加 2 条映射。
- `mes/vue3/src/router/index.ts` — 注册 2 路由。

**修改（后端，按审查结论）**
- `SpOperController.java` / 新增 `SpOperService` 守卫方法 — 工序删除引用守卫。
- `SpFlowOperRelationController.java` + `SpFlowOperRelationServiceImpl.java` — 删除事务化。
- 对应 `*Test.java` Mockito 守卫单测。

---

## Task 1: 类型与 API 函数

**Files:**
- Create: `mes/vue3/src/types/technology.ts`
- Create: `mes/vue3/src/api/technology/oper.ts`
- Create: `mes/vue3/src/api/technology/flow.ts`

- [ ] **Step 1: 写类型 `types/technology.ts`**

```ts
import type { PageReq, IPage } from '@/types/system'

export type { IPage }

/** 工序(对应 sp_oper) */
export interface SpOper {
  id: string
  oper?: string                // 工序名(后端用 operCode 同值填充)
  operCode?: string            // 工序编号 OPR-XXX(后端自动生成)
  operDesc: string             // 工序描述(必填)
  processUnitId?: string       // 加工单元 id(可空)
  laborHours?: number          // 工时(分钟)
  manufacturingCycle?: number  // 制造周期(分钟),须 > laborHours
  generatePlan?: string        // '0' 否 / '1' 是
  remark?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 工序分页请求 */
export interface OperPageReq extends PageReq {
  operDescLike?: string
}

/** 加工单元下拉选项(对应 sp_process_unit,取 id + name) */
export interface SpProcessUnitOption {
  id: string
  code?: string
  name: string
  type?: string
}

/** 工艺路线(对应 sp_flow) */
export interface SpFlow {
  id: string
  flow: string         // 流程代码
  flowDesc?: string    // 流程/线体描述
  process?: string     // 工序链串(后端生成,只读,形如 A->B->C)
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 工艺路线分页请求 */
export type FlowPageReq = PageReq

/** 穿梭框/关系 VO(后端 SpOperVo) value=工序id, title=工序编码 */
export interface SpOperVo {
  value: string
  title: string
}

/** 工艺路线级联保存入参(后端 SpFlowDto) */
export interface SpFlowDtoReq {
  id?: string
  flow: string
  flowDesc?: string
  spOperVoList: SpOperVo[]   // 有序,顺序即执行顺序
}

/** 通用穿梭框项 */
export interface TransferItem {
  id: string
  primary: string       // 主显(工序描述)
  secondary?: string    // 次显(工序编码)
}
```

- [ ] **Step 2: 写 `api/technology/oper.ts`**

```ts
import { http } from '@/api/request'
import type { SpOper, OperPageReq, SpProcessUnitOption, IPage } from '@/types/technology'

export const operPage = (req: OperPageReq) =>
  http.post<IPage<SpOper>>('/basedata/sp-oper/page', req)

export const operList = () => http.get<SpOper[]>('/basedata/sp-oper/list')

export const operAddOrUpdate = (dto: Partial<SpOper>) =>
  http.post<string>('/basedata/sp-oper/add-or-update', dto)

/** 删除工序(JSON 端点,第三参 true 走 application/json) */
export const operDelete = (id: string) =>
  http.post<void>('/basedata/sp-oper/delete', { id }, true)

export const operProcessUnits = () =>
  http.get<SpProcessUnitOption[]>('/basedata/sp-oper/process-units')
```

- [ ] **Step 3: 写 `api/technology/flow.ts`**

```ts
import { http } from '@/api/request'
import type { SpFlow, FlowPageReq, SpFlowDtoReq, SpOperVo, IPage } from '@/types/technology'

export const flowPage = (req: FlowPageReq) =>
  http.post<IPage<SpFlow>>('/basedata/flow/page', req)

export const flowList = () => http.get<SpFlow[]>('/basedata/flow/list')

/** 保存工艺路线+工序链(JSON 端点,第三参 true) */
export const flowSaveProcess = (dto: SpFlowDtoReq) =>
  http.post<void>('/basedata/flow/process/add-or-update', dto, true)

/** 删除工艺路线(级联删关系,form 编码) */
export const flowDelete = (id: string) =>
  http.post<void>('/basedata/flow/process/delete', { id })

/** 取路线下有序工序链(编辑回填) */
export const flowOpers = (flowId: string) =>
  http.get<SpOperVo[]>(`/basedata/flow/process/opers/${flowId}`)
```

- [ ] **Step 4: 类型检查通过**

Run（在 `mes/vue3/`）：`pnpm typecheck`
Expected: 0 错误（新文件无类型问题；尚无引用方）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/types/technology.ts mes/vue3/src/api/technology/oper.ts mes/vue3/src/api/technology/flow.ts
git commit -m "✨ feat(vue3): 工艺路线模块类型与 API(flow/oper/穿梭框)"
```

---

## Task 2: 纯函数 + TDD（`utils/technology.ts`）

**Files:**
- Create: `mes/vue3/src/utils/technology.ts`
- Test: `mes/vue3/tests/technology.spec.ts`

- [ ] **Step 1: 写失败测试 `tests/technology.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  buildOperPayload,
  validateOper,
  operToTransferItem,
  excludeSelected,
  moveItem,
  toSpOperVoList,
  buildFlowPayload,
  validateFlow,
} from '@/utils/technology'
import type { SpOper, TransferItem } from '@/types/technology'

const item = (id: string, primary: string, secondary?: string): TransferItem => ({ id, primary, secondary })

describe('buildOperPayload', () => {
  it('剥空串、数值化、generatePlan 兜底 1', () => {
    const p = buildOperPayload({ operDesc: '装配', remark: '', laborHours: '5' as unknown as number, manufacturingCycle: 8 })
    expect(p).toEqual({ operDesc: '装配', laborHours: 5, manufacturingCycle: 8, generatePlan: '1' })
  })
  it('保留 id 与已填 generatePlan', () => {
    const p = buildOperPayload({ id: 'o1', operDesc: 'd', generatePlan: '0' })
    expect(p.id).toBe('o1')
    expect(p.generatePlan).toBe('0')
  })
})

describe('validateOper', () => {
  it('描述必填', () => {
    expect(validateOper({ operDesc: '' })).toBe('请输入工序描述')
  })
  it('制造周期须大于工时', () => {
    expect(validateOper({ operDesc: 'd', laborHours: 8, manufacturingCycle: 8 })).toBe('制造周期必须大于工时')
    expect(validateOper({ operDesc: 'd', laborHours: 8, manufacturingCycle: 5 })).toBe('制造周期必须大于工时')
  })
  it('工时/周期须为非负整数', () => {
    expect(validateOper({ operDesc: 'd', laborHours: -1, manufacturingCycle: 5 })).toBe('工时与制造周期须为非负整数')
    expect(validateOper({ operDesc: 'd', laborHours: 1.5, manufacturingCycle: 5 })).toBe('工时与制造周期须为非负整数')
  })
  it('合法返回 null', () => {
    expect(validateOper({ operDesc: 'd', laborHours: 5, manufacturingCycle: 8 })).toBeNull()
    expect(validateOper({ operDesc: 'd' })).toBeNull()
  })
})

describe('operToTransferItem', () => {
  it('SpOper → TransferItem(primary=描述, secondary=编码)', () => {
    const o = { id: 'o1', operDesc: '装配工序', operCode: 'OPR-001' } as SpOper
    expect(operToTransferItem(o)).toEqual({ id: 'o1', primary: '装配工序', secondary: 'OPR-001' })
  })
})

describe('excludeSelected', () => {
  it('候选池排除已选 id', () => {
    const pool = [item('a', 'A'), item('b', 'B'), item('c', 'C')]
    expect(excludeSelected(pool, new Set(['b']))).toEqual([item('a', 'A'), item('c', 'C')])
  })
})

describe('moveItem', () => {
  const list = [item('a', 'A'), item('b', 'B'), item('c', 'C')]
  it('上移(dir=-1)', () => {
    expect(moveItem(list, 1, -1).map((x) => x.id)).toEqual(['b', 'a', 'c'])
  })
  it('下移(dir=1)', () => {
    expect(moveItem(list, 1, 1).map((x) => x.id)).toEqual(['a', 'c', 'b'])
  })
  it('越界不变(首项上移/末项下移)', () => {
    expect(moveItem(list, 0, -1)).toEqual(list)
    expect(moveItem(list, 2, 1)).toEqual(list)
  })
  it('不可变(不改原数组)', () => {
    const copy = [...list]
    moveItem(list, 1, -1)
    expect(list).toEqual(copy)
  })
})

describe('toSpOperVoList', () => {
  it('有序项 → [{value=id, title=编码}],保持顺序', () => {
    expect(toSpOperVoList([item('a', '装配', 'OPR-001'), item('b', '测试', 'OPR-002')])).toEqual([
      { value: 'a', title: 'OPR-001' },
      { value: 'b', title: 'OPR-002' },
    ])
  })
  it('secondary 缺失时回落 primary', () => {
    expect(toSpOperVoList([item('a', '装配')])).toEqual([{ value: 'a', title: '装配' }])
  })
})

describe('buildFlowPayload', () => {
  it('新增:无 id,组装 spOperVoList', () => {
    const p = buildFlowPayload({ flow: 'F1', flowDesc: '线A' }, [item('a', '装配', 'OPR-001'), item('b', '测试', 'OPR-002')])
    expect(p).toEqual({ flow: 'F1', flowDesc: '线A', spOperVoList: [{ value: 'a', title: 'OPR-001' }, { value: 'b', title: 'OPR-002' }] })
  })
  it('编辑:带 id', () => {
    const p = buildFlowPayload({ id: 'x', flow: 'F1', flowDesc: '线A' }, [item('a', '装配', 'OPR-001'), item('b', '测试', 'OPR-002')])
    expect(p.id).toBe('x')
  })
})

describe('validateFlow', () => {
  const two = [item('a', '装配'), item('b', '测试')]
  it('流程代码必填', () => {
    expect(validateFlow({ flow: '', flowDesc: 'd' }, two)).toBe('请输入流程代码')
  })
  it('流程描述必填', () => {
    expect(validateFlow({ flow: 'F1', flowDesc: '' }, two)).toBe('请输入流程描述')
  })
  it('至少 2 道工序', () => {
    expect(validateFlow({ flow: 'F1', flowDesc: 'd' }, [item('a', '装配')])).toBe('工艺路线至少需要 2 道工序')
  })
  it('合法返回 null', () => {
    expect(validateFlow({ flow: 'F1', flowDesc: 'd' }, two)).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run（`mes/vue3/`）：`pnpm test`
Expected: FAIL —— `technology.spec.ts` 报模块/导出未定义。

- [ ] **Step 3: 实现 `utils/technology.ts`**

```ts
import type { SpOper, TransferItem, SpOperVo, SpFlowDtoReq } from '@/types/technology'

/** 构造工序 add-or-update 提交体:剥空、数值化、generatePlan 兜底 '1' */
export function buildOperPayload(form: Partial<SpOper>): Partial<SpOper> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === '') continue
    out[k] = v
  }
  if (out.laborHours !== undefined) out.laborHours = Number(out.laborHours)
  if (out.manufacturingCycle !== undefined) out.manufacturingCycle = Number(out.manufacturingCycle)
  if (out.generatePlan === undefined) out.generatePlan = '1'
  return out as Partial<SpOper>
}

/** 校验工序表单,返回错误信息或 null。规则:描述必填、工时/周期非负整数、制造周期 > 工时 */
export function validateOper(form: Partial<SpOper>): string | null {
  if (!form.operDesc || !form.operDesc.trim()) return '请输入工序描述'
  const lh = form.laborHours
  const mc = form.manufacturingCycle
  const bad = (n: number | undefined) => n !== undefined && (!Number.isInteger(n) || n < 0)
  if (bad(lh) || bad(mc)) return '工时与制造周期须为非负整数'
  if (lh !== undefined && mc !== undefined && mc <= lh) return '制造周期必须大于工时'
  return null
}

/** SpOper → 穿梭框项(primary=描述, secondary=编码) */
export function operToTransferItem(o: SpOper): TransferItem {
  return { id: o.id, primary: o.operDesc, secondary: o.operCode }
}

/** 候选池排除已选 id */
export function excludeSelected(pool: TransferItem[], selectedIds: Set<string>): TransferItem[] {
  return pool.filter((it) => !selectedIds.has(it.id))
}

/** 不可变重排:把 idx 处元素按 dir(-1 上/1 下)移动一位;越界原样返回 */
export function moveItem<T>(list: T[], idx: number, dir: -1 | 1): T[] {
  const target = idx + dir
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[idx], next[target]] = [next[target], next[idx]]
  return next
}

/** 有序工序项 → SpOperVo[](value=id, title=编码,缺失回落 primary) */
export function toSpOperVoList(items: TransferItem[]): SpOperVo[] {
  return items.map((it) => ({ value: it.id, title: it.secondary ?? it.primary }))
}

/** 组装工艺路线级联保存入参 */
export function buildFlowPayload(
  form: { id?: string; flow: string; flowDesc?: string },
  items: TransferItem[],
): SpFlowDtoReq {
  const payload: SpFlowDtoReq = {
    flow: form.flow.trim(),
    flowDesc: (form.flowDesc ?? '').trim(),
    spOperVoList: toSpOperVoList(items),
  }
  if (form.id) payload.id = form.id
  return payload
}

/** 校验工艺路线表单,返回错误信息或 null */
export function validateFlow(
  form: { flow: string; flowDesc?: string },
  items: TransferItem[],
): string | null {
  if (!form.flow || !form.flow.trim()) return '请输入流程代码'
  if (!form.flowDesc || !form.flowDesc.trim()) return '请输入流程描述'
  if (items.length < 2) return '工艺路线至少需要 2 道工序'
  return null
}
```

- [ ] **Step 4: 运行确认通过**

Run（`mes/vue3/`）：`pnpm test`
Expected: PASS —— `technology.spec.ts` 全绿，既有测试不破。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/technology.ts mes/vue3/tests/technology.spec.ts
git commit -m "✅ test(vue3): 工艺路线纯函数(payload/校验/重排/穿梭转换)TDD"
```

---

## Task 3: 通用有序穿梭框 `OrderedTransfer.vue`

**Files:**
- Create: `mes/vue3/src/components/OrderedTransfer.vue`

> 纯展示组件，无业务耦合。`v-model` 绑定右栏有序列表，`candidates` 是左栏全量池。复用 `excludeSelected`/`moveItem` 纯函数。Element Plus 组件与图标由 unplugin 自动按需，无需显式 import。列表动画用全局 `v-auto-animate`（与 `DataTable` 同款）。

- [ ] **Step 1: 写组件**

```vue
<template>
  <div class="ot">
    <!-- 左栏:候选池 -->
    <div class="ot__col">
      <div class="ot__head">
        <span>{{ titles[0] }}</span>
        <el-tag size="small" type="info" round>{{ available.length }}</el-tag>
      </div>
      <el-input v-model="keyword" placeholder="搜索工序" clearable size="small" class="ot__search">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <div class="ot__list" v-auto-animate>
        <button
          v-for="it in available"
          :key="it.id"
          type="button"
          class="ot__item ot__item--pick"
          @click="add(it)"
        >
          <span class="ot__primary">{{ it.primary }}</span>
          <span v-if="it.secondary" class="ot__secondary">{{ it.secondary }}</span>
          <el-icon class="ot__plus"><Plus /></el-icon>
        </button>
        <el-empty v-if="!available.length" description="无可选工序" :image-size="48" />
      </div>
    </div>

    <!-- 右栏:有序流水线 -->
    <div class="ot__col">
      <div class="ot__head">
        <span>{{ titles[1] }}</span>
        <el-tag size="small" type="primary" round>{{ modelValue.length }}</el-tag>
      </div>
      <div class="ot__list ot__list--ordered" v-auto-animate>
        <div v-for="(it, idx) in modelValue" :key="it.id" class="ot__item">
          <span class="ot__index">{{ idx + 1 }}</span>
          <span class="ot__primary">{{ it.primary }}</span>
          <span v-if="it.secondary" class="ot__secondary">{{ it.secondary }}</span>
          <el-tag v-if="modelValue.length >= 2 && idx === 0" size="small" type="success">首道</el-tag>
          <el-tag v-if="modelValue.length >= 2 && idx === modelValue.length - 1" size="small" type="warning">末道</el-tag>
          <span class="ot__ops">
            <el-button text size="small" :disabled="idx === 0" aria-label="上移" @click="move(idx, -1)">
              <el-icon><Top /></el-icon>
            </el-button>
            <el-button text size="small" :disabled="idx === modelValue.length - 1" aria-label="下移" @click="move(idx, 1)">
              <el-icon><Bottom /></el-icon>
            </el-button>
            <el-button text size="small" type="danger" aria-label="移除" @click="remove(it.id)">
              <el-icon><Close /></el-icon>
            </el-button>
          </span>
        </div>
        <el-empty v-if="!modelValue.length" :description="minHint" :image-size="48" />
      </div>
      <div v-if="modelValue.length" class="ot__preview">{{ chainPreview }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Plus, Top, Bottom, Close } from '@element-plus/icons-vue'
import { excludeSelected, moveItem } from '@/utils/technology'
import type { TransferItem } from '@/types/technology'

const props = withDefaults(
  defineProps<{
    modelValue: TransferItem[]
    candidates: TransferItem[]
    titles?: [string, string]
    minHint?: string
  }>(),
  { titles: () => ['可选工序', '工序流水线'], minHint: '从左侧添加工序(至少 2 道)' },
)

const emit = defineEmits<{ 'update:modelValue': [TransferItem[]] }>()

const keyword = ref('')

const selectedIds = computed(() => new Set(props.modelValue.map((i) => i.id)))

const available = computed(() => {
  const pool = excludeSelected(props.candidates, selectedIds.value)
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return pool
  return pool.filter(
    (it) => it.primary.toLowerCase().includes(kw) || (it.secondary ?? '').toLowerCase().includes(kw),
  )
})

const chainPreview = computed(() => props.modelValue.map((i) => i.primary).join(' → '))

function add(it: TransferItem) {
  emit('update:modelValue', [...props.modelValue, it])
}
function remove(id: string) {
  emit('update:modelValue', props.modelValue.filter((i) => i.id !== id))
}
function move(idx: number, dir: -1 | 1) {
  emit('update:modelValue', moveItem(props.modelValue, idx, dir))
}
</script>

<style scoped>
.ot { display: flex; gap: var(--sp-4); }
.ot__col { flex: 1; min-width: 0; border: 1px solid var(--el-border-color); border-radius: 6px; padding: var(--sp-3); display: flex; flex-direction: column; }
.ot__head { display: flex; align-items: center; justify-content: space-between; font-weight: 600; margin-bottom: var(--sp-2); }
.ot__search { margin-bottom: var(--sp-2); }
.ot__list { flex: 1; min-height: 220px; max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: var(--sp-1); }
.ot__item { display: flex; align-items: center; gap: var(--sp-2); padding: 6px 8px; border-radius: 4px; background: var(--el-fill-color-light); width: 100%; text-align: left; border: none; }
.ot__item--pick { cursor: pointer; }
.ot__item--pick:hover { background: var(--el-color-primary-light-9); }
.ot__index { width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 50%; background: var(--el-color-primary); color: #fff; font-size: 12px; flex: none; }
.ot__primary { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ot__secondary { color: var(--el-text-color-secondary); font-size: 12px; flex: none; }
.ot__plus { margin-left: auto; color: var(--el-color-primary); }
.ot__ops { display: flex; align-items: center; margin-left: auto; flex: none; }
.ot__preview { margin-top: var(--sp-2); padding-top: var(--sp-2); border-top: 1px dashed var(--el-border-color); color: var(--el-text-color-secondary); font-size: 13px; word-break: break-all; }
</style>
```

- [ ] **Step 2: 类型检查通过**

Run（`mes/vue3/`）：`pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/components/OrderedTransfer.vue
git commit -m "✨ feat(vue3): 通用有序穿梭框 OrderedTransfer(搜索/上下移/移除/链预览/a11y)"
```

---

## Task 4: 工序定义页（OperList + OperForm）

**Files:**
- Create: `mes/vue3/src/views/technology/oper/OperForm.vue`
- Create: `mes/vue3/src/views/technology/oper/OperList.vue`

- [ ] **Step 1: 写 `OperForm.vue`**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑工序' : '新增工序'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item v-if="isEdit" label="工序编码">
            <el-input :model-value="form.operCode" disabled placeholder="保存后自动生成" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="加工单元" prop="processUnitId">
            <el-select v-model="form.processUnitId" placeholder="请选择加工单元" clearable style="width: 100%">
              <el-option v-for="u in processUnits" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="工序描述" prop="operDesc">
        <el-input v-model="form.operDesc" placeholder="请输入工序描述" clearable />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="工时(分)" prop="laborHours">
            <el-input-number v-model="form.laborHours" :min="0" :precision="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="制造周期(分)" prop="manufacturingCycle">
            <el-input-number v-model="form.manufacturingCycle" :min="0" :precision="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="生成计划">
            <el-switch v-model="form.generatePlan" active-value="1" inactive-value="0" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { operProcessUnits } from '@/api/technology/oper'
import { buildOperPayload, validateOper } from '@/utils/technology'
import type { SpOper } from '@/types/technology'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpOper> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpOper>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

// 加工单元下拉(全量,GET 端点)
const { data: processUnits } = useRequest(operProcessUnits, { immediate: true, initialData: [] })

const form = reactive<Partial<SpOper>>({
  id: undefined,
  operCode: undefined,
  operDesc: '',
  processUnitId: undefined,
  laborHours: 0,
  manufacturingCycle: 1,
  generatePlan: '1',
  remark: undefined,
})

function resetForm() {
  form.id = undefined
  form.operCode = undefined
  form.operDesc = ''
  form.processUnitId = undefined
  form.laborHours = 0
  form.manufacturingCycle = 1
  form.generatePlan = '1'
  form.remark = undefined
}

watch(
  () => props.model,
  (val) => {
    if (val) Object.assign(form, { laborHours: 0, manufacturingCycle: 1, generatePlan: '1', ...val })
    else resetForm()
  },
  { immediate: true },
)

const rules: FormRules = {
  operDesc: [{ required: true, message: '请输入工序描述', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  // 业务规则(制造周期>工时)前端先拦,后端二次校验
  const err = validateOper({ ...form })
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildOperPayload({ ...form }))
}
</script>
```

- [ ] **Step 2: 写 `OperList.vue`**

```vue
<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="工序描述">
        <el-input v-model="search.operDescLike" placeholder="请输入工序描述" clearable />
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
        <el-button v-permission="'oper:add'" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </template>

      <template #col-generatePlan="{ row }">
        <el-tag size="small" :type="row.generatePlan === '1' ? 'success' : 'info'">
          {{ row.generatePlan === '1' ? '是' : '否' }}
        </el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpOper)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpOper)">删除</el-button>
      </template>
    </DataTable>

    <OperForm
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
import OperForm from './OperForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { operPage, operAddOrUpdate, operDelete } from '@/api/technology/oper'
import type { SpOper } from '@/types/technology'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ operDescLike: '' })

const { data: pageData, loading, run } = useRequest(
  () => operPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpOper[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'operCode', label: '工序编码', width: 130 },
  { prop: 'operDesc', label: '工序描述', minWidth: 160 },
  { prop: 'laborHours', label: '工时(分)', width: 100 },
  { prop: 'manufacturingCycle', label: '制造周期(分)', width: 120 },
  { prop: 'generatePlan', label: '生成计划', width: 100 },
  { prop: 'remark', label: '备注', minWidth: 120 },
  { prop: 'createTime', label: '创建时间', minWidth: 160 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpOper> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpOper) {
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
  search.operDescLike = ''
  reset()
  run()
}

async function handleFormSubmit(dto: Partial<SpOper>) {
  submitLoading.value = true
  try {
    await operAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpOper) {
  try {
    await ElMessageBox.confirm(`确认删除工序「${row.operDesc}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await operDelete(row.id)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示(含「被引用拒删」后端文案) */ }
}
</script>
```

- [ ] **Step 3: 类型检查通过**

Run（`mes/vue3/`）：`pnpm typecheck`
Expected: 0 错误（路由尚未挂，但组件本身类型自洽）。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/technology/oper/
git commit -m "✨ feat(vue3): 工序定义页(列表 搜索/分页 + 新增/编辑弹窗 校验/加工单元下拉/软删确认)"
```

---

## Task 5: 工艺路线页（FlowList + FlowProcessEditor）

**Files:**
- Create: `mes/vue3/src/views/technology/flow/FlowProcessEditor.vue`
- Create: `mes/vue3/src/views/technology/flow/FlowList.vue`

- [ ] **Step 1: 写 `FlowProcessEditor.vue`**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑工艺路线' : '新增工艺路线'"
    width="820px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="流程代码" prop="flow">
            <el-input v-model="form.flow" placeholder="请输入流程代码" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="流程描述" prop="flowDesc">
            <el-input v-model="form.flowDesc" placeholder="请输入流程描述" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="工序编排" prop="opers">
        <OrderedTransfer v-model="orderedOpers" :candidates="candidates" v-loading="poolLoading" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import OrderedTransfer from '@/components/OrderedTransfer.vue'
import { operList } from '@/api/technology/oper'
import { flowOpers } from '@/api/technology/flow'
import { operToTransferItem, buildFlowPayload, validateFlow } from '@/utils/technology'
import type { SpFlow, TransferItem, SpFlowDtoReq } from '@/types/technology'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;SpFlow = 编辑 */
  model: SpFlow | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [SpFlowDtoReq]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const form = reactive<{ flow: string; flowDesc: string }>({ flow: '', flowDesc: '' })
const orderedOpers = ref<TransferItem[]>([])
const candidates = ref<TransferItem[]>([])
const poolLoading = ref(false)

// 打开弹窗:取候选池;编辑态再取有序工序链回填
watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    form.flow = props.model?.flow ?? ''
    form.flowDesc = props.model?.flowDesc ?? ''
    orderedOpers.value = []
    poolLoading.value = true
    try {
      const pool = await operList()
      candidates.value = pool.map(operToTransferItem)
      if (props.model?.id) {
        const chain = await flowOpers(props.model.id)
        const byId = new Map(candidates.value.map((c) => [c.id, c]))
        // 回填有序链:用候选池补 primary(描述);候选缺失时用 vo.title 兜底
        orderedOpers.value = chain.map(
          (vo) => byId.get(vo.value) ?? { id: vo.value, primary: vo.title, secondary: vo.title },
        )
      }
    } finally {
      poolLoading.value = false
    }
  },
)

const rules: FormRules = {
  flow: [{ required: true, message: '请输入流程代码', trigger: 'blur' }],
  flowDesc: [{ required: true, message: '请输入流程描述', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  const err = validateFlow(form, orderedOpers.value)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildFlowPayload({ id: props.model?.id, ...form }, orderedOpers.value))
}
</script>
```

- [ ] **Step 2: 写 `FlowList.vue`**

```vue
<template>
  <PageContainer>
    <DataTable
      :data="tableData"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <template #toolbar>
        <el-button v-permission="'flow:add'" type="primary" :icon="Plus" @click="openCreate">新建工艺路线</el-button>
      </template>

      <template #col-process="{ row }">
        <span v-if="row.process" class="flow-chain">
          <template v-for="(seg, i) in row.process.split('->')" :key="i">
            <el-tag size="small" disable-transitions>{{ seg }}</el-tag>
            <el-icon v-if="i < row.process.split('->').length - 1" class="flow-chain__arrow"><Right /></el-icon>
          </template>
        </span>
        <el-tag v-else size="small" type="info">未编排</el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpFlow)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpFlow)">删除</el-button>
      </template>
    </DataTable>

    <FlowProcessEditor
      v-model="dialogVisible"
      :model="editingModel"
      :loading="submitLoading"
      @submit="handleFormSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Right } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import FlowProcessEditor from './FlowProcessEditor.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { flowPage, flowSaveProcess, flowDelete } from '@/api/technology/flow'
import type { SpFlow, SpFlowDtoReq } from '@/types/technology'

const { pager, setTotal, reset } = usePagination()

const { data: pageData, loading, run } = useRequest(
  () => flowPage({ current: pager.current, size: pager.size }),
  { immediate: true },
)

const tableData = computed<SpFlow[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'flow', label: '流程代码', width: 140 },
  { prop: 'flowDesc', label: '流程描述', width: 160 },
  { prop: 'process', label: '工序链', minWidth: 320 },
  { prop: 'createTime', label: '创建时间', minWidth: 160 },
]

const dialogVisible = ref(false)
const editingModel = ref<SpFlow | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpFlow) {
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

async function handleFormSubmit(dto: SpFlowDtoReq) {
  submitLoading.value = true
  try {
    await flowSaveProcess(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpFlow) {
  try {
    await ElMessageBox.confirm(`确认删除工艺路线「${row.flow}」?将同时删除其工序编排。`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await flowDelete(row.id)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>

<style scoped>
.flow-chain { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.flow-chain__arrow { color: var(--el-text-color-secondary); }
</style>
```

- [ ] **Step 3: 类型检查通过**

Run（`mes/vue3/`）：`pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/technology/flow/
git commit -m "✨ feat(vue3): 工艺路线页(列表 工序链渲染 + 有序穿梭框编辑弹窗 回填/级联删确认)"
```

---

## Task 6: 接线（菜单种子 + urlMap + router）

**Files:**
- Create: `scripts/sql/oper-menu-seed.sql`
- Modify: `mes/vue3/src/utils/urlMap.ts`
- Modify: `mes/vue3/src/router/index.ts`

- [ ] **Step 1: 写菜单种子 `scripts/sql/oper-menu-seed.sql`**

> 列序：`id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username`，镜像既有菜单 152。幂等：先删同 id 再插。

```sql
-- 子周期 1c-1:工序定义菜单(挂在「工艺管理」15 下,与 151 工艺路线管理同级)
-- 幂等执行:删除同 id 再插入
DELETE FROM `sp_sys_menu` WHERE `id` = '153';
INSERT INTO `sp_sys_menu`
  (`id`, `code`, `name`, `url`, `parent_id`, `grade`, `sort_num`, `type`, `permission`, `icon`, `descr`, `create_time`, `create_username`, `update_time`, `update_username`)
VALUES
  ('153', 'operDefine', '工序定义', '/basedata/sp-oper/list-ui', '15', '3', 3, '0', 'oper:add', 'set-up', '', NOW(), 'admin', NOW(), 'admin');
```

- [ ] **Step 2: 改 `urlMap.ts` 加 2 条映射**

在 `URL_MAP` 对象内 `'/basedata/materile/list-ui': '/basedata/materile',` 之后追加：

```ts
  '/basedata/flow/process/list-ui': '/technology/flow',
  '/basedata/sp-oper/list-ui': '/technology/oper',
```

- [ ] **Step 3: 改 `router/index.ts` 注册 2 路由**

在 `basedata/materile` 路由对象之后、`children` 数组闭合 `]` 之前追加：

```ts
      {
        path: 'technology/oper',
        name: 'technology-oper',
        component: () => import('@/views/technology/oper/OperList.vue'),
        meta: { title: '工序定义', perm: 'oper:add' },
      },
      {
        path: 'technology/flow',
        name: 'technology-flow',
        component: () => import('@/views/technology/flow/FlowList.vue'),
        meta: { title: '工艺路线管理', perm: 'flow:add' },
      },
```

- [ ] **Step 4: 全门禁通过**

Run（`mes/vue3/`）：`pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: typecheck 0 错 / test 全绿 / lint 0 error / build 成功（technology 路由懒加载独立 chunk）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add scripts/sql/oper-menu-seed.sql mes/vue3/src/utils/urlMap.ts mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 工艺路线/工序路由接入(urlMap 映射 + router + 工序定义菜单种子)"
```

---

## Task 7: 后端审查与最小修正

> 依 [[backend-deepseek-review-each-cycle]]，仅修两处暴露的正确性问题，配 Mockito 守卫单测。后端构建：`mes/` 下 `JAVA_HOME=$(/usr/libexec/java_home -v 11)` 后 `mvn`（[[backend-build-mvnw-broken]]）。

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/technology/controller/SpFlowOperRelationController.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/technology/service/impl/SpFlowOperRelationServiceImpl.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/technology/service/ISpFlowOperRelationService.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/technology/controller/SpOperController.java`
- Test: `mes/src/test/java/com/wangziyang/mes/technology/Cycle1c1BackendTest.java`（新建）

### 7A 工艺路线删除事务化

现状：`SpFlowOperRelationController.deleteByTableNameId` 顺序执行 `iSpFlowService.removeById` + `iSpFlowOperRelationService.remove`，**无 `@Transactional`**，中途失败留半截（删了头表、关系残留 / 反之）。

- [ ] **Step 1: 在 `ISpFlowOperRelationService` 接口加方法声明**

```java
    /** 删除工艺路线头表 + 级联删其工序关系(同一事务) */
    void deleteFlowWithRelations(String flowId);
```

- [ ] **Step 2: 在 `SpFlowOperRelationServiceImpl` 实现(同事务)**

类已注入 `iSpFlowService` 与 `spFlowOperRelationMapper`。新增方法：

```java
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteFlowWithRelations(String flowId) {
        iSpFlowService.removeById(flowId);
        spFlowOperRelationMapper.deleteOperRelationByFlowId(flowId);
    }
```

- [ ] **Step 3: 控制器 `deleteByTableNameId` 委托新方法**

```java
    @PostMapping("/delete")
    @ResponseBody
    public Result deleteByTableNameId(SpFlowDto req) throws Exception {
        iSpFlowOperRelationService.deleteFlowWithRelations(req.getId());
        return Result.success();
    }
```

### 7B 工序删除引用守卫

现状：`SpOperController.delete` 直接 `removeById`，删一个被工艺路线引用的工序 → `sp_flow_oper_relation` 出现孤儿/路线断链。加守卫：被引用则拒删。

- [ ] **Step 4: 改 `SpOperController.delete` 加引用校验**

类已注入 `iSpFlowOperRelationService`（若未注入则补 `@Autowired private ISpFlowOperRelationService iSpFlowOperRelationService;` 及 import）。`SpFlowOperRelation` 是 MyBatis-Plus 实体，用 `QueryWrapper` 计数即可（无需改 mapper）：

```java
    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        // 守卫:被任一工艺路线引用(当前/前道/后道)则拒删,避免孤儿关系/断链
        QueryWrapper<SpFlowOperRelation> qw = new QueryWrapper<>();
        qw.eq("oper_id", id).or().eq("per_oper_id", id).or().eq("next_oper_id", id);
        if (iSpFlowOperRelationService.count(qw) > 0) {
            return Result.failure("该工序已被工艺路线引用,不能删除");
        }
        iSpOperService.removeById(id);
        return Result.success(null);
    }
```

补 import：`com.baomidou.mybatisplus.core.conditions.query.QueryWrapper`、`com.wangziyang.mes.technology.entity.SpFlowOperRelation`、`com.wangziyang.mes.technology.service.ISpFlowOperRelationService`。

- [ ] **Step 5: 写 Mockito 守卫单测 `Cycle1c1BackendTest.java`**

```java
package com.wangziyang.mes.technology;

import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.controller.SpOperController;
import com.wangziyang.mes.technology.service.ISpFlowOperRelationService;
import com.wangziyang.mes.technology.service.ISpOperService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Cycle1c1BackendTest {

    @Mock ISpOperService iSpOperService;
    @Mock ISpFlowOperRelationService iSpFlowOperRelationService;
    @InjectMocks SpOperController operController;

    private Map<String, String> idParam(String id) {
        Map<String, String> m = new HashMap<>();
        m.put("id", id);
        return m;
    }

    @Test
    void delete_rejectsWhenReferenced() {
        when(iSpFlowOperRelationService.count(any())).thenReturn(1L);
        Result r = operController.delete(idParam("o1"));
        assertNotEquals(0, r.getCode());            // 失败码
        verify(iSpOperService, never()).removeById(anyString());
    }

    @Test
    void delete_succeedsWhenNotReferenced() {
        when(iSpFlowOperRelationService.count(any())).thenReturn(0L);
        when(iSpOperService.removeById(anyString())).thenReturn(true);
        Result r = operController.delete(idParam("o1"));
        assertEquals(0, r.getCode());               // 成功码
        verify(iSpOperService, times(1)).removeById("o1");
    }
}
```

> 注：`Result` 的成功/失败码与 getter 以本仓 `com.wangziyang.mes.common.Result` 实际为准（成功 `code==0`）。若 `count` 返回类型为 `int` 而非 `long`，相应改 `thenReturn(1)`。`SpProcessUnit`/字段名以实体为准。实现期先读 `Result.java` 与 controller 注入字段确认签名再落笔。

- [ ] **Step 6: 编译 + 跑单测**

Run（`mes/`）：
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
mvn -q compile
mvn -q test -Dtest=Cycle1c1BackendTest
```
Expected: `mvn compile` BUILD SUCCESS；单测 2 例全绿。

- [ ] **Step 7: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/src/main/java/com/wangziyang/mes/technology/ mes/src/test/java/com/wangziyang/mes/technology/Cycle1c1BackendTest.java
git commit -m "🐛 fix(backend): 工艺路线删除事务化 + 工序删除引用守卫(防孤儿关系)+ Mockito 守卫单测"
```

---

## Task 8: 收尾（路线图 + 记忆 + 终审门禁）

**Files:**
- Modify: `mes/vue3/docs/ROADMAP.md`

- [ ] **Step 1: 更新 ROADMAP**

将 §9.3 工艺表中「工艺路线（流程+工序+关系，穿梭）」状态由 `☐` 改为 `✅`，周期标 `C1·1c-1`；在 §11 进度快照追加一条「✅ 子周期 1c-1 工艺路线完成（2026-06-20，分支 `feature/technology-flow`）」，记交付物、`oper-menu-seed.sql` 需手动跑、后端两处修正、门禁结果；「下一步」改为「合并 1c-1 → develop；启动 1c-2 产品 BOM」。

- [ ] **Step 2: 前端全门禁 + 后端编译 复核**

Run（`mes/vue3/`）：`pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Run（`mes/`，若 Task 7 有改动）：`JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q compile`
Expected: 全绿 / BUILD SUCCESS。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/docs/ROADMAP.md
git commit -m "📝 docs(vue3): 路线图更新 — 子周期 1c-1 工艺路线完成"
```

- [ ] **Step 4: 更新记忆**

更新 `vue3-homework-frontend.md` 记录 1c-1 完成（交付/坑/约定:工序删除引用守卫、删除事务化、OrderedTransfer 原语、`oper-menu-seed.sql` 菜单 153 需手动跑、无软删物理删、SpOperVo title=operCode）。同步 `MEMORY.md` 行（若需要）。

- [ ] **Step 5: 人工冒烟提示**

向用户报告：合并前需人工 :4200 浏览器冒烟（前置：后端 9090 + 已跑 `scripts/sql/oper-menu-seed.sql`）：登录 → 工艺管理 → 工序定义 CRUD（含周期>工时校验、自动编码、被引用拒删）→ 工艺路线 新建（穿梭框选≥2 工序、上下移、链预览、保存）→ 编辑回填 → 删除级联。确认后再 `--no-ff` 合 `develop`。

---

## Self-Review 结论

- **Spec 覆盖**：§1 范围→Task4/5；§2 契约→Task1；§3 菜单/路由→Task6;§5 OrderedTransfer→Task3；§6 纯函数 TDD→Task2；§8 后端审查→Task7;§10 门禁→Task6/8。无遗漏。
- **类型一致性**：`TransferItem`/`SpOperVo`/`SpFlowDtoReq` 全程同名;`toSpOperVoList` title=secondary(operCode);`buildFlowPayload`/`validateFlow` 签名跨 Task2/5 一致;`operToTransferItem` 跨 Task2/5 一致。
- **无占位符**：所有步骤含可执行代码/命令与预期输出。后端 Task7 因需对照实体/Result 实际签名,已显式标注「实现期先读确认」的两处(Result 码、count 返回类型),非占位而是必要的运行期校验提醒。
- **范围聚焦**：仅工艺路线线(1c-1),产品 BOM/绑定/工序内容均不在内。
