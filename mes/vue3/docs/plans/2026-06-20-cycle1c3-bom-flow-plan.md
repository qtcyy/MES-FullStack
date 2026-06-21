# 子周期 1c-3 · BOM-工艺绑定 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mes/vue3` 新增单页 `/technology/bom-flow`，给产品 BOM 树的每个节点绑定/换绑/解绑一条工艺路线并支持整树锁定，对接后端已存在的 `/technology/bom-flow/*` 端点。

**Architecture:** 单页双态（浏览选产品根 ↔ 编辑态主从：左 BOM 结构树点选 + 右节点详情/工序链预览）。纯函数沉淀到 `utils/bomFlow.ts`（TDD），API 薄封装 `api/technology/bomFlow.ts`，视图三组件 `BomFlowPage`/`BomNodeFlowDetail`/`FlowBindDialog`，复用 `MasterDetailLayout`/`TreeTable`/`DataTable`/`FormDialog`/`PageContainer`/`useRequest`。镜像 React 版 `mes-new` 功能契约，UI 不照抄。

**Tech Stack:** Vue 3.5 `<script setup>` + TS + Element Plus + Vite + Vitest；后端 Spring Boot + MyBatis-Plus（JDK11 系统 mvn）。

**关键契约前提（已实连后端核对）：**
- `sp_bom_flow` 唯一约束 `uk_bom_flow_bom(bom_id)` → 一节点最多一条路线；`bind` 端点内部 `replaceBinding`（@Transactional 先删后插）→ 绑定即换绑。
- `list/{rootId}` 返回扁平 `[{ bomNode, bomFlow?, flow?, opers?:[{relation, oper}] }]`；无绑定时仅含 `bomNode`。
- 「锁定工艺」要求 BOM 根已锁定（`lock` 端点校验 `rootBom.status === 'locked'`，否则拒绝）。
- `update-remark` 端点不接（mes-new 亦未用，备注随 `bind` 提交）。

---

## 文件结构

| 文件 | 责任 | 动作 |
|---|---|---|
| `mes/vue3/src/types/technology.ts` | 增补 `SpFlowOperRelation`/`FlowOperItem`/`SpBomFlow`/`BomFlowNodeVO`/`BomFlowTreeNode` | 修改 |
| `mes/vue3/src/utils/bomFlow.ts` | 纯函数：`buildBomNodeTree`/`canWriteBomFlow`/`buildBindPayload`/`flowOperRows` | 新建 |
| `mes/vue3/tests/bomFlow.spec.ts` | 上述纯函数单测 | 新建 |
| `mes/vue3/src/api/technology/bomFlow.ts` | 7 端点薄封装 | 新建 |
| `mes/vue3/src/views/technology/bom-flow/FlowBindDialog.vue` | 绑定/换绑弹窗（单选路线 + 备注） | 新建 |
| `mes/vue3/src/views/technology/bom-flow/BomNodeFlowDetail.vue` | 右面板：节点信息 + 已绑工艺 + 工序链预览 | 新建 |
| `mes/vue3/src/views/technology/bom-flow/BomFlowPage.vue` | 双态编排 | 新建 |
| `mes/vue3/src/utils/urlMap.ts` | 加 `/technology/bom-flow/list-ui` 映射 | 修改 |
| `mes/vue3/src/router/index.ts` | 加 1 路由 | 修改 |
| `scripts/sql/bom-flow-menu-seed.sql` | 菜单 id=155 种子 | 新建 |
| `mes/vue3/docs/ROADMAP.md` | 1c-3 完成标记 | 修改 |

---

## Task 1: 类型增补 + 纯函数（TDD）

**Files:**
- Modify: `mes/vue3/src/types/technology.ts`（在文件末尾追加）
- Create: `mes/vue3/src/utils/bomFlow.ts`
- Test: `mes/vue3/tests/bomFlow.spec.ts`

- [ ] **Step 1: 在 `types/technology.ts` 末尾追加类型**

```typescript
/** 工艺路线-工序关系(对应 sp_flow_oper_relation,本页只读预览用其中几列) */
export interface SpFlowOperRelation {
  id: string
  flowId?: string
  operId?: string
  oper?: string          // 工序编码(后端存 oper 列)
  sortNum?: number       // 执行顺序
  operType?: string      // 'firstOper' | 'lastOper' | 其它
}

/** 工序预览项(后端 list/opers 端点 opers 数组元素) */
export interface FlowOperItem {
  relation: SpFlowOperRelation
  oper?: SpOper | null   // join 出的工序详情(operDesc 等)
}

/** BOM-工艺绑定行(对应 sp_bom_flow) */
export interface SpBomFlow {
  id: string
  bomId: string
  flowId: string
  status?: 'draft' | 'locked'
  remark?: string
  sortOrder?: number
}

/** list/{rootId} 返回的扁平节点项(无绑定时仅 bomNode) */
export interface BomFlowNodeVO {
  bomNode: SpProductBom
  bomFlow?: SpBomFlow | null
  flow?: SpFlow | null
  opers?: FlowOperItem[]
}

/** 前端构建的树节点:展平 bomNode 到顶层(供 TreeTable row-key/列),挂 flow/opers/children */
export interface BomFlowTreeNode extends SpProductBom {
  bomFlow?: SpBomFlow | null
  flow?: SpFlow | null
  opers?: FlowOperItem[]
  children: BomFlowTreeNode[]
}
```

