# 工艺查询只读页（3c-2）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付 `/technology/process-query`（菜单 116「产品工艺查询」），按产品浏览 BOM 结构、纯只读查看各节点已编制的工艺文件（7 Tab）。零后端改动。

**Architecture:** 新建 2 个 Vue SFC（`ProcessQueryPage.vue` 编排 + `ProcessQueryDetail.vue` 只读查看器），复用 3c-1 的 4 个只读 GET 端点与 `TreeTable`/`MasterDetailLayout`/`MultiImageUpload(disabled)`/`buildTreeFromList` 等。唯一新增纯逻辑 `levelLabel`（TDD）。选产品即展开主从 + 自动选中产品根节点；`selToken` 守卫防快速切节点乱序。

**Tech Stack:** Vue 3 `<script setup>` + TS + Element Plus + Vitest（`tests/**/*.spec.ts`，node 环境只测纯函数，组件不做渲染测）。

**已核验事实（实现可直接依赖）：**
- 菜单 116 已存在 dev DB：`url=/technology/process-query`、`permission=process-query:list`、`parent_id=15`。**无需 menu seed SQL。** `url` 本就是干净 SPA 路径，`toSpaRoute` 原样透传。
- 4 个只读 GET 已在 `src/api/technology/processContent.ts`：`pcProducts()` / `pcList(rootId)` / `pcGet(bomId)` / `pcBomItems(bomId)`。
- 工具已存在并已测：`buildTreeFromList` / `parseCsvKeys` / `inspectionToBool`（`src/utils/processContent.ts`）。
- `MultiImageUpload` props：`modelValue: string[]`（key）、`urls: string[]`、`disabled?: boolean`、`uploadFn`（**required**，只读态传 no-op 即可，因 disabled 隐藏上传触发器）；`disabled && !urls.length` 时内置 `el-empty description="无图片"`。
- 测试入口：`pnpm test`（`vitest run`，include `tests/**/*.spec.ts`）；类型检查 `pnpm typecheck`；lint `pnpm lint:check`；构建 `pnpm build`。

---

## File Structure

- **Create** `src/views/technology/process-query/ProcessQueryDetail.vue` — 只读 7 Tab 查看器（props 入，无 emit）。
- **Create** `src/views/technology/process-query/ProcessQueryPage.vue` — 编排：产品下拉 → 主从 → 自动选根 + selToken 取数。
- **Modify** `src/utils/processContent.ts` — 追加 `levelLabel`。
- **Modify** `tests/processContent.spec.ts` — 追加 `levelLabel` 用例。
- **Modify** `src/router/index.ts` — 在 process-content 路由块后追加 process-query 路由。
- **Modify** `src/utils/urlMap.ts` — 追加自映射条目（对齐 3c-1 风格）。

---

## Task 1: `levelLabel` 纯函数（TDD）

**Files:**
- Modify: `src/utils/processContent.ts`（文件末尾追加）
- Test: `tests/processContent.spec.ts`（文件末尾追加 describe 块；同时在顶部 import 加入 `levelLabel`）

- [ ] **Step 1: 写失败测试**

在 `tests/processContent.spec.ts` 顶部 import 列表加入 `levelLabel`：

```ts
import {
  parseCsvKeys,
  joinKeys,
  inspectionToBool,
  boolToInspection,
  canEditContent,
  validateContent,
  buildContentPayload,
  buildEquipmentPayload,
  buildTreeFromList,
  levelLabel,
} from '@/utils/processContent'
```

在文件末尾追加：

```ts
describe('levelLabel', () => {
  it('0→产品 / 1→半成品 / ≥2→组件', () => {
    expect(levelLabel(0)).toBe('产品')
    expect(levelLabel(1)).toBe('半成品')
    expect(levelLabel(2)).toBe('组件')
    expect(levelLabel(5)).toBe('组件')
  })
  it('undefined 按 0 处理→产品', () => {
    expect(levelLabel(undefined)).toBe('产品')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test -- processContent`
Expected: FAIL —— `levelLabel is not a function` / 导入未定义。

- [ ] **Step 3: 实现 `levelLabel`**

在 `src/utils/processContent.ts` 末尾追加：

