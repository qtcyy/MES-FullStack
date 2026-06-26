# 子周期 1c-2 产品 BOM 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Vue3 重建产品 BOM 模块(树/物料行/锁定/版本派生),对接后端已存在的 `/technology/product-bom/*` 端点,UI 全新。

**Architecture:** 单页双态(浏览态列表/树 ↔ 编辑态主从布局)。前端纯函数承载映射/校验逻辑(TDD),Vue SFC 用 `el-form` + reactive(无 React RHF 的 DOM clobbering 坑)。后端先审查 + 最小修正 DeepSeek 生成的 Service/Controller。

**Tech Stack:** Vue3 `<script setup>` + TS + Element Plus + Pinia;复用既有 `DataTable`/`TreeTable`/`MasterDetailLayout`/`FormDialog`/`PageContainer`/`SearchForm` + `useRequest`/`usePagination`;测试 vitest(node 环境,仅 `tests/**/*.spec.ts`);后端 Spring Boot + MyBatis-Plus 3.1.2 + JUnit4 Mockito。

**约定速查:**
- 后端编码:`/page` form;`/tree`、`/tree/{id}`、`/items/{bomId}`、`/products` 走 GET;其余写端点走 JSON(`http.post(url, data, true)`)。
- 菜单 seed 在**仓库根** `scripts/sql/`(非 `mes/vue3/`)。后端表 `sp_product_bom`/`sp_product_bom_item` 见 `scripts/sql/product-bom.sql`(已存在)。
- 前端门禁:`cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`。
- 后端门禁:`cd mes && <JDK11 系统 mvn> compile` + `mvn test`(`./mvnw` 已坏,见 backend-build-mvnw-broken)。
- 分支:`feature/product-bom`(已从 develop 切)。每个 Task 结束 commit(emoji conventional,中文)。

---

## Task 1: 后端审查 + 最小修正(SpProductBom)

DeepSeek 生成的后端常有 bug,逐条核对并只修实测确认的真问题。

**Files:**
- Review: `mes/src/main/java/com/wangziyang/mes/technology/controller/SpProductBomController.java`
- Review/Modify: `mes/src/main/java/com/wangziyang/mes/technology/service/impl/SpProductBomServiceImpl.java`
- Review: `mes/src/main/java/com/wangziyang/mes/technology/entity/SpProductBom.java`、`SpProductBomItem.java`
- Test(若有修正): `mes/src/test/java/com/wangziyang/mes/technology/SpProductBomServiceImplTest.java`(新建或扩展)

- [ ] **Step 1: 通读上述文件,逐条核对审查清单**

核对以下 6 项,记录每项「现状 + 是否真 bug」:
1. **产品类型校验 ⚠️(最高优先)**:`/products` 端点与根节点创建校验是否硬编码中文 `"产品"`。1b 物料字典 `material_type` 的 value 是 `FG`(成品)/`PG`(半成品),name 才是中文。若后端用 `materialType == "产品"` 之类比较 → `/products` 拉不到任何物料、根节点创建被拒。**确认数据库 `sp_materile.mat_type` 实际存的值**(`SELECT DISTINCT mat_type FROM sp_materile;`),并使校验/过滤与真实值一致(放宽或按 FG/PG 匹配)。
2. **lock 递归**:`lockBom` 是否把根 + **全部子孙**节点 status 置 locked,并写 `lockedAt`/`lockedBy`(取当前 Shiro 用户 `getCurrentUsername()`,非硬编码)。
3. **new-version**:版本号解析(V1.0→V2.0)是否健壮;深拷贝是否**完整复制节点 + 行项目**、生成新 UUID、`parentId` 重映射到新生成的父节点 id(而非旧 id)、新树 status=draft、新 bomCode。
4. **级联删除**:`cascadeDelete`/`delete` 是否标 `@Transactional`,顺序为先删行项目→递归删子节点→删自身。
5. **子节点继承**:新增子节点是否复制父 productCode/version、level=parent.level+1,且 parent locked 时拒绝。
6. **BOM 编码生成**:`PBOM-%03d` 格式 + 取最大序号 +1(并发竞态记 backlog,不在本周期修)。

- [ ] **Step 2: 修正确认的真 bug**

对每个确认的 bug 做最小修正。**重点修第 1 项**(产品类型)。锁定/版本/级联若发现事务缺失、parentId 重映射错、审计字段未填等真问题一并修。仅改必要处,不重构。

- [ ] **Step 3: 为每处修正补 Mockito 守卫单测**

JUnit4 范式(见 1c-1 后端坑):`@RunWith(MockitoJUnitRunner.class)`,`@InjectMocks` 须 mock 全部注入字段,`Result extends HashMap` 用 `result.get("code")` 断言(成功 0/失败 1),MyBatis-Plus 3.1.2 `count()` 返回 `int`。每个修正点 1-2 例守卫测(如「locked 节点拒绝加子节点返回 code=1」「new-version 对非 locked 返回 code=1」)。若本 Task 未改任何后端代码,跳过此步。

- [ ] **Step 4: 编译 + 跑测**

Run: `cd mes && <JDK11 mvn> compile`
Expected: BUILD SUCCESS

Run: `cd mes && <JDK11 mvn> test -Dtest=SpProductBomServiceImplTest`(若新建了测试)
Expected: Tests run: N, Failures: 0