- [ ] **Step 2: 写失败测试 `tests/bomFlow.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import {
  buildBomNodeTree,
  canWriteBomFlow,
  buildBindPayload,
  flowOperRows,
} from '@/utils/bomFlow'
import type { BomFlowNodeVO, FlowOperItem } from '@/types/technology'

const flat: BomFlowNodeVO[] = [
  { bomNode: { id: 'r1', nodeName: '产品A', level: 0, status: 'draft', sortOrder: 0 } },
  {
    bomNode: { id: 'c2', nodeName: '组件B', parentId: 'r1', level: 1, status: 'draft', sortOrder: 2 },
    bomFlow: { id: 'bf2', bomId: 'c2', flowId: 'f9', status: 'draft' },
    flow: { id: 'f9', flow: 'FLOW-9', flowDesc: '装配线' },
  },
  { bomNode: { id: 'c1', nodeName: '组件A', parentId: 'r1', level: 1, status: 'draft', sortOrder: 1 } },
]

describe('buildBomNodeTree', () => {
  it('按 parentId 建树,根含两个子', () => {
    const tree = buildBomNodeTree(flat)
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('r1')
    expect(tree[0].children).toHaveLength(2)
  })
  it('同级按 sortOrder 升序(组件A 在前)', () => {
    const tree = buildBomNodeTree(flat)
    expect(tree[0].children.map((n) => n.id)).toEqual(['c1', 'c2'])
  })
  it('展平 bomNode 字段并挂 flow 到顶层', () => {
    const tree = buildBomNodeTree(flat)
    const c2 = tree[0].children.find((n) => n.id === 'c2')!
    expect(c2.nodeName).toBe('组件B')
    expect(c2.flow?.flow).toBe('FLOW-9')
  })
  it('parentId 指向不存在节点时作为根', () => {
    const orphan: BomFlowNodeVO[] = [
      { bomNode: { id: 'x', nodeName: '孤儿', parentId: 'ghost', status: 'draft' } },
    ]
    expect(buildBomNodeTree(orphan)).toHaveLength(1)
  })
})

describe('canWriteBomFlow', () => {
  it('全 draft 可写', () => {
    expect(canWriteBomFlow('draft', 'draft', 'draft')).toBe(true)
  })
  it('根锁定不可写', () => {
    expect(canWriteBomFlow('locked', 'draft', 'draft')).toBe(false)
  })
  it('绑定锁定不可写', () => {
    expect(canWriteBomFlow('draft', 'locked', 'draft')).toBe(false)
  })
  it('节点锁定不可写', () => {
    expect(canWriteBomFlow('draft', 'draft', 'locked')).toBe(false)
  })
  it('绑定状态 undefined 视为 draft 可写', () => {
    expect(canWriteBomFlow('draft', undefined, 'draft')).toBe(true)
  })
})

describe('buildBindPayload', () => {
  it('无备注只带 bomId/flowId', () => {
    expect(buildBindPayload('b1', 'f1')).toEqual({ bomId: 'b1', flowId: 'f1' })
  })
  it('带备注且 trim', () => {
    expect(buildBindPayload('b1', 'f1', '  急件 ')).toEqual({ bomId: 'b1', flowId: 'f1', remark: '急件' })
  })
  it('空白备注剥除', () => {
    expect(buildBindPayload('b1', 'f1', '   ')).toEqual({ bomId: 'b1', flowId: 'f1' })
  })
})

describe('flowOperRows', () => {
  const opers: FlowOperItem[] = [
    { relation: { id: 'r1', sortNum: 1, operType: 'firstOper', oper: 'OPR-1' }, oper: { id: 'o1', operDesc: '下料' } },
    { relation: { id: 'r2', sortNum: 2, operType: 'lastOper', oper: 'OPR-2' }, oper: { id: 'o2', operDesc: '装配' } },
  ]
  it('映射序号/描述/标记', () => {
    expect(flowOperRows(opers)).toEqual([
      { seq: 1, operDesc: '下料', mark: '首道' },
      { seq: 2, operDesc: '装配', mark: '末道' },
    ])
  })
  it('oper 缺失回落 relation.oper', () => {
    const rows = flowOperRows([{ relation: { id: 'r3', sortNum: 1, oper: 'OPR-9' } }])
    expect(rows[0].operDesc).toBe('OPR-9')
    expect(rows[0].mark).toBe('')
  })
  it('空/undefined 返回空数组', () => {
    expect(flowOperRows(undefined)).toEqual([])
    expect(flowOperRows([])).toEqual([])
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd mes/vue3 && pnpm vitest run tests/bomFlow.spec.ts`
Expected: FAIL（`@/utils/bomFlow` 模块不存在 / 函数未定义）

- [ ] **Step 4: 写实现 `src/utils/bomFlow.ts`**