```ts
/** BOM 层级文案：0 产品 / 1 半成品 / ≥2 组件（undefined 按 0） */
export function levelLabel(level?: number): string {
  const lv = level ?? 0
  if (lv === 0) return '产品'
  if (lv === 1) return '半成品'
  return '组件'
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test -- processContent`
Expected: PASS（含新增 2 例）。

- [ ] **Step 5: 提交**

```bash
git add src/utils/processContent.ts tests/processContent.spec.ts
git commit -m "✨ feat(vue3): 3c-2 levelLabel 纯函数(BOM 层级文案)+ TDD"
```

---

## Task 2: `ProcessQueryDetail.vue` 只读查看器

**Files:**
- Create: `src/views/technology/process-query/ProcessQueryDetail.vue`

无组件单测（vitest node 环境只测纯函数）；本任务靠 `pnpm typecheck` 验证。

- [ ] **Step 1: 创建只读查看器组件**

写入 `src/views/technology/process-query/ProcessQueryDetail.vue`：

```vue
<template>
  <div class="pq-detail">
    <!-- 顶部:节点名 + 编制状态(无任何操作按钮) -->
    <div class="pq-detail__head">
      <span class="pq-detail__name">{{ nodeName }}</span>
      <el-tag :type="statusTagType" size="small" disable-transitions>{{ statusLabel }}</el-tag>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 主信息 -->
      <el-tab-pane label="主信息" name="main">
        <el-form label-width="80px">
          <el-form-item label="主信息">
            <el-input :model-value="content?.mainInfo ?? ''" readonly placeholder="—" />
          </el-form-item>
          <el-form-item label="工艺内容">
            <el-input
              :model-value="content?.content ?? ''"
              type="textarea"
              :rows="4"
              readonly
              placeholder="—"
            />
          </el-form-item>
          <el-form-item label="工序图片">
            <MultiImageUpload
              :model-value="contentImageKeys"
              :urls="detail.contentImageUrls"
              disabled
              :upload-fn="noopUpload"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 工序要求 -->
      <el-tab-pane label="工序要求" name="req">
        <el-input
          :model-value="content?.requirements ?? ''"
          type="textarea"
          :rows="5"
          readonly
          placeholder="—"
        />
      </el-tab-pane>

      <!-- 检验 -->
      <el-tab-pane label="检验" name="inspect">
        <el-form label-width="80px">
          <el-form-item label="需检验">
            <el-tag :type="inspected ? 'success' : 'info'" size="small" disable-transitions>{{
              inspected ? '是' : '否'
            }}</el-tag>
          </el-form-item>
          <el-form-item label="检验图片">
            <MultiImageUpload
              :model-value="inspectionImageKeys"
              :urls="detail.inspectionImageUrls"
              disabled
              :upload-fn="noopUpload"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 注意事项 -->
      <el-tab-pane label="注意事项" name="notes">
        <el-input
          :model-value="content?.notes ?? ''"
          type="textarea"
          :rows="5"
          readonly
          placeholder="—"
        />
      </el-tab-pane>

      <!-- 工装设备(只读) -->
      <el-tab-pane label="工装设备" name="equip">
        <el-table :data="detail.equipment" stripe border>
          <el-table-column prop="name" label="设备名称" show-overflow-tooltip />
          <el-table-column prop="quantity" label="数量" width="90" />
          <el-table-column prop="remark" label="备注" show-overflow-tooltip />
          <template #empty><el-empty description="暂无设备" :image-size="60" /></template>
        </el-table>
      </el-tab-pane>

      <!-- 技术文档(只读,仅预览) -->
      <el-tab-pane label="技术文档" name="doc">
        <el-table :data="detail.documents" stripe border>
          <el-table-column label="文档名称" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link :href="row.fileUrl" target="_blank" type="primary">{{ row.name }}</el-link>
            </template>
          </el-table-column>
          <template #empty><el-empty description="暂无文档" :image-size="60" /></template>
        </el-table>
      </el-tab-pane>

      <!-- 物料清单(只读) -->
      <el-tab-pane label="物料清单" name="mat">
        <el-table :data="bomItems" stripe border>
          <el-table-column prop="materialCode" label="物料编码" show-overflow-tooltip />
          <el-table-column prop="materialDesc" label="描述" show-overflow-tooltip />
          <el-table-column prop="quantity" label="数量" width="90" />
          <el-table-column prop="unit" label="单位" width="90" />
          <template #empty><el-empty description="暂无物料" :image-size="60" /></template>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import MultiImageUpload from '@/components/MultiImageUpload.vue'
import { parseCsvKeys, inspectionToBool } from '@/utils/processContent'
import type { ProcessContentDetail, SpProductBomItem } from '@/types/technology'

const props = defineProps<{
  nodeName: string
  detail: ProcessContentDetail
  bomItems: SpProductBomItem[]
}>()

const activeTab = ref('main')

const content = computed(() => props.detail.content)
const inspected = computed(() => inspectionToBool(content.value?.inspectionRequired))
const contentImageKeys = computed(() => parseCsvKeys(content.value?.contentImages))
const inspectionImageKeys = computed(() => parseCsvKeys(content.value?.inspectionImages))

const statusLabel = computed(() =>
  content.value?.status === 'completed' ? '已完成' : content.value?.id ? '草稿' : '未编制',
)
const statusTagType = computed(() => (content.value?.status === 'completed' ? 'success' : 'info'))

// MultiImageUpload 的 uploadFn 为 required;只读态 disabled 隐藏上传触发器,此函数永不被调用
const noopUpload = () => Promise.resolve({ key: '', url: '' })
</script>

<style scoped>
.pq-detail__head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}
.pq-detail__name {
  font-size: 15px;
  font-weight: 600;
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: PASS（0 错误）。若报 `el-link`/`el-tag` 未注册类型，见 Task 5 的 components.d.ts 说明（unplugin 在 dev/build 时自动追加；typecheck 前可先跑一次 `pnpm dev` 或 `pnpm build` 触发生成——通常 `el-link`/`el-tag`/`el-table` 已被既有页面注册过）。

- [ ] **Step 3: 提交**

```bash
git add src/views/technology/process-query/ProcessQueryDetail.vue
git commit -m "✨ feat(vue3): 3c-2 工艺查询只读查看器(7 Tab 全只读)"
```

---

## Task 3: `ProcessQueryPage.vue` 编排页

**Files:**
- Create: `src/views/technology/process-query/ProcessQueryPage.vue`

- [ ] **Step 1: 创建编排页**

写入 `src/views/technology/process-query/ProcessQueryPage.vue`：

```vue
<template>
  <PageContainer>
    <!-- 产品选择(始终显示) -->
    <div class="pq-toolbar">
      <span class="pq-toolbar__label">产品</span>
      <el-select
        v-model="pickedRootId"
        placeholder="选择产品查看工艺文件"
        filterable
        style="width: 320px"
        @change="onPickProduct"
      >
        <el-option
          v-for="p in products ?? []"
          :key="p.id"
          :label="p.productCode ? `${p.nodeName} (${p.productCode})` : p.nodeName"
          :value="p.id"
        />
      </el-select>
    </div>

    <!-- 未选产品:占位 -->
    <el-empty v-if="!pickedRootId" description="请选择产品查看其工艺文件" />

    <!-- 选中产品:主从 -->
    <MasterDetailLayout v-else :has-selection="!!selectedBomId">
      <template #master>
        <TreeTable :data="treeData" :loading="listLoading" :columns="treeColumns">
          <template #col-nodeName="{ row }">
            <span
              :class="
                selectedBomId === (row as ProcessContentTreeNode).id ? 'pq-node-selected' : 'pq-node'
              "
              @click="selectNode((row as ProcessContentTreeNode).id)"
              >{{ (row as ProcessContentTreeNode).nodeName }}</span
            >
          </template>
          <template #col-level="{ row }">
            {{ levelLabel((row as ProcessContentTreeNode).level) }}
          </template>
          <template #col-contentStatus="{ row }">
            <el-tag
              v-if="(row as ProcessContentTreeNode).contentStatus === 'completed'"
              type="success"
              size="small"
              disable-transitions
              >已完成</el-tag
            >
            <el-tag
              v-else-if="(row as ProcessContentTreeNode).contentStatus === 'draft'"
              type="info"
              size="small"
              disable-transitions
              >草稿</el-tag
            >
            <span v-else class="pq-muted">未编制</span>
          </template>
        </TreeTable>
      </template>

      <template #detail>
        <ProcessQueryDetail
          v-if="selectedBomId && detail"
          :key="selectedBomId"
          :node-name="selectedNodeName"
          :detail="detail"
          :bom-items="bomItems"
        />
      </template>
      <template #detail-empty>
        <el-empty description="请点击左侧 BOM 节点查看工艺" />
      </template>
    </MasterDetailLayout>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import TreeTable from '@/components/TreeTable.vue'