- [ ] **Step 5: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/technology mes/src/test/java/com/wangziyang/mes/technology
git commit -m "🐛 fix(backend): 产品BOM 后端审查修正(产品类型校验/锁定递归/版本深拷贝/级联事务)+ Mockito 守卫单测"
```

> 若审查结论为「无真 bug」,则 Step 2-3 跳过,Step 5 改为空提交说明或并入文档。把审查结论(每条现状)写进本 Task 的执行记录回传。

---

## Task 2: 类型定义(types/technology.ts 追加)

**Files:**
- Modify: `mes/vue3/src/types/technology.ts`(文件末尾追加)

- [ ] **Step 1: 追加产品 BOM 类型**

在 `mes/vue3/src/types/technology.ts` 末尾追加:

```ts
/** 产品 BOM 节点(对应 sp_product_bom) */
export interface SpProductBom {
  id: string
  bomCode?: string                  // PBOM-XXX(后端生成)
  productCode?: string              // 产品物料编码(仅根节点必填)
  nodeName: string                  // 节点名称(必填)
  parentId?: string                 // 父节点 id(空=根)
  level?: number                    // 层级 0 产品 /1 半成品 /2 组件
  version?: string                  // 版本号(默认 V1.0)
  status?: 'draft' | 'locked'       // 草稿 / 已锁定
  remark?: string
  sortOrder?: number
  lockedAt?: string
  lockedBy?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** /tree 返回的树形节点(含 children + itemCount,无 parentId/审计) */
export interface BomTreeNode {
  id: string
  bomCode?: string
  nodeName: string
  productCode?: string
  level?: number
  version?: string
  status?: 'draft' | 'locked'
  remark?: string
  sortOrder?: number
  itemCount?: number
  children?: BomTreeNode[]
}

/** 产品 BOM 行项目(对应 sp_product_bom_item) */
export interface SpProductBomItem {
  id?: string
  bomId: string
  itemType?: 'material' | 'bom_ref'
  materialCode: string
  materialDesc?: string
  quantity: number
  unit?: string
  sortOrder?: number
}

/** 产品 BOM 分页请求 */
export interface ProductBomPageReq extends PageReq {
  productCodeLike?: string
  nodeNameLike?: string
}
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误(`PageReq` 已在文件顶部 import)

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/types/technology.ts
git commit -m "✨ feat(vue3): 产品BOM 类型定义(SpProductBom/BomTreeNode/SpProductBomItem/分页请求)"
```

---

## Task 3: API 层(api/technology/productBom.ts 新建)

**Files:**
- Create: `mes/vue3/src/api/technology/productBom.ts`

- [ ] **Step 1: 新建 API 封装**

写 `mes/vue3/src/api/technology/productBom.ts`:

```ts
import { http } from '@/api/request'
import type {
  SpProductBom,
  BomTreeNode,
  SpProductBomItem,
  ProductBomPageReq,
  IPage,
} from '@/types/technology'
import type { SpMaterile } from '@/types/basedata'

/** 根节点分页(form 编码) */
export const productBomPage = (req: ProductBomPageReq) =>
  http.post<IPage<SpProductBom>>('/technology/product-bom/page', req)

/** 全量 BOM 森林(GET) */
export const productBomTree = () =>
  http.get<BomTreeNode[]>('/technology/product-bom/tree')

/** 新增/更新节点(JSON),返回节点 id */
export const productBomSave = (dto: Partial<SpProductBom>) =>
  http.post<string>('/technology/product-bom/add-or-update', dto, true)

/** 级联删除节点(JSON) */
export const productBomDelete = (id: string) =>
  http.post<void>('/technology/product-bom/delete', { id }, true)

/** 锁定整树(JSON) */
export const productBomLock = (id: string) =>
  http.post<void>('/technology/product-bom/lock', { id }, true)

/** 派生新版本(JSON),返回新根 id */
export const productBomNewVersion = (id: string) =>
  http.post<string>('/technology/product-bom/new-version', { id }, true)

/** 取节点行项目(GET) */
export const productBomItems = (bomId: string) =>
  http.get<SpProductBomItem[]>(`/technology/product-bom/items/${bomId}`)

/** 新增/更新行项目(JSON),返回 item id */
export const productBomItemSave = (dto: Partial<SpProductBomItem>) =>
  http.post<string>('/technology/product-bom/item/add-or-update', dto, true)

/** 删除行项目(JSON) */
export const productBomItemDelete = (id: string) =>
  http.post<void>('/technology/product-bom/item/delete', { id }, true)

/** 产品类型物料下拉(GET,根节点选产品) */
export const productBomProducts = () =>
  http.get<SpMaterile[]>('/technology/product-bom/products')
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/api/technology/productBom.ts
git commit -m "✨ feat(vue3): 产品BOM API 封装(11 端点,form/JSON/GET 编码分流)"
```

---

## Task 4: 纯函数 utils + TDD(utils/productBom.ts + tests/productBom.spec.ts)

**Files:**
- Create: `mes/vue3/src/utils/productBom.ts`
- Test: `mes/vue3/tests/productBom.spec.ts`

- [ ] **Step 1: 先写失败测试**

写 `mes/vue3/tests/productBom.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  findBomNode,
  pickBomSubtree,
  canWriteBom,
  buildBomNodePayload,
  validateBomNode,
  buildBomItemPayload,
  validateBomItem,
  materielToItem,
} from '@/utils/productBom'
import type { BomTreeNode } from '@/types/technology'

const forest: BomTreeNode[] = [
  {
    id: 'r1', nodeName: '产品A', level: 0, status: 'draft', version: 'V1.0',
    children: [
      { id: 'c1', nodeName: '半成品B', level: 1, status: 'draft', children: [
        { id: 'g1', nodeName: '组件C', level: 2, status: 'draft', children: [] },
      ] },
    ],
  },
  { id: 'r2', nodeName: '产品X', level: 0, status: 'locked', version: 'V2.0', children: [] },
]

describe('findBomNode', () => {
  it('在树内深搜命中孙节点', () => {
    expect(findBomNode(forest[0], 'g1')?.nodeName).toBe('组件C')
  })
  it('未命中返回 undefined', () => {
    expect(findBomNode(forest[0], 'nope')).toBeUndefined()
  })
})

describe('pickBomSubtree', () => {
  it('从森林按根 id 取子树', () => {
    expect(pickBomSubtree(forest, 'r2')?.nodeName).toBe('产品X')
  })
  it('可取到非根 id 的子树', () => {
    expect(pickBomSubtree(forest, 'c1')?.nodeName).toBe('半成品B')
  })
  it('未命中返回 undefined', () => {
    expect(pickBomSubtree(forest, 'zzz')).toBeUndefined()
  })
})

describe('canWriteBom', () => {
  it('draft 可写', () => expect(canWriteBom('draft')).toBe(true))
  it('locked 只读', () => expect(canWriteBom('locked')).toBe(false))
  it('undefined 视为可写', () => expect(canWriteBom(undefined)).toBe(true))
})

describe('buildBomNodePayload', () => {
  it('create-root:带 productCode,剥空串,sortOrder 数值化', () => {
    const p = buildBomNodePayload(
      { productCode: 'FG-001', nodeName: '产品A', remark: '', sortOrder: '2' as unknown as number },
      { mode: 'create-root' },
    )
    expect(p).toEqual({ productCode: 'FG-001', nodeName: '产品A', sortOrder: 2 })
  })
  it('add-child:带 parentId,不带 productCode', () => {
    const p = buildBomNodePayload(
      { nodeName: '半成品B' }, { mode: 'add-child', parentId: 'r1' },
    )
    expect(p).toEqual({ nodeName: '半成品B', parentId: 'r1' })
  })
  it('edit:带 id', () => {
    const p = buildBomNodePayload(
      { id: 'c1', nodeName: '半成品B2' }, { mode: 'edit' },
    )
    expect(p).toEqual({ id: 'c1', nodeName: '半成品B2' })
  })
})