```typescript
import type { BomFlowNodeVO, BomFlowTreeNode, FlowOperItem } from '@/types/technology'

/** 扁平 list 响应 → 树:按 bomNode.parentId 建父子,同级按 sortOrder 升序,bomNode 字段展平到顶层 */
export function buildBomNodeTree(items: BomFlowNodeVO[]): BomFlowTreeNode[] {
  const map = new Map<string, BomFlowTreeNode>()
  for (const it of items) {
    map.set(it.bomNode.id, {
      ...it.bomNode,
      bomFlow: it.bomFlow ?? null,
      flow: it.flow ?? null,
      opers: it.opers ?? [],
      children: [],
    })
  }
  const roots: BomFlowTreeNode[] = []
  for (const it of items) {
    const node = map.get(it.bomNode.id)!
    const pid = it.bomNode.parentId
    if (pid && map.has(pid)) map.get(pid)!.children.push(node)
    else roots.push(node)
  }
  const sortRec = (ns: BomFlowTreeNode[]) => {
    ns.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    ns.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

/** 可绑/换/解的前提:根、现有绑定、节点三者均未锁定 */
export function canWriteBomFlow(rootStatus?: string, bindStatus?: string, nodeStatus?: string): boolean {
  return rootStatus !== 'locked' && (bindStatus ?? 'draft') !== 'locked' && nodeStatus !== 'locked'
}

/** 组装 bind 入参:剥空白备注 */
export function buildBindPayload(
  bomId: string,
  flowId: string,
  remark?: string,
): { bomId: string; flowId: string; remark?: string } {
  const out: { bomId: string; flowId: string; remark?: string } = { bomId, flowId }
  if (remark && remark.trim()) out.remark = remark.trim()
  return out
}

/** 工序链预览行:序号/工序描述/首末道标记 */
export interface OperPreviewRow {
  seq: number
  operDesc: string
  mark: string
}
export function flowOperRows(opers?: FlowOperItem[]): OperPreviewRow[] {
  if (!opers || opers.length === 0) return []
  return opers.map((it, i) => ({
    seq: it.relation.sortNum ?? i + 1,
    operDesc: it.oper?.operDesc || it.relation.oper || '',
    mark: it.relation.operType === 'firstOper' ? '首道' : it.relation.operType === 'lastOper' ? '末道' : '',
  }))
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd mes/vue3 && pnpm vitest run tests/bomFlow.spec.ts`
Expected: PASS（全部用例绿）

- [ ] **Step 6: typecheck + 提交**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误

```bash
git add mes/vue3/src/types/technology.ts mes/vue3/src/utils/bomFlow.ts mes/vue3/tests/bomFlow.spec.ts
git commit -m "$(cat <<'EOF'
✨ feat(vue3): BOM工艺绑定纯函数与类型(buildBomNodeTree/canWriteBomFlow 等,TDD)
EOF
)"
```

---

## Task 2: API 封装

**Files:**
- Create: `mes/vue3/src/api/technology/bomFlow.ts`

- [ ] **Step 1: 写 `src/api/technology/bomFlow.ts`**

```typescript
import { http } from '@/api/request'
import type {
  SpProductBom,
  SpFlow,
  BomFlowNodeVO,
  FlowOperItem,
} from '@/types/technology'

/** 产品根列表(GET) — 所有 parent_id 为空的根 BOM */
export const bomFlowProducts = () =>
  http.get<SpProductBom[]>('/technology/bom-flow/products')

/** 某产品根下全部节点+绑定(GET,扁平) */
export const bomFlowList = (rootId: string) =>
  http.get<BomFlowNodeVO[]>(`/technology/bom-flow/list/${encodeURIComponent(rootId)}`)

/** 工艺路线全表(GET,绑定下拉用) */
export const bomFlowFlows = () =>
  http.get<SpFlow[]>('/technology/bom-flow/flows')

/** 某工艺路线工序链预览(GET) */
export const bomFlowOpers = (flowId: string) =>
  http.get<FlowOperItem[]>(`/technology/bom-flow/opers/${encodeURIComponent(flowId)}`)

/** 绑定/换绑(JSON),返回新绑定 id */
export const bomFlowBind = (body: { bomId: string; flowId: string; remark?: string }) =>
  http.post<string>('/technology/bom-flow/bind', body, true)

/** 解绑(JSON) */
export const bomFlowUnbind = (bomId: string) =>
  http.post<void>('/technology/bom-flow/unbind', { bomId }, true)

/** 锁定整树工艺(JSON,需 BOM 根已锁定) */
export const bomFlowLock = (rootId: string) =>
  http.post<void>(`/technology/bom-flow/lock/${encodeURIComponent(rootId)}`, {}, true)
```

- [ ] **Step 2: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: 提交**

```bash
git add mes/vue3/src/api/technology/bomFlow.ts
git commit -m "$(cat <<'EOF'
✨ feat(vue3): BOM工艺绑定 API 封装(products/list/flows/opers GET + bind/unbind/lock JSON)
EOF
)"
```

---

## Task 3: 绑定弹窗 `FlowBindDialog.vue`

**Files:**
- Create: `mes/vue3/src/views/technology/bom-flow/FlowBindDialog.vue`