import { type Column } from '@/components/DataTable.vue'
import ProcessQueryDetail from './ProcessQueryDetail.vue'
import { useRequest } from '@/composables/useRequest'
import { pcProducts, pcList, pcGet, pcBomItems } from '@/api/technology/processContent'
import { buildTreeFromList, levelLabel } from '@/utils/processContent'
import type {
  SpProductBom,
  SpProductBomItem,
  ProcessContentDetail,
  ProcessContentTreeNode,
} from '@/types/technology'

// ─── 产品下拉 ─────────────────────────────────────────────
const { data: products } = useRequest(pcProducts, {
  immediate: true,
  initialData: [] as SpProductBom[],
})
const pickedRootId = ref('')

// ─── 左树 ─────────────────────────────────────────────────
const treeData = ref<ProcessContentTreeNode[]>([])
const { loading: listLoading, run: loadTree } = useRequest(async () => {
  const list = await pcList(pickedRootId.value)
  treeData.value = buildTreeFromList(list)
})
const treeColumns: Column[] = [
  { prop: 'nodeName', label: '节点名称', minWidth: 200 },
  { prop: 'level', label: '层级', width: 100 },
  { prop: 'contentStatus', label: '编制状态', width: 120 },
]

// ─── 选产品:建树 + 自动选中产品根节点 ─────────────────────
const onPickProduct = async (rootId: string) => {
  selectedBomId.value = ''
  detail.value = null
  await loadTree()
  selectNode(rootId) // 自动选中产品根
}