describe('validateBomNode', () => {
  it('nodeName 必填', () => {
    expect(validateBomNode({ nodeName: '' }, 'add-child')).toBe('请输入节点名称')
  })
  it('create-root 需要 productCode', () => {
    expect(validateBomNode({ nodeName: '产品A' }, 'create-root')).toBe('请选择产品物料')
  })
  it('create-root 齐全通过', () => {
    expect(validateBomNode({ nodeName: '产品A', productCode: 'FG-001' }, 'create-root')).toBeNull()
  })
  it('add-child 有 nodeName 即通过', () => {
    expect(validateBomNode({ nodeName: '半成品B' }, 'add-child')).toBeNull()
  })
})

describe('buildBomItemPayload', () => {
  it('quantity 数值化,unit/itemType 兜底,带 bomId', () => {
    const p = buildBomItemPayload({
      bomId: 'c1', materialCode: 'M-1', materialDesc: '螺丝',
      quantity: '3' as unknown as number, unit: '', sortOrder: undefined,
    })
    expect(p).toEqual({
      bomId: 'c1', itemType: 'material', materialCode: 'M-1',
      materialDesc: '螺丝', quantity: 3, unit: '个',
    })
  })
  it('编辑保留 id 与已填 unit/itemType', () => {
    const p = buildBomItemPayload({
      id: 'i1', bomId: 'c1', itemType: 'bom_ref', materialCode: 'M-2',
      quantity: 2, unit: '箱',
    })
    expect(p.id).toBe('i1')
    expect(p.unit).toBe('箱')
    expect(p.itemType).toBe('bom_ref')
  })
})

describe('validateBomItem', () => {
  it('materialCode 必填', () => {
    expect(validateBomItem({ materialCode: '', quantity: 1 })).toBe('请选择物料')
  })
  it('quantity 须 ≥ 0.01', () => {
    expect(validateBomItem({ materialCode: 'M-1', quantity: 0 })).toBe('用量必须大于 0')
  })
  it('齐全通过', () => {
    expect(validateBomItem({ materialCode: 'M-1', quantity: 1.5 })).toBeNull()
  })
})

describe('materielToItem', () => {
  it('物料映射为行项目字段,unit 兜底', () => {
    expect(materielToItem({ id: 'x', materiel: 'M-1', materielDesc: '螺丝' })).toEqual({
      materialCode: 'M-1', materialDesc: '螺丝', unit: '个',
    })
  })
  it('保留物料单位', () => {
    expect(materielToItem({ id: 'x', materiel: 'M-2', materielDesc: '箱', unit: '箱' }).unit).toBe('箱')
  })
})
```

- [ ] **Step 2: 跑测确认失败**

Run: `cd mes/vue3 && pnpm test productBom`
Expected: FAIL(`@/utils/productBom` 模块不存在)

- [ ] **Step 3: 写实现**

写 `mes/vue3/src/utils/productBom.ts`:

```ts
import type { BomTreeNode, SpProductBom, SpProductBomItem } from '@/types/technology'
import type { SpMaterile } from '@/types/basedata'

export type NodeMode = 'create-root' | 'add-child' | 'edit'

/** 在单棵树内深搜指定 id 节点 */
export function findBomNode(root: BomTreeNode, id: string): BomTreeNode | undefined {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const hit = findBomNode(child, id)
    if (hit) return hit
  }
  return undefined
}

/** 从森林按 id 取子树(根或任意层) */
export function pickBomSubtree(forest: BomTreeNode[], id: string): BomTreeNode | undefined {
  for (const root of forest) {
    const hit = findBomNode(root, id)
    if (hit) return hit
  }
  return undefined
}

/** 锁定后只读:status !== 'locked' 可写 */
export function canWriteBom(status?: string): boolean {
  return status !== 'locked'
}

/** 组装节点 add-or-update 提交体:剥空串、sortOrder 数值化、按 mode 带 parentId/id */
export function buildBomNodePayload(
  form: Partial<SpProductBom>,
  ctx: { mode: NodeMode; parentId?: string },
): Partial<SpProductBom> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === '') continue
    out[k] = v
  }
  if (out.sortOrder !== undefined) out.sortOrder = Number(out.sortOrder)
  if (ctx.mode === 'add-child' && ctx.parentId) out.parentId = ctx.parentId
  // create-root 不带 parentId;edit 由 form.id 提供 id;均不主动塞 level/version(后端推导)
  return out as Partial<SpProductBom>
}

/** 校验节点表单 */
export function validateBomNode(form: Partial<SpProductBom>, mode: NodeMode): string | null {
  if (!form.nodeName || !form.nodeName.trim()) return '请输入节点名称'
  if (mode === 'create-root' && (!form.productCode || !form.productCode.trim())) {
    return '请选择产品物料'
  }
  return null
}

/** 组装行项目 add-or-update 提交体:quantity 数值化、unit/itemType 兜底 */
export function buildBomItemPayload(form: Partial<SpProductBomItem>): Partial<SpProductBomItem> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === '') continue
    out[k] = v
  }
  out.itemType = (out.itemType as string) || 'material'
  out.unit = (out.unit as string) || '个'
  if (out.quantity !== undefined) out.quantity = Number(out.quantity)
  if (out.sortOrder !== undefined) out.sortOrder = Number(out.sortOrder)
  return out as Partial<SpProductBomItem>
}

/** 校验行项目表单 */
export function validateBomItem(form: Partial<SpProductBomItem>): string | null {
  if (!form.materialCode || !form.materialCode.trim()) return '请选择物料'
  const q = Number(form.quantity)
  if (!Number.isFinite(q) || q < 0.01) return '用量必须大于 0'
  return null
}