弹窗为纯展示组件：`flows` 列表由父级传入；选中一条路线 + 可选备注；点确定 emit `submit`，由父级调 `bomFlowBind`。`bomId`/换绑预选 `currentFlowId` 由父级传入。

- [ ] **Step 1: 写组件**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="currentFlowId ? '换绑工艺路线' : '绑定工艺路线'"
    width="520px"
    :loading="loading"
    @update:model-value="$emit('update:modelValue', $event)"
    @submit="onSubmit"
  >
    <el-form :model="form" label-width="96px">
      <el-form-item label="工艺路线" required>
        <el-select v-model="form.flowId" placeholder="请选择工艺路线" filterable style="width: 100%">
          <el-option
            v-for="f in flows"
            :key="f.id"
            :label="f.flowDesc ? `${f.flow} — ${f.flowDesc}` : f.flow"
            :value="f.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="可选:绑定原因/步骤说明" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import type { SpFlow } from '@/types/technology'

const props = defineProps<{
  modelValue: boolean
  flows: SpFlow[]
  currentFlowId?: string  // 换绑时预选
  loading?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [{ flowId: string; remark: string }]
}>()

const form = reactive<{ flowId: string; remark: string }>({ flowId: '', remark: '' })

// 每次打开:重置并按 currentFlowId 预选(换绑回填)
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.flowId = props.currentFlowId ?? ''
      form.remark = ''
    }
  },
)