// ─── 选节点 → 取详情 + 物料(selToken 守卫防快速切节点乱序)──
const selectedBomId = ref('')
const detail = ref<ProcessContentDetail | null>(null)
const bomItems = ref<SpProductBomItem[]>([])
const selectedNodeName = computed(() => {
  const find = (nodes: ProcessContentTreeNode[]): string | undefined => {
    for (const n of nodes) {
      if (n.id === selectedBomId.value) return n.nodeName
      const sub = find(n.children)
      if (sub) return sub
    }
    return undefined
  }
  return find(treeData.value) ?? ''
})
let selToken = 0
const selectNode = async (bomId: string) => {
  selectedBomId.value = bomId
  detail.value = null
  const token = ++selToken
  try {
    const [d, items] = await Promise.all([pcGet(bomId), pcBomItems(bomId)])
    if (token !== selToken) return
    detail.value = d
    bomItems.value = items
  } catch {
    if (token === selToken) {
      detail.value = {
        content: null,
        equipment: [],
        documents: [],
        contentImageUrls: [],
        inspectionImageUrls: [],
      }
      bomItems.value = []
    }
  }
}
</script>

<style scoped>
.pq-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}
.pq-toolbar__label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
.pq-node {
  cursor: pointer;
}
.pq-node-selected {
  cursor: pointer;
  color: var(--el-color-primary);
  font-weight: 600;
}
.pq-muted {
  color: var(--el-text-color-secondary);
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: PASS（0 错误）。

- [ ] **Step 3: 提交**

```bash
git add src/views/technology/process-query/ProcessQueryPage.vue
git commit -m "✨ feat(vue3): 3c-2 工艺查询编排页(选产品即展开主从+自动选根+selToken)"
```

---

## Task 4: 路由 + urlMap 接线

**Files:**
- Modify: `src/router/index.ts`（process-content 路由块之后）
- Modify: `src/utils/urlMap.ts`（process-content 自映射之后）

- [ ] **Step 1: 注册路由**

在 `src/router/index.ts` 的 process-content 路由对象之后（`meta: { title: '工艺内容编制', perm: 'process-content:list' }` 那个 `},` 之后）插入：

```ts
      {
        path: 'technology/process-query',
        name: 'technology-process-query',
        component: () => import('@/views/technology/process-query/ProcessQueryPage.vue'),
        meta: { title: '工艺查询', perm: 'process-query:list' },
      },
```

- [ ] **Step 2: 追加 urlMap 自映射（对齐 3c-1 风格）**

在 `src/utils/urlMap.ts` 的 `'/technology/process-content': '/technology/process-content',` 行之后插入：

```ts
  '/technology/process-query': '/technology/process-query',
```

> 说明：菜单 116 的 `url` 本就是干净 SPA 路径，`toSpaRoute` 对未知 key 已原样透传，此自映射条目仅为与 3c-1 风格一致、显式声明。

- [ ] **Step 3: 类型检查 + 构建**

Run: `pnpm typecheck && pnpm build`
Expected: PASS；构建产物中出现 `ProcessQueryPage` 独立懒加载 chunk。

- [ ] **Step 4: 提交**

```bash
git add src/router/index.ts src/utils/urlMap.ts
git commit -m "🔧 chore(vue3): 3c-2 注册 process-query 路由 + urlMap 自映射"
```

---

## Task 5: 全门禁 + components.d.ts 收尾

**Files:**
- 可能 Modify: `src/types/components.d.ts`（unplugin 自动生成；若本周期新触发组件注册则作为 chore 提交）

- [ ] **Step 1: 跑全套门禁**

Run: `pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected:
- typecheck：0 错误
- test：全绿（含 Task 1 新增 levelLabel 2 例）
- lint:check：0 error（容忍既有 5 warn）
- build：✓

- [ ] **Step 2: 检查 components.d.ts 是否变更**

Run: `git status --short src/types/components.d.ts`
Expected：通常本页用的 `el-link`/`el-tag`/`el-table`/`el-tabs`/`el-empty`/`el-select`/`el-input`/`el-form` 均已被既有页面注册，**无变更**。若 dev/build 触发了新注册（出现 diff），提交：

```bash
git add src/types/components.d.ts
git commit -m "🔧 chore(vue3): 3c-2 unplugin 组件类型声明同步"
```

若无变更则跳过本步。

- [ ] **Step 3: 运行时冒烟（可选，需后端 9090 + dev DB）**

启动 `pnpm dev`（:4200），`admin/123` 登录 → 工艺管理 → 产品工艺查询 → 选产品 → 左树自动选中产品根 → 右侧 7 Tab 只读浏览（主信息/要求/检验/注意/设备/文档/物料）→ 点其它节点验证不错配。

---

## 后端审查（按 backend-deepseek-review-each-cycle，并入审查阶段）

对 4 个只读 GET 端点核验（预期 ZERO EXPOSED BUGS——mes-new 2f 修 12 bug + 2k curl 验证 + 3c-1 后端审查已覆盖同份后端）：
- `/products`、`/list/{rootId}`、`/get/{bomId}`、`/bom-items/{bomId}`：软删过滤 / 图片 key 单次重签不双签 / list 含根节点。
- 若发现暴露 bug，按"最小纯新增/纯修正"处理并补守卫单测。

---

## 收尾

- `feature/process-query` → `--no-ff` 合 `develop`（本 worktree 可直接 checkout develop 合并，见仓库布局说明）。
- 更新 `docs/ROADMAP.md`（3c-2 ✅，Cycle 3 收官）+ 写 `docs/specs/2026-06-23-cycle3c2-verify-results.md` + 更新 memory（vue3-homework-frontend）。
- 人工 :4200 冒烟待用户确认。

---

## Self-Review

- **Spec coverage**：组件结构（Task 2/3）✓ / 数据流（Task 3 selToken）✓ / 复用+levelLabel（Task 1/2/3）✓ / 菜单路由（Task 4，已实证菜单 116 存在零 seed）✓ / 后端审查 ✓ / 门禁（Task 5）✓ / 7 Tab 完整镜像（Task 2）✓ / el-input readonly（Task 2）✓ / 不加额外搜索（Task 3 无搜索框）✓。
- **Placeholder scan**：无 TBD/TODO；所有 code step 含完整代码；`noopUpload` 已显式定义。
- **Type consistency**：`ProcessContentDetail`/`SpProductBomItem`/`ProcessContentTreeNode`/`SpProductBom` 均来自 `@/types/technology`（已核对字段）；`levelLabel` 签名 Task 1 定义、Task 2/3 一致使用；`Column` 来自 `@/components/DataTable.vue`（与 process-content 一致）；`MultiImageUpload` props 名（`model-value`/`urls`/`disabled`/`upload-fn`）与组件定义一致。