/** 物料 → 行项目字段(materiel→materialCode,unit 兜底 '个') */
export function materielToItem(
  m: SpMaterile,
): Pick<SpProductBomItem, 'materialCode' | 'materialDesc' | 'unit'> {
  return {
    materialCode: m.materiel ?? '',
    materialDesc: m.materielDesc,
    unit: m.unit ?? '个',
  }
}
```

- [ ] **Step 4: 跑测确认通过**

Run: `cd mes/vue3 && pnpm test productBom`
Expected: PASS(全部 describe 绿)

- [ ] **Step 5: Commit**

```bash
git add mes/vue3/src/utils/productBom.ts mes/vue3/tests/productBom.spec.ts
git commit -m "✅ test(vue3): 产品BOM 纯函数(子树取/校验/payload/物料映射)TDD"
```

---

## Task 5: 物料行弹窗 BomItemForm.vue

**Files:**
- Create: `mes/vue3/src/views/technology/product-bom/BomItemForm.vue`

- [ ] **Step 1: 写组件**

写 `mes/vue3/src/views/technology/product-bom/BomItemForm.vue`:

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑物料行' : '新增物料行'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" label-width="92px">
      <el-form-item label="物料" prop="materialCode">
        <el-select
          v-model="form.materialCode"
          filterable
          placeholder="请选择物料"
          style="width: 100%"
          @change="handlePickMaterial"
        >
          <el-option
            v-for="m in (materials ?? [])"
            :key="m.id"
            :label="`${m.materiel ?? ''} ${m.materielDesc}`"
            :value="m.materiel ?? ''"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="物料描述">
        <el-input v-model="form.materialDesc" placeholder="选择物料后自动带出" />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="用量" prop="quantity">
            <el-input-number v-model="form.quantity" :min="0.01" :precision="2" :step="1" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="单位">
            <el-input v-model="form.unit" placeholder="个" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="排序">
        <el-input-number v-model="form.sortOrder" :min="0" :precision="0" controls-position="right" style="width: 100%" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { materilePage } from '@/api/basedata/materile'
import { buildBomItemPayload, validateBomItem, materielToItem } from '@/utils/productBom'
import type { SpProductBomItem } from '@/types/technology'
import type { SpMaterile } from '@/types/basedata'

const props = defineProps<{
  modelValue: boolean
  /** 所属节点 id */
  bomId: string
  /** null=新增;有 id=编辑 */
  model: Partial<SpProductBomItem> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpProductBomItem>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

// 全量物料下拉(组件行可选任意物料)
const { data: materialsPage } = useRequest(
  () => materilePage({ current: 1, size: 9999 }),
  { immediate: true },
)
const materials = computed<SpMaterile[]>(() => materialsPage.value?.records ?? [])

const form = reactive<Partial<SpProductBomItem>>({
  id: undefined,
  itemType: 'material',
  materialCode: '',
  materialDesc: '',
  quantity: 1,
  unit: '个',
  sortOrder: 0,
})

function resetForm() {
  form.id = undefined
  form.itemType = 'material'
  form.materialCode = ''
  form.materialDesc = ''
  form.quantity = 1
  form.unit = '个'
  form.sortOrder = 0
}

watch(
  () => props.model,
  (val) => {
    if (val) Object.assign(form, { itemType: 'material', quantity: 1, unit: '个', sortOrder: 0, ...val })
    else resetForm()
  },
  { immediate: true },
)

/** 选物料 → 自动带出描述/单位 */
function handlePickMaterial(code: string) {
  const m = materials.value.find((x) => x.materiel === code)
  if (m) {
    const mapped = materielToItem(m)
    form.materialDesc = mapped.materialDesc
    form.unit = mapped.unit
  }
}

function handleSubmit() {
  const err = validateBomItem({ ...form })
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildBomItemPayload({ ...form, bomId: props.bomId }))
}
</script>
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/technology/product-bom/BomItemForm.vue
git commit -m "✨ feat(vue3): 产品BOM 物料行弹窗(物料下拉自动回填描述/单位 + 校验)"
```

---

## Task 6: 节点弹窗 BomNodeForm.vue(create-root / add-child / edit)

**Files:**
- Create: `mes/vue3/src/views/technology/product-bom/BomNodeForm.vue`

- [ ] **Step 1: 写组件**

写 `mes/vue3/src/views/technology/product-bom/BomNodeForm.vue`:

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="title"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" label-width="92px">
      <el-form-item v-if="mode === 'create-root'" label="产品物料" prop="productCode">
        <el-select
          v-model="form.productCode"
          filterable
          placeholder="请选择产品物料"
          style="width: 100%"
          @change="handlePickProduct"
        >
          <el-option
            v-for="p in (products ?? [])"
            :key="p.id"
            :label="`${p.materiel ?? ''} ${p.materielDesc}`"
            :value="p.materiel ?? ''"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="节点名称" prop="nodeName">
        <el-input v-model="form.nodeName" placeholder="请输入节点名称" clearable />
      </el-form-item>

      <el-form-item label="排序">
        <el-input-number v-model="form.sortOrder" :min="0" :precision="0" controls-position="right" style="width: 100%" />
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { productBomProducts } from '@/api/technology/productBom'
import { buildBomNodePayload, validateBomNode, type NodeMode } from '@/utils/productBom'
import type { SpProductBom } from '@/types/technology'
import type { SpMaterile } from '@/types/basedata'

const props = defineProps<{
  modelValue: boolean
  mode: NodeMode
  /** add-child 时的父节点 id */
  parentId?: string
  /** edit 时的现有节点(含 id) */
  model: Partial<SpProductBom> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpProductBom>]
}>()

const formRef = ref<FormInstance>()

const title = computed(() => {
  if (props.mode === 'create-root') return '新建产品 BOM'
  if (props.mode === 'add-child') return '新增子节点'
  return '编辑节点'
})

// 产品下拉仅 create-root 需要;immediate 加载,数据量小
const { data: products } = useRequest(productBomProducts, {
  immediate: true,
  initialData: [] as SpMaterile[],
})

const form = reactive<Partial<SpProductBom>>({
  id: undefined,
  productCode: undefined,
  nodeName: '',
  sortOrder: 0,
  remark: undefined,
})

function resetForm() {
  form.id = undefined
  form.productCode = undefined
  form.nodeName = ''
  form.sortOrder = 0
  form.remark = undefined
}