function onSubmit() {
  if (!form.flowId) {
    ElMessage.warning('请选择工艺路线')
    return
  }
  emit('submit', { flowId: form.flowId, remark: form.remark })
}
</script>
```

- [ ] **Step 2: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: 提交**

```bash
git add mes/vue3/src/views/technology/bom-flow/FlowBindDialog.vue
git commit -m "$(cat <<'EOF'
✨ feat(vue3): BOM工艺绑定弹窗 FlowBindDialog(单选路线 + 备注,换绑预选)
EOF
)"
```

---

## Task 4: 右面板 `BomNodeFlowDetail.vue`

**Files:**
- Create: `mes/vue3/src/views/technology/bom-flow/BomNodeFlowDetail.vue`

展示选中节点信息 + 已绑工艺卡（绑/换/解按钮，`canWrite` 控 disabled）+ 只读工序链预览（`DataTable`，无分页用本地 pager）。

- [ ] **Step 1: 写组件**

```vue
<template>
  <div class="bf-detail">
    <!-- 节点信息 -->
    <el-descriptions :column="2" border size="small" title="节点信息">
      <el-descriptions-item label="节点名称">{{ node.bomNode.nodeName }}</el-descriptions-item>
      <el-descriptions-item label="层级">{{ levelText(node.bomNode.level) }}</el-descriptions-item>
      <el-descriptions-item label="编码">{{ node.bomNode.bomCode ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="node.bomNode.status === 'locked' ? 'warning' : 'info'" size="small" disable-transitions>
          {{ node.bomNode.status === 'locked' ? '已锁定' : '草稿' }}
        </el-tag>
      </el-descriptions-item>
    </el-descriptions>

    <!-- 已绑工艺 -->
    <div class="bf-flow-card">
      <div class="bf-flow-card__head">
        <span class="bf-flow-card__title">已绑工艺路线</span>
        <div class="bf-flow-card__ops">
          <el-button type="primary" size="small" :disabled="!canWrite" @click="$emit('bind')">
            {{ node.bomFlow ? '换绑' : '绑定' }}
          </el-button>
          <el-button
            v-if="node.bomFlow"
            type="danger"
            size="small"
            :disabled="!canWrite"
            @click="$emit('unbind')"
          >解绑</el-button>
        </div>
      </div>
      <div v-if="node.flow" class="bf-flow-card__body">
        <span class="bf-flow-card__name">{{ node.flow.flow }}</span>
        <span class="bf-flow-card__desc">{{ node.flow.flowDesc ?? '' }}</span>
      </div>
      <el-empty v-else description="未绑定工艺路线" :image-size="60" />
    </div>

    <!-- 工序链预览(只读) -->
    <div v-if="rows.length" class="bf-opers">
      <div class="bf-opers__title">工序链预览</div>
      <el-table :data="rows" size="small" border>
        <el-table-column prop="seq" label="序号" width="70" />
        <el-table-column prop="operDesc" label="工序" min-width="160" />
        <el-table-column prop="mark" label="标记" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.mark" size="small" type="success" disable-transitions>{{ row.mark }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { flowOperRows } from '@/utils/bomFlow'
import type { BomFlowNodeVO } from '@/types/technology'

const props = defineProps<{
  node: BomFlowNodeVO
  canWrite: boolean
}>()
defineEmits<{ bind: []; unbind: [] }>()

const rows = computed(() => flowOperRows(props.node.opers))

function levelText(level?: number): string {
  if (level === 0) return '产品'
  if (level === 1) return '半成品'
  if (level === 2) return '组件'
  return '-'
}
</script>

<style scoped>
.bf-detail { display: flex; flex-direction: column; gap: var(--sp-3); }
.bf-flow-card { border: 1px solid var(--el-border-color); border-radius: 6px; padding: var(--sp-3); }
.bf-flow-card__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-2); }
.bf-flow-card__title { font-weight: 600; }
.bf-flow-card__body { display: flex; flex-direction: column; gap: 2px; }
.bf-flow-card__name { font-weight: 600; color: var(--el-color-primary); }
.bf-flow-card__desc { color: var(--el-text-color-secondary); font-size: 13px; }
.bf-opers__title { font-weight: 600; margin-bottom: var(--sp-2); }
</style>
```

- [ ] **Step 2: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 错误

- [ ] **Step 3: 提交**

```bash
git add mes/vue3/src/views/technology/bom-flow/BomNodeFlowDetail.vue
git commit -m "$(cat <<'EOF'
✨ feat(vue3): BOM工艺绑定右面板 BomNodeFlowDetail(节点信息+已绑工艺+工序链只读预览)
EOF
)"
```

---

## Task 5: 主页 `BomFlowPage.vue`（双态编排）

**Files:**
- Create: `mes/vue3/src/views/technology/bom-flow/BomFlowPage.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <PageContainer>
    <!-- ════════ 浏览态 ════════ -->
    <template v-if="!editingRootId">
      <div class="bf-toolbar">
        <el-select v-model="pickedRootId" placeholder="选择产品 BOM" filterable style="width: 280px">
          <el-option v-for="p in products ?? []" :key="p.id" :label="p.nodeName" :value="p.id" />
        </el-select>
        <el-button type="primary" :icon="Right" :disabled="!pickedRootId" @click="enterBind">进入绑定</el-button>
      </div>
      <el-empty description="选择一个产品 BOM,进入工艺绑定" />
    </template>

    <!-- ════════ 编辑态 ════════ -->
    <template v-else>
      <div class="bf-edit-header">
        <el-button :icon="Back" size="small" @click="back">返回</el-button>
        <span class="bf-edit-header__name">{{ rootName }}</span>
        <el-tag :type="rootLocked ? 'warning' : 'info'" size="small" disable-transitions>
          {{ rootLocked ? 'BOM已锁定' : 'BOM草稿' }}
        </el-tag>
        <div class="bf-edit-header__ops">
          <el-button type="warning" :icon="Lock" size="small" :disabled="!rootLocked" @click="handleLock">
            锁定工艺
          </el-button>
        </div>
      </div>

      <MasterDetailLayout :has-selection="!!selected">
        <template #master>
          <TreeTable :data="treeData" :loading="listLoading" :columns="structColumns" :action-width="1">
            <template #col-nodeName="{ row }">
              <span
                :class="selectedBomId === (row as BomFlowTreeNode).id ? 'bf-node-selected' : 'bf-node'"
                @click="selectedBomId = (row as BomFlowTreeNode).id"
              >{{ (row as BomFlowTreeNode).nodeName }}</span>
            </template>
            <template #col-flow="{ row }">
              <span v-if="(row as BomFlowTreeNode).flow">{{ (row as BomFlowTreeNode).flow!.flow }}</span>
              <span v-else class="bf-unbound">未绑定</span>
            </template>
          </TreeTable>
        </template>

        <template #detail>
          <BomNodeFlowDetail
            v-if="selected"
            :node="selected"
            :can-write="canWrite"
            @bind="openBind"
            @unbind="handleUnbind"
          />
        </template>

        <template #detail-empty>
          <el-empty description="请点击左侧结构树节点" />
        </template>
      </MasterDetailLayout>
    </template>

    <FlowBindDialog
      v-model="bindOpen"
      :flows="flows ?? []"
      :current-flow-id="selected?.bomFlow?.flowId"
      :loading="submitLoading"
      @submit="handleBind"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Right, Back, Lock } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import TreeTable from '@/components/TreeTable.vue'
import { type Column } from '@/components/DataTable.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import BomNodeFlowDetail from './BomNodeFlowDetail.vue'
import FlowBindDialog from './FlowBindDialog.vue'
import { useRequest } from '@/composables/useRequest'
import {
  bomFlowProducts, bomFlowList, bomFlowFlows,
  bomFlowBind, bomFlowUnbind, bomFlowLock,
} from '@/api/technology/bomFlow'
import { buildBomNodeTree, canWriteBomFlow, buildBindPayload } from '@/utils/bomFlow'
import type { BomFlowNodeVO, BomFlowTreeNode } from '@/types/technology'

// ─── 浏览态 ───────────────────────────────────────────────
const { data: products } = useRequest(bomFlowProducts, { immediate: true, initialData: [] })
const pickedRootId = ref('')

// ─── 工艺路线下拉(绑定弹窗用,加载一次) ────────────────────
const { data: flows } = useRequest(bomFlowFlows, { immediate: true, initialData: [] })

// ─── 编辑态 ───────────────────────────────────────────────
const editingRootId = ref<string | null>(null)
const selectedBomId = ref<string | null>(null)
const flat = ref<BomFlowNodeVO[]>([])
const listLoading = ref(false)