watch(
  () => [props.model, props.modelValue] as const,
  ([val, visible]) => {
    if (!visible) return
    if (props.mode === 'edit' && val) {
      Object.assign(form, { sortOrder: 0, ...val })
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

/** 选产品 → 默认把节点名带为产品描述(可改) */
function handlePickProduct(code: string) {
  const p = (products.value ?? []).find((x) => x.materiel === code)
  if (p && !form.nodeName) form.nodeName = p.materielDesc
}

function handleSubmit() {
  const err = validateBomNode({ ...form }, props.mode)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildBomNodePayload({ ...form }, { mode: props.mode, parentId: props.parentId }))
}
</script>
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/technology/product-bom/BomNodeForm.vue
git commit -m "✨ feat(vue3): 产品BOM 节点弹窗(create-root 产品下拉/add-child/edit 三态 + 校验)"
```

---

## Task 7: 编辑态右栏 BomNodeDetail.vue(节点信息卡 + 物料行表)

**Files:**
- Create: `mes/vue3/src/views/technology/product-bom/BomNodeDetail.vue`

- [ ] **Step 1: 写组件**

纯展示 + 事件上抛,不直接调 API(写操作由父级 ProductBomList 编排)。`canWrite` 控制写按钮禁用。

写 `mes/vue3/src/views/technology/product-bom/BomNodeDetail.vue`:

```vue
<template>
  <div class="bom-detail">
    <!-- 节点信息卡 -->
    <el-descriptions :title="node.nodeName" :column="2" border size="small">
      <el-descriptions-item label="层级">{{ levelLabel }}</el-descriptions-item>
      <el-descriptions-item label="版本">{{ node.version ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="产品编码">{{ node.productCode ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="BOM 编码">{{ node.bomCode ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ node.remark ?? '-' }}</el-descriptions-item>
    </el-descriptions>

    <div class="bom-detail__ops">
      <el-button :disabled="!canWrite" type="primary" :icon="Plus" size="small" @click="emit('add-child')">加子节点</el-button>
      <el-button :disabled="!canWrite" :icon="Edit" size="small" @click="emit('edit-node')">编辑节点</el-button>
      <el-button
        v-if="!isRoot"
        :disabled="!canWrite"
        type="danger"
        :icon="Delete"
        size="small"
        @click="emit('delete-node')"
      >删除节点</el-button>
    </div>

    <!-- 物料行表 -->
    <div class="bom-detail__items-header">
      <span class="bom-detail__title">物料行</span>
      <el-button :disabled="!canWrite" type="primary" :icon="Plus" size="small" @click="emit('add-item')">新增物料</el-button>
    </div>

    <DataTable
      :data="items"
      :loading="itemsLoading"
      :columns="itemColumns"
      :pager="itemPager"
      :action-width="canWrite ? 120 : 0"
      @page-change="(p) => (itemPager.current = p)"
      @size-change="(s) => { itemPager.size = s; itemPager.current = 1 }"
    >
      <template v-if="canWrite" #actions="{ row }">
        <el-button type="primary" link size="small" @click="emit('edit-item', row as SpProductBomItem)">编辑</el-button>
        <el-button type="danger" link size="small" @click="emit('delete-item', row as SpProductBomItem)">删除</el-button>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import type { BomTreeNode, SpProductBomItem } from '@/types/technology'

const props = defineProps<{
  node: BomTreeNode
  isRoot: boolean
  canWrite: boolean
  items: SpProductBomItem[]
  itemsLoading?: boolean
}>()

const emit = defineEmits<{
  'add-child': []
  'edit-node': []
  'delete-node': []
  'add-item': []
  'edit-item': [SpProductBomItem]
  'delete-item': [SpProductBomItem]
}>()

const levelLabel = computed(() => {
  const map: Record<number, string> = { 0: '产品', 1: '半成品', 2: '组件' }
  return map[props.node.level ?? -1] ?? `L${props.node.level ?? '?'}`
})

const itemColumns: Column[] = [
  { prop: 'materialCode', label: '物料编码', width: 140 },
  { prop: 'materialDesc', label: '物料描述', minWidth: 160 },
  { prop: 'quantity', label: '用量', width: 90 },
  { prop: 'unit', label: '单位', width: 80 },
]

// 物料行客户端分页
const itemPager = reactive({ current: 1, size: 10, total: 0 })
watch(
  () => props.items,
  (list) => {
    itemPager.total = list.length
    itemPager.current = 1
  },
  { immediate: true },
)
</script>

<style scoped>
.bom-detail__ops { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin: var(--sp-3) 0; }
.bom-detail__items-header { display: flex; align-items: center; justify-content: space-between; margin: var(--sp-3) 0 var(--sp-2); }
.bom-detail__title { font-size: 15px; font-weight: 600; color: var(--el-text-color-primary); }
</style>
```

> 注:`DataTable` 客户端分页只截当前页时需父级传整页 data + pager.total。这里 `items` 为该节点全部行项目(通常很少),`itemPager` 仅维护展示;若行数超过 size,可在父级或此处对 `items` 做 slice。本周期行项目数量小,直接全量传入 DataTable(其 pager 用于显示),如需严格分页在 Task 10 收尾时按 DictList 的 `slice` 模式补。

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/technology/product-bom/BomNodeDetail.vue
git commit -m "✨ feat(vue3): 产品BOM 编辑态右栏(节点信息卡 + 物料行表 + canWrite 写禁用)"
```

---

## Task 8: 主编排 ProductBomList.vue(浏览态 + 编辑态)

**Files:**
- Create: `mes/vue3/src/views/technology/product-bom/ProductBomList.vue`

- [ ] **Step 1: 写组件**

写 `mes/vue3/src/views/technology/product-bom/ProductBomList.vue`:

```vue
<template>
  <PageContainer>
    <!-- ════════════════ 浏览态 ════════════════ -->
    <template v-if="!editingRootId">
      <div class="pb-toolbar">
        <el-radio-group v-model="view" size="small">
          <el-radio-button value="list">列表</el-radio-button>
          <el-radio-button value="tree">树视图</el-radio-button>
        </el-radio-group>
        <el-button v-permission="'product-bom:add'" type="primary" :icon="Plus" @click="openCreateRoot">新建产品 BOM</el-button>
      </div>

      <!-- 列表视图:根节点分页 -->
      <template v-if="view === 'list'">
        <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
          <el-form-item label="产品编码">
            <el-input v-model="search.productCodeLike" placeholder="产品编码" clearable />
          </el-form-item>
          <el-form-item label="节点名称">
            <el-input v-model="search.nodeNameLike" placeholder="节点名称" clearable />
          </el-form-item>
        </SearchForm>

        <DataTable
          :data="rootRows"
          :loading="listLoading"
          :columns="rootColumns"
          :pager="pager"
          @page-change="handlePageChange"
          @size-change="handleSizeChange"
        >
          <template #col-status="{ row }">
            <el-tag :type="(row as SpProductBom).status === 'locked' ? 'warning' : 'info'" size="small" disable-transitions>
              {{ (row as SpProductBom).status === 'locked' ? '已锁定' : '草稿' }}
            </el-tag>
          </template>
          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click="enterEdit((row as SpProductBom).id)">进入编辑</el-button>
            <el-button
              type="danger"
              link
              size="small"
              :disabled="(row as SpProductBom).status === 'locked'"
              @click="handleDeleteRoot(row as SpProductBom)"
            >删除</el-button>
          </template>
        </DataTable>
      </template>

      <!-- 树视图:全量森林 -->
      <template v-else>
        <TreeTable :data="treeData ?? []" :loading="treeLoading" :columns="treeColumns" :action-width="120">
          <template #col-status="{ row }">
            <el-tag :type="(row as BomTreeNode).status === 'locked' ? 'warning' : 'info'" size="small" disable-transitions>
              {{ (row as BomTreeNode).status === 'locked' ? '已锁定' : '草稿' }}
            </el-tag>
          </template>
          <template #actions="{ row }">
            <el-button v-if="(row as BomTreeNode).level === 0" type="primary" link size="small" @click="enterEdit((row as BomTreeNode).id)">进入编辑</el-button>
          </template>
        </TreeTable>
      </template>
    </template>

    <!-- ════════════════ 编辑态 ════════════════ -->
    <template v-else>
      <div class="pb-edit-header">
        <el-button :icon="Back" size="small" @click="exitEdit">返回</el-button>
        <span class="pb-edit-header__name">{{ subtree?.nodeName ?? '' }}</span>
        <el-tag :type="rootLocked ? 'warning' : 'info'" size="small" disable-transitions>
          {{ rootLocked ? '已锁定' : '草稿' }}
        </el-tag>
        <span class="pb-edit-header__version">版本 {{ subtree?.version ?? '-' }}</span>
        <div class="pb-edit-header__ops">
          <el-button v-if="!rootLocked" type="warning" :icon="Lock" size="small" @click="handleLock">锁定整树</el-button>
          <el-button v-else type="primary" :icon="CopyDocument" size="small" @click="handleNewVersion">创建新版本</el-button>
        </div>
      </div>

      <MasterDetailLayout :has-selection="!!selectedNode">
        <template #master>
          <TreeTable
            :data="subtree ? [subtree] : []"
            :loading="treeLoading"
            :columns="structColumns"
            :action-width="0"
          >
            <template #col-nodeName="{ row }">
              <span
                :class="selectedNodeId === (row as BomTreeNode).id ? 'pb-node-selected' : 'pb-node'"
                @click="selectNode((row as BomTreeNode).id)"
              >{{ (row as BomTreeNode).nodeName }}</span>
            </template>
          </TreeTable>
        </template>

        <template #detail>
          <BomNodeDetail
            v-if="selectedNode"
            :node="selectedNode"
            :is-root="selectedNodeId === editingRootId"
            :can-write="!rootLocked"
            :items="items"
            :items-loading="itemsLoading"
            @add-child="openAddChild"
            @edit-node="openEditNode"
            @delete-node="handleDeleteNode"
            @add-item="openAddItem"
            @edit-item="openEditItem"
            @delete-item="handleDeleteItem"
          />
        </template>

        <template #detail-empty>
          <el-empty description="请点击左侧结构树节点" />
        </template>
      </MasterDetailLayout>
    </template>

    <!-- 弹窗 -->
    <BomNodeForm
      v-model="nodeDialogVisible"
      :mode="nodeMode"
      :parent-id="nodeParentId"
      :model="editingNode"
      :loading="submitLoading"
      @submit="handleNodeSubmit"
    />
    <BomItemForm
      v-model="itemDialogVisible"
      :bom-id="selectedNodeId ?? ''"
      :model="editingItem"
      :loading="submitLoading"
      @submit="handleItemSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Back, Lock, CopyDocument } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import TreeTable from '@/components/TreeTable.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import BomNodeForm from './BomNodeForm.vue'
import BomItemForm from './BomItemForm.vue'
import BomNodeDetail from './BomNodeDetail.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import {
  productBomPage, productBomTree, productBomSave, productBomDelete,
  productBomLock, productBomNewVersion,
  productBomItems, productBomItemSave, productBomItemDelete,
} from '@/api/technology/productBom'
import { pickBomSubtree, findBomNode, canWriteBom, type NodeMode } from '@/utils/productBom'
import type { SpProductBom, BomTreeNode, SpProductBomItem } from '@/types/technology'

// ─── 浏览态:列表 ───────────────────────────────────────────────
const view = ref<'list' | 'tree'>('list')
const search = reactive({ productCodeLike: '', nodeNameLike: '' })
const { pager, setTotal, reset } = usePagination()

const { data: pageData, loading: listLoading, run: listRun } = useRequest(
  () => productBomPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)
const rootRows = computed<SpProductBom[]>(() => {
  const r = pageData.value
  if (r) setTotal(r.total)
  return r?.records ?? []
})

function handleSearch() { reset(); listRun() }
function handleReset() { search.productCodeLike = ''; search.nodeNameLike = ''; reset(); listRun() }
function handlePageChange(p: number) { pager.current = p; listRun() }
function handleSizeChange(s: number) { pager.size = s; reset(); listRun() }

// ─── 浏览态/编辑态共用:全量树 ─────────────────────────────────
const { data: treeData, loading: treeLoading, run: treeRun } = useRequest(
  productBomTree, { immediate: true, initialData: [] as BomTreeNode[] },
)

// ─── 编辑态 ─────────────────────────────────────────────────────
const editingRootId = ref<string | null>(null)
const selectedNodeId = ref<string | null>(null)

const subtree = computed<BomTreeNode | undefined>(() =>
  editingRootId.value ? pickBomSubtree(treeData.value ?? [], editingRootId.value) : undefined,
)
const rootLocked = computed(() => !canWriteBom(subtree.value?.status))
const selectedNode = computed<BomTreeNode | undefined>(() =>
  subtree.value && selectedNodeId.value ? findBomNode(subtree.value, selectedNodeId.value) : undefined,
)

const items = ref<SpProductBomItem[]>([])
const itemsLoading = ref(false)
async function loadItems(nodeId: string) {
  itemsLoading.value = true
  try {
    items.value = await productBomItems(nodeId)
  } catch {
    items.value = []
  } finally {
    itemsLoading.value = false
  }
}

async function enterEdit(rootId: string) {
  editingRootId.value = rootId
  selectedNodeId.value = rootId
  await treeRun()
  await loadItems(rootId)
}
function exitEdit() {
  editingRootId.value = null
  selectedNodeId.value = null
  items.value = []
  listRun()
}
function selectNode(id: string) {
  selectedNodeId.value = id
  loadItems(id)
}

// 树变化后(增删节点)重拉树并保持选中(若节点已删则回落根)
async function refreshTree() {
  await treeRun()
  if (editingRootId.value && selectedNodeId.value) {
    const still = subtree.value && findBomNode(subtree.value, selectedNodeId.value)
    if (!still) {
      selectedNodeId.value = editingRootId.value
    }
    if (selectedNodeId.value) await loadItems(selectedNodeId.value)
  }
}

// ─── 节点弹窗 ───────────────────────────────────────────────────
const nodeDialogVisible = ref(false)
const nodeMode = ref<NodeMode>('create-root')
const nodeParentId = ref<string | undefined>(undefined)
const editingNode = ref<Partial<SpProductBom> | null>(null)
const submitLoading = ref(false)

function openCreateRoot() {
  nodeMode.value = 'create-root'
  nodeParentId.value = undefined
  editingNode.value = null
  nodeDialogVisible.value = true
}
function openAddChild() {
  nodeMode.value = 'add-child'
  nodeParentId.value = selectedNodeId.value ?? undefined
  editingNode.value = null
  nodeDialogVisible.value = true
}
function openEditNode() {
  if (!selectedNode.value) return
  nodeMode.value = 'edit'
  nodeParentId.value = undefined
  editingNode.value = {
    id: selectedNode.value.id,
    nodeName: selectedNode.value.nodeName,
    remark: selectedNode.value.remark,
    sortOrder: selectedNode.value.sortOrder,
  }
  nodeDialogVisible.value = true
}

async function handleNodeSubmit(dto: Partial<SpProductBom>) {
  submitLoading.value = true
  try {
    const newId = await productBomSave(dto)
    ElMessage.success('保存成功')
    nodeDialogVisible.value = false
    if (nodeMode.value === 'create-root') {
      // 新建根:刷新列表 + 进入编辑
      await treeRun()
      await enterEdit(newId)
    } else {
      await refreshTree()
    }
  } finally {
    submitLoading.value = false
  }
}

async function handleDeleteRoot(row: SpProductBom) {
  try {
    await ElMessageBox.confirm(`确认删除产品 BOM「${row.nodeName}」?将级联删除整棵树及物料行。`, '提示', {
      type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await productBomDelete(row.id)
    ElMessage.success('删除成功')
    listRun()
    treeRun()
  } catch { /* 拦截器已提示 */ }
}

async function handleDeleteNode() {
  if (!selectedNode.value) return
  try {
    await ElMessageBox.confirm(`确认删除节点「${selectedNode.value.nodeName}」?将级联删除其子节点与物料行。`, '提示', {
      type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await productBomDelete(selectedNode.value.id)
    ElMessage.success('删除成功')
    await refreshTree()
  } catch { /* 拦截器已提示 */ }
}

// ─── 物料行弹窗 ─────────────────────────────────────────────────
const itemDialogVisible = ref(false)
const editingItem = ref<Partial<SpProductBomItem> | null>(null)

function openAddItem() {
  editingItem.value = null
  itemDialogVisible.value = true
}
function openEditItem(row: SpProductBomItem) {
  editingItem.value = { ...row }
  itemDialogVisible.value = true
}

async function handleItemSubmit(dto: Partial<SpProductBomItem>) {
  submitLoading.value = true
  try {
    await productBomItemSave(dto)
    ElMessage.success('保存成功')
    itemDialogVisible.value = false
    if (selectedNodeId.value) await loadItems(selectedNodeId.value)
    treeRun() // itemCount 变化
  } finally {
    submitLoading.value = false
  }
}

async function handleDeleteItem(row: SpProductBomItem) {
  try {
    await ElMessageBox.confirm(`确认删除物料行「${row.materialDesc ?? row.materialCode}」?`, '提示', {
      type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await productBomItemDelete(row.id!)
    ElMessage.success('删除成功')
    if (selectedNodeId.value) await loadItems(selectedNodeId.value)
    treeRun()
  } catch { /* 拦截器已提示 */ }
}

// ─── 锁定 / 新版本 ──────────────────────────────────────────────
async function handleLock() {
  if (!editingRootId.value) return
  try {
    await ElMessageBox.confirm('锁定后整棵树将变为只读,不能再增删改节点与物料行。确认锁定?', '提示', {
      type: 'warning', confirmButtonText: '确认锁定', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await productBomLock(editingRootId.value)
    ElMessage.success('已锁定')
    await refreshTree()
  } catch { /* 拦截器已提示 */ }
}

async function handleNewVersion() {
  if (!editingRootId.value) return
  try {
    await ElMessageBox.confirm('将复制当前锁定版本派生一个新草稿版本,确认?', '提示', {
      type: 'info', confirmButtonText: '创建新版本', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    const newRootId = await productBomNewVersion(editingRootId.value)
    ElMessage.success('已创建新版本')
    await treeRun()
    await enterEdit(newRootId)
  } catch { /* 拦截器已提示 */ }
}

// ─── 列定义 ─────────────────────────────────────────────────────
const rootColumns: Column[] = [
  { prop: 'productCode', label: '产品编码', width: 140 },
  { prop: 'nodeName', label: '产品名称', minWidth: 160 },
  { prop: 'version', label: '版本', width: 90 },
  { prop: 'status', label: '状态', width: 90 },
  { prop: 'createTime', label: '创建时间', minWidth: 160 },
]
const treeColumns: Column[] = [
  { prop: 'nodeName', label: '节点', minWidth: 240 },
  { prop: 'version', label: '版本', width: 90 },
  { prop: 'status', label: '状态', width: 90 },
  { prop: 'itemCount', label: '物料数', width: 90 },
]
const structColumns: Column[] = [
  { prop: 'nodeName', label: '结构', minWidth: 220 },
  { prop: 'level', label: '层级', width: 70 },
]
</script>

<style scoped>
.pb-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); margin-bottom: var(--sp-3); flex-wrap: wrap; }
.pb-edit-header { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); flex-wrap: wrap; }
.pb-edit-header__name { font-size: 15px; font-weight: 600; }
.pb-edit-header__version { color: var(--el-text-color-secondary); }
.pb-edit-header__ops { margin-left: auto; }
.pb-node { cursor: pointer; }
.pb-node-selected { cursor: pointer; color: var(--el-color-primary); font-weight: 600; }
</style>
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/technology/product-bom/ProductBomList.vue
git commit -m "✨ feat(vue3): 产品BOM 主页(浏览态列表/树切换 ↔ 编辑态主从:结构树+节点详情+锁定/新版本)"
```

---

## Task 9: 路由 + urlMap + 菜单 seed

**Files:**
- Modify: `mes/vue3/src/router/index.ts:75`(在 technology/flow 路由后追加)
- Modify: `mes/vue3/src/utils/urlMap.ts:11`(URL_MAP 末尾追加)
- Create: `scripts/sql/product-bom-menu-seed.sql`(仓库根)

- [ ] **Step 1: 注册路由**

在 `mes/vue3/src/router/index.ts` 的 `technology/flow` 路由对象后(第 75 行 `},` 之后、`],` 之前)追加:

```ts
      {
        path: 'technology/product-bom',
        name: 'technology-product-bom',
        component: () => import('@/views/technology/product-bom/ProductBomList.vue'),
        meta: { title: '产品BOM管理', perm: 'product-bom:add' },
      },
```

- [ ] **Step 2: 追加 urlMap 映射**

在 `mes/vue3/src/utils/urlMap.ts` 的 `URL_MAP` 对象末尾(`'/basedata/sp-oper/list-ui': '/technology/oper',` 之后)追加:

```ts
  '/technology/product-bom/list-ui': '/technology/product-bom',
```

- [ ] **Step 3: 写菜单 seed**

写 `scripts/sql/product-bom-menu-seed.sql`(仓库根 `scripts/sql/`,与 oper-menu-seed.sql 同目录):

```sql
-- 子周期 1c-2:产品BOM 菜单(挂在「工艺管理」15 下,与 151 工艺路线管理同级)
-- 注:152「工艺BOM管理」是旧扁平 SpBom,vue3 不实现,本菜单用新 id 154。
-- 幂等执行:删除同 id 再插入
DELETE FROM `sp_sys_menu` WHERE `id` = '154';
INSERT INTO `sp_sys_menu`
  (`id`, `code`, `name`, `url`, `parent_id`, `grade`, `sort_num`, `type`, `permission`, `icon`, `descr`, `create_time`, `create_username`, `update_time`, `update_username`)
VALUES
  ('154', 'productBom', '产品BOM管理', '/technology/product-bom/list-ui', '15', '3', 4, '0', 'product-bom:add', 'files', '', NOW(), 'admin', NOW(), 'admin');
```

- [ ] **Step 4: 类型检查 + 构建**

Run: `cd mes/vue3 && pnpm typecheck && pnpm build`
Expected: 0 错误,build 成功(product-bom 页应为独立懒加载 chunk)

- [ ] **Step 5: Commit**

```bash
git add mes/vue3/src/router/index.ts mes/vue3/src/utils/urlMap.ts scripts/sql/product-bom-menu-seed.sql
git commit -m "✨ feat(vue3): 产品BOM 路由接入(router + urlMap 映射 + 菜单种子 id=154)"
```

---

## Task 10: 全门禁 + 收尾

**Files:**
- 视情况微调上述任意文件

- [ ] **Step 1: 跑全套前端门禁**

Run: `cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: typecheck 0 错误;test 全绿(含新增 productBom 用例);lint:check 0 error(既有 warn 容忍);build 成功

- [ ] **Step 2: 修正门禁暴露的问题**

若 lint 报新 error(如未用 import、`any`)就地修。若物料行严格分页需要(行数 > size),按 DictList 的 `slice` 模式在 BomNodeDetail 内对 `items` 切片展示(Task 7 备注)。

- [ ] **Step 3: 后端编译确认(若 Task 1 改过后端)**

Run: `cd mes && <JDK11 mvn> compile`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit(若有改动)**

```bash
git add -A
git commit -m "🔧 chore(vue3): 产品BOM 门禁修正与收尾"
```

- [ ] **Step 5: 回报**

汇总:Task 1 后端审查结论(每条现状 + 修了什么)、门禁结果、需用户手动跑 `scripts/sql/product-bom-menu-seed.sql` 才能在侧栏看到菜单、人工 :4200 冒烟待确认(需后端 9090 + 已跑 product-bom.sql 建表 + 菜单 seed)。

---

## 完成后(合并)

全部 Task 通过 + opus 终审 Ready to merge 后:

```bash
git checkout develop
git merge --no-ff feature/product-bom -m "🔀 Merge: 子周期 1c-2 产品 BOM 完成 (feature/product-bom → develop)"
```

更新 `mes/vue3/docs/ROADMAP.md` 与记忆 [[vue3-homework-frontend]]:标记 1c-2 完成,下一候选 1c-3 BOM-工艺绑定。

---

## Plan 自查

- **Spec 覆盖**:范围(树 CRUD/物料行/锁定/版本)→ Task 5-8;后端审查 §7 → Task 1;编码约定 §5 → Task 3;纯函数 §6 → Task 4;路由/urlMap/菜单 §3 → Task 9;门禁 §8 → Task 10。✅ 全覆盖。
- **占位符**:无 TBD;每步含真实代码/命令。Task 1 后端修正因「先审查后定位」性质给的是清单 + 修正指引(后端真实 bug 须读码才知),已要求回报每条结论 —— 这是审查类任务的合理形态,非占位符。
- **类型一致**:`NodeMode` 在 utils 定义,Task 6/8 import 一致;`buildBomNodePayload`/`validateBomNode`/`buildBomItemPayload`/`validateBomItem`/`materielToItem`/`pickBomSubtree`/`findBomNode`/`canWriteBom` 命名在 Task 4 定义、Task 5-8 调用一致;`SpProductBom`/`BomTreeNode`/`SpProductBomItem`/`ProductBomPageReq` 在 Task 2 定义、后续引用一致;API 函数名 Task 3 定义、Task 8 调用一致。✅