const treeData = computed<BomFlowTreeNode[]>(() => buildBomNodeTree(flat.value))
const selected = computed<BomFlowNodeVO | undefined>(() =>
  flat.value.find((x) => x.bomNode.id === selectedBomId.value),
)
const rootVO = computed<BomFlowNodeVO | undefined>(() =>
  flat.value.find((x) => x.bomNode.id === editingRootId.value),
)
const rootName = computed(() => rootVO.value?.bomNode.nodeName ?? '')
const rootLocked = computed(() => rootVO.value?.bomNode.status === 'locked')
const canWrite = computed(() =>
  canWriteBomFlow(rootVO.value?.bomNode.status, selected.value?.bomFlow?.status, selected.value?.bomNode.status),
)

async function loadList(rootId: string) {
  listLoading.value = true
  try {
    flat.value = await bomFlowList(rootId)
  } catch {
    flat.value = []
  } finally {
    listLoading.value = false
  }
}

async function enterBind() {
  if (!pickedRootId.value) return
  editingRootId.value = pickedRootId.value
  selectedBomId.value = pickedRootId.value
  await loadList(pickedRootId.value)
}
function back() {
  editingRootId.value = null
  selectedBomId.value = null
  flat.value = []
}

// ─── 绑定/换绑 ────────────────────────────────────────────
const bindOpen = ref(false)
const submitLoading = ref(false)

function openBind() {
  bindOpen.value = true
}
async function handleBind(payload: { flowId: string; remark: string }) {
  if (!selectedBomId.value) return
  submitLoading.value = true
  try {
    await bomFlowBind(buildBindPayload(selectedBomId.value, payload.flowId, payload.remark))
    ElMessage.success('绑定成功')
    bindOpen.value = false
    await loadList(editingRootId.value!)
  } finally {
    submitLoading.value = false
  }
}

async function handleUnbind() {
  if (!selected.value) return
  try {
    await ElMessageBox.confirm(`确认解绑节点「${selected.value.bomNode.nodeName}」的工艺路线?`, '提示', {
      type: 'warning', confirmButtonText: '确认解绑', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await bomFlowUnbind(selected.value.bomNode.id)
    ElMessage.success('已解绑')
    await loadList(editingRootId.value!)
  } catch { /* 拦截器已提示 */ }
}

// ─── 锁定工艺 ─────────────────────────────────────────────
async function handleLock() {
  if (!editingRootId.value) return
  try {
    await ElMessageBox.confirm('锁定后整个产品的工艺绑定将变为只读,且不可撤销。确认?', '提示', {
      type: 'warning', confirmButtonText: '确认锁定', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await bomFlowLock(editingRootId.value)
    ElMessage.success('已锁定工艺')
    await loadList(editingRootId.value)
  } catch { /* 拦截器已提示 */ }
}

// ─── 列定义 ───────────────────────────────────────────────
const structColumns: Column[] = [
  { prop: 'nodeName', label: '结构', minWidth: 200 },
  { prop: 'flow', label: '已绑工艺', minWidth: 120 },
]
</script>

<style scoped>
.bf-toolbar { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.bf-edit-header { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); flex-wrap: wrap; }
.bf-edit-header__name { font-size: 15px; font-weight: 600; }
.bf-edit-header__ops { margin-left: auto; }
.bf-node { cursor: pointer; }
.bf-node-selected { cursor: pointer; color: var(--el-color-primary); font-weight: 600; }
.bf-unbound { color: var(--el-text-color-secondary); }
</style>
```

> **注意：** `TreeTable` 的 `actions` 插槽未提供时操作列不渲染（沿用 `ProductBomList` 树视图惯例）；`action-width` 设小值无害。若 `TreeTable` 强制渲染操作列，去掉 `:action-width` 并确认 `ProductBomList.vue:52` 同款用法即可（该页树视图亦未传 actions 插槽）。

- [ ] **Step 2: typecheck + build**

Run: `cd mes/vue3 && pnpm typecheck && pnpm build`
Expected: typecheck 0 错误；build 成功

- [ ] **Step 3: 提交**

```bash
git add mes/vue3/src/views/technology/bom-flow/BomFlowPage.vue
git commit -m "$(cat <<'EOF'
✨ feat(vue3): BOM工艺绑定主页(浏览选产品根 ↔ 编辑态主从:树点选+绑/换/解+锁定工艺)
EOF
)"
```

---

## Task 6: 路由 / urlMap / 菜单种子接入

**Files:**
- Modify: `mes/vue3/src/utils/urlMap.ts:12`（在 product-bom 行后追加）
- Modify: `mes/vue3/src/router/index.ts:81`（在 product-bom 路由后追加）
- Create: `scripts/sql/bom-flow-menu-seed.sql`

- [ ] **Step 1: `urlMap.ts` 追加映射**

在 `'/technology/product-bom/list-ui': '/technology/product-bom',` 行后追加：

```typescript
  '/technology/bom-flow/list-ui': '/technology/bom-flow',
```

- [ ] **Step 2: `router/index.ts` 追加路由**

在 `technology/product-bom` 路由对象（`router/index.ts:76-81`）后追加：

```typescript
      {
        path: 'technology/bom-flow',
        name: 'technology-bom-flow',
        component: () => import('@/views/technology/bom-flow/BomFlowPage.vue'),
        meta: { title: 'BOM工艺绑定', perm: 'bom-flow:add' },
      },
```

- [ ] **Step 3: 写菜单种子 `scripts/sql/bom-flow-menu-seed.sql`**

```sql
-- 子周期 1c-3:BOM工艺绑定 菜单(挂在「工艺管理」15 下,与 151/153/154 同级)
-- 幂等执行:删除同 id 再插入
DELETE FROM `sp_sys_menu` WHERE `id` = '155';
INSERT INTO `sp_sys_menu`
  (`id`, `code`, `name`, `url`, `parent_id`, `grade`, `sort_num`, `type`, `permission`, `icon`, `descr`, `create_time`, `create_username`, `update_time`, `update_username`)
VALUES
  ('155', 'bomFlow', 'BOM工艺绑定', '/technology/bom-flow/list-ui', '15', '3', 5, '0', 'bom-flow:add', 'link', '', NOW(), 'admin', NOW(), 'admin');
```

- [ ] **Step 4: typecheck + build**

Run: `cd mes/vue3 && pnpm typecheck && pnpm build`
Expected: typecheck 0 错误；build 成功

- [ ] **Step 5: 提交**

```bash
git add mes/vue3/src/utils/urlMap.ts mes/vue3/src/router/index.ts scripts/sql/bom-flow-menu-seed.sql
git commit -m "$(cat <<'EOF'
✨ feat(vue3): BOM工艺绑定路由接入(router + urlMap 映射 + 菜单种子 id=155)
EOF
)"
```

---

## Task 7: 后端审查（按 backend-deepseek-review-each-cycle，必做）

**Files（只读审查 + 可能的最小修复）：**
- Read: `mes/src/main/java/com/wangziyang/mes/technology/controller/SpBomFlowController.java`
- Read: `mes/src/main/java/com/wangziyang/mes/technology/service/impl/SpBomFlowServiceImpl.java`
- Read: `mes/src/main/java/com/wangziyang/mes/technology/service/impl/SpProductBomServiceImpl.java`（`getTreeByRootId` 是否含根、是否过滤软删）
- 可能 Create: `mes/src/test/java/com/wangziyang/mes/technology/SpBomFlowGuardTest.java`

审查清单（逐条核对，**只修暴露的正确性问题**，latent/越界记 backlog）：

1. `bind` 三态守卫：root（`bomNode.status`）/ 现有绑定（`existing.status`）/ flow 存在性 —— 与前端 `canWriteBomFlow` 对齐。**已读 Controller 确认完整**（行 85-99）。
2. `replaceBinding` 原子性：`@Transactional(rollbackFor=Exception.class)` 先删后插。**已确认**。
3. `unbind` 双重锁定检查（bf.status / node.status）。**已确认**（行 118-122）。
4. `lock` 要求 root 已锁定。**已确认**（行 131-133）；`lockProductBomFlows` 是否 `@Transactional`。**已确认**（ServiceImpl 行 23）。
5. `getTreeByRootId` 是否返回**含根**的全部节点、是否对 `is_deleted` 有处理（影响 `list` 与 `lock` 覆盖范围）。**本任务重点核对项**。
6. N+1 查询（`list` 逐节点回查 flow/opers）：演示规模容忍 → **记 backlog,不优化**。
7. 跨模块:删除 BOM 节点时 `sp_bom_flow` 残留清理 → **记 backlog,本周期不动**。

- [ ] **Step 1: 逐文件审查**

Read 上述 3 个后端文件，逐条核对清单。**若清单 1-5 全部已正确（很可能）**，则本任务无生产代码修复，仅补守卫单测固化行为；**若发现真实 bug**（如 `getTreeByRootId` 不含根导致 lock 漏锁根节点绑定），写最小修复。

- [ ] **Step 2: 写 Mockito 守卫单测 `SpBomFlowGuardTest.java`**

固化关键守卫（JUnit4 + Mockito；注意 `Result extends HashMap` 取 `get("code")`，成功=0/失败=1；`@InjectMocks SpBomFlowController` 须 mock 全部 5 个注入字段 `spBomFlowService`/`spProductBomService`/`iSpFlowService`/`iSpFlowOperRelationService`/`iSpOperService`）：

```java
package com.wangziyang.mes.technology;

import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.controller.SpBomFlowController;
import com.wangziyang.mes.technology.entity.SpBomFlow;
import com.wangziyang.mes.technology.entity.SpProductBom;
import com.wangziyang.mes.technology.service.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.Silent.class)
public class SpBomFlowGuardTest {

    @Mock private ISpBomFlowService spBomFlowService;
    @Mock private ISpProductBomService spProductBomService;
    @Mock private ISpFlowService iSpFlowService;
    @Mock private ISpFlowOperRelationService iSpFlowOperRelationService;
    @Mock private ISpOperService iSpOperService;

    @InjectMocks private SpBomFlowController controller;

    /** bind:BOM 节点已锁定 → 拒绝(code=1) */
    @Test
    public void bind_rejectsWhenNodeLocked() {
        SpProductBom node = new SpProductBom();
        node.setStatus("locked");
        when(spProductBomService.getById("b1")).thenReturn(node);

        Map<String, Object> params = new HashMap<>();
        params.put("bomId", "b1");
        params.put("flowId", "f1");
        Result r = controller.bind(params);
        assertEquals(1, r.get("code"));
    }

    /** unbind:绑定已锁定 → 拒绝(code=1) */
    @Test
    public void unbind_rejectsWhenBindingLocked() {
        SpBomFlow bf = new SpBomFlow();
        bf.setStatus("locked");
        when(spBomFlowService.getOne(any(), anyBoolean())).thenReturn(bf);
        when(spProductBomService.getById("b1")).thenReturn(new SpProductBom());

        Map<String, String> params = new HashMap<>();
        params.put("bomId", "b1");
        Result r = controller.unbind(params);
        assertEquals(1, r.get("code"));
    }

    /** lock:BOM 根尚未锁定 → 拒绝(code=1) */
    @Test
    public void lock_rejectsWhenRootNotLocked() {
        SpProductBom root = new SpProductBom();
        root.setStatus("draft");
        when(spProductBomService.getById("r1")).thenReturn(root);

        Result r = controller.lock("r1");
        assertEquals(1, r.get("code"));
    }
}
```

- [ ] **Step 3: 编译 + 跑测试**

Run（JDK11 系统 mvn，见 ROADMAP 风险节）:
```bash
cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q -Dtest=SpBomFlowGuardTest test
```
Expected: `Tests run: 3, Failures: 0`；若先前做了生产代码修复，`mvn -q compile` 亦 BUILD SUCCESS。

- [ ] **Step 4: 提交**

```bash
git add mes/src/test/java/com/wangziyang/mes/technology/SpBomFlowGuardTest.java
# 若有生产代码修复一并 add 对应文件
git commit -m "$(cat <<'EOF'
✅ test(backend): BOM工艺绑定守卫单测(bind/unbind/lock 锁定拦截)
EOF
)"
```

> 若审查发现真实 bug 并修复，单独再补一个 `🐛 fix(backend): …` 提交，提交信息写清 bug 现象与修法。

---

## Task 8: 门禁全绿 + 路线图更新 + 终验

**Files:**
- Modify: `mes/vue3/docs/ROADMAP.md`（§8 标记 1c-3 ✅ + §9.3 矩阵 BOM-工艺绑定 → ✅ + §11 进度快照追加一条）

- [ ] **Step 1: 前端门禁全绿**

Run:
```bash
cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build
```
Expected: typecheck 0；test 全绿（含新增 bomFlow 用例，总数 = 79 + 本周期新增）；lint 0 error；build 成功。

- [ ] **Step 2: 更新 `ROADMAP.md`**

- §8 Cycle 1 子周期行：把 `1c-3 BOM-工艺绑定` 标 ✅，补一段完成说明（分支 `feature/bom-flow`、对接 8 端点零新增、放弃 OrderedTransfer 的契约原因、菜单 id=155 需手动跑种子、后端审查结论）。
- §9.3 工艺矩阵：`BOM-工艺绑定 | /technology/bom-flow/* | C1·1c-3 | ✅`。
- §11 进度快照：追加 1c-3 完成条目（门禁数据 + spec/plan 路径 + 待人工 :4200 冒烟）。

- [ ] **Step 3: 提交**

```bash
git add mes/vue3/docs/ROADMAP.md
git commit -m "$(cat <<'EOF'
📝 docs(vue3): 路线图更新 — 子周期 1c-3 BOM-工艺绑定完成
EOF
)"
```

- [ ] **Step 4: 终验汇报**

向用户汇报：门禁结果、后端审查结论（有无 bug）、需手动跑 `scripts/sql/bom-flow-menu-seed.sql`、人工 :4200 冒烟步骤（见 spec §8）。等待用户确认后再 `--no-ff` 合 `develop`（合并前若 develop 引入新依赖须 `pnpm install` 再验门禁，见 [[vue3-homework-frontend]] 教训）。

---

## 自检对照（spec 覆盖）

| spec 要求 | 对应 Task |
|---|---|
| §1 单页双态 + 浏览/编辑 | Task 5 |
| §1 不接 update-remark | 全程未实现(API/弹窗均无) ✓ |
| §2 放弃 OrderedTransfer / 单选下拉 | Task 3 FlowBindDialog 用 el-select ✓ |
| §3 8 端点对接(7 实现 + update-remark 跳过) | Task 2 |
| §3 三重锁定 canWrite | Task 1 canWriteBomFlow + Task 5 接线 ✓ |
| §3 锁定工艺需 root 已锁定 | Task 5 `:disabled="!rootLocked"` + Task 7 后端守卫 ✓ |
| §4.1 组件分解 | Task 3/4/5 ✓ |
| §4.2 纯函数 TDD | Task 1 ✓ |
| §4.3 API + 类型 | Task 1(类型) + Task 2(API) ✓ |
| §5 菜单 155 / urlMap / router | Task 6 ✓ |
| §6 后端审查 + 守卫单测 | Task 7 ✓ |
| §7 门禁 + 路线图 | Task 8 ✓ |
