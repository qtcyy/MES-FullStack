# 子周期 3a BPMN 模型设计器 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Vue3 前端交付流程模型设计页(`/workflow/model`,菜单 192)——bpmn-js 可视化建模 + 节点办理人配置 + 结构校验高亮 + 发布到分类派生流程定义,对接后端已存在 5 端点,零后端生产代码改动。

**Architecture:** 单页 `ModelList`(DataTable + 三弹窗)。设计器装在**全屏 `el-dialog`**:左 `BpmnDesigner.vue`(Vue 包装 vanilla bpmn-js Modeler,仿 1f WarehouseScene 的 onMounted 创建/onBeforeUnmount destroy + `defineExpose` 命令式句柄)+ 右 `PropertiesPanel.vue`。纯逻辑沉淀 `utils/bpmn.ts`(TDD,近乎逐字移植 mes-new bpmnUtils)。校验 = 薄取数 `getSummary`(读 elementRegistry)+ 纯函数 `validateSummary`。

**Tech Stack:** Vue 3.5 `<script setup>` + TS + Element Plus + Vitest;`bpmn-js@^18` + `diagram-js-minimap@^5`(vanilla JS,route-level 懒加载);`http`(`@/api/request`);复用 `FormDialog`/`DataTable`/`SearchForm`/`PageContainer`/`usePagination`/`useRequest`/`rolePage`/`categoryList`。

---

## 设计基线(实现前必读)

- mes-new 2m 是精确参考:`mes/frontend/apps/mes-new/src/pages/workflow/model/{BpmnDesigner,PropertiesPanel,ModelDesignerDialog,ModelCreateDialog,PublishDialog}.tsx` + `bpmnUtils.ts` + `flowableModdle.ts` + `bpmn-theme.css`。**逻辑逐字移植,UI 用 Element Plus 重写,绝不照抄 React/shadcn**。
- **`bpmnTheme.ts` 不移植**(它服务 CustomRenderer,本周期不做 → 会成死代码)。只移植 `bpmn-theme.css`,且**适配 shadcn token → Element Plus `--el-*` 变量**。
- `http.post<T>(url, data, json=false)`:第三参 `true` = JSON。`http.get<T>(url, params?)`。model 端点:page 走 form,save/delete/publish 走 JSON,get 走 GET。
- `FormDialog`(`@/components/FormDialog.vue`):props `modelValue/title/width/loading`,emits `update:modelValue/submit`(确定按钮父级校验后处理),默认 slot 放表单。
- `categoryList()`(`@/api/workflow/category`)返回 `WorkflowCategory[]`(含 code/name)。`rolePage({current,size})`(`@/api/system/role`)返回 `IPage<SysRole>`(SysRole 含 code/name)。
- `IPage<T>` 从 `@/types/system` 导出,`@/types/workflow` 已 re-export。
- 测试目录 `mes/vue3/tests/*.spec.ts`,vitest node 环境,仅测纯函数。
- 所有命令在 `mes/vue3/` 下执行。Vue 无 React StrictMode/RHF DOM 坑。

## 文件清单

**新建:**
- `src/types/bpmn-js.d.ts` — bpmn-js / diagram-js-minimap 最小模块声明
- `src/api/workflow/model.ts` — 5 端点
- `src/utils/bpmn.ts` — initialBpmnXml/validateSummary/errorTaskIds/buildAssigneeProps + 类型
- `tests/bpmn.spec.ts` — utils/bpmn 单测
- `src/utils/flowableModdle.ts` — moddle 扩展
- `src/assets/styles/bpmn-theme.css` — 设计器外壳主题(Element Plus 变量)
- `src/views/workflow/model/BpmnDesigner.vue` — bpmn-js 包装组件
- `src/views/workflow/model/PropertiesPanel.vue` — 节点属性面板
- `src/views/workflow/model/BpmnDesignerDialog.vue` — 全屏设计器弹窗
- `src/views/workflow/model/ModelCreateDialog.vue` — 新建模型弹窗
- `src/views/workflow/model/PublishDialog.vue` — 发布弹窗
- `src/views/workflow/model/ModelList.vue` — 列表页

**修改:**
- `package.json` — 加 bpmn-js / diagram-js-minimap 依赖
- `src/types/workflow.ts` — 加 WorkflowModel/WorkflowModelStatus/ModelSaveDTO/ModelPublishDTO/ModelPageParams
- `src/utils/urlMap.ts` — `/workflow/model/list-ui` → `/workflow/model`(替换占位注释)
- `src/router/index.ts` — 加 `workflow/model` 路由
- `mes/vue3/docs/ROADMAP.md` — 矩阵 §9.8 BPMN ☐→✅ + Cycle 3 段

---

## Task 1: 安装依赖 + bpmn-js 类型声明(setup 风险提前验)

**Files:**
- Modify: `package.json`(经 pnpm add)
- Create: `src/types/bpmn-js.d.ts`

- [ ] **Step 1: 安装依赖**

Run: `pnpm add bpmn-js@^18 diagram-js-minimap@^5`
Expected: 安装成功,package.json dependencies 出现两者。

- [ ] **Step 2: 写最小类型声明 `src/types/bpmn-js.d.ts`**

```ts
declare module 'bpmn-js/lib/Modeler' {
  export interface ImportResult {
    warnings: unknown[]
  }
  export interface SaveResult {
    xml?: string
  }
  export default class Modeler {
    constructor(options?: Record<string, unknown>)
    importXML(xml: string): Promise<ImportResult>
    saveXML(options?: { format?: boolean }): Promise<SaveResult>
    get<T = unknown>(name: string): T
    on(event: string, callback: (event: unknown) => void): void
    destroy(): void
  }
}

declare module 'diagram-js-minimap' {
  const minimapModule: unknown
  export default minimapModule
}
```

> CSS 副作用导入(`bpmn-js/dist/assets/*.css` 等)由 `vite/client` 的 `declare module '*.css'` 覆盖,无需额外声明。

- [ ] **Step 3: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误(d.ts 无消费者也应通过)。

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/types/bpmn-js.d.ts
git commit -m "➕ chore(vue3): 3a 装 bpmn-js@18 + diagram-js-minimap + 最小类型声明"
```

---

## Task 2: 模型类型 + API

**Files:**
- Modify: `src/types/workflow.ts`(追加)
- Create: `src/api/workflow/model.ts`

- [ ] **Step 1: 追加类型到 `src/types/workflow.ts`**(文件末尾追加)

```ts
/** 流程模型状态 */
export type WorkflowModelStatus = 'DRAFT' | 'PUBLISHED'

/** 流程模型(sp_workflow_model) */
export interface WorkflowModel {
  id: string
  modelKey: string
  name: string
  /** BPMN 2.0 XML(longtext) */
  bpmnXml: string
  status: WorkflowModelStatus
  version: number
  categoryCode?: string
  categoryName?: string
  createTime?: string
  updateTime?: string
}

export interface ModelSaveDTO {
  id?: string
  modelKey: string
  name: string
  bpmnXml: string
}

export interface ModelPublishDTO {
  id: string
  categoryCode: string
  categoryName: string
}

export interface ModelPageParams {
  current: number
  size: number
  name?: string
  modelKey?: string
}
```

- [ ] **Step 2: 写 `src/api/workflow/model.ts`**

```ts
import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type { WorkflowModel, ModelSaveDTO, ModelPublishDTO, ModelPageParams } from '@/types/workflow'

/** 模型分页(form;name/modelKey LIKE,update_time 倒序) */
export const modelPage = (params: ModelPageParams) =>
  http.post<IPage<WorkflowModel>>('/workflow/model/page', params)

/** 取单个模型(含 bpmnXml;GET) */
export const modelGet = (id: string) =>
  http.get<WorkflowModel>(`/workflow/model/${encodeURIComponent(id)}`)

/** 新建/保存设计(JSON;空 id 走新建 DRAFT) */
export const modelSave = (dto: ModelSaveDTO) =>
  http.post<string>('/workflow/model/save', dto, true)

/** 删除(JSON {id};已发布级联清定义+事件规则) */
export const modelDelete = (id: string) =>
  http.post<void>('/workflow/model/delete', { id }, true)

/** 发布到分类(JSON;置 PUBLISHED + upsert 定义) */
export const modelPublish = (dto: ModelPublishDTO) =>
  http.post<void>('/workflow/model/publish', dto, true)
```

- [ ] **Step 3: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 4: Commit**

```bash
git add src/types/workflow.ts src/api/workflow/model.ts
git commit -m "✨ feat(vue3): 3a 流程模型类型 + API(5 端点 page/get/save/delete/publish)"
```

---

## Task 3: 纯逻辑 `src/utils/bpmn.ts`(TDD)

**Files:**
- Create: `tests/bpmn.spec.ts`
- Create: `src/utils/bpmn.ts`

- [ ] **Step 1: 写失败测试 `tests/bpmn.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  initialBpmnXml,
  validateSummary,
  errorTaskIds,
  buildAssigneeProps,
  type BpmnSummary,
} from '@/utils/bpmn'

function summary(p: Partial<BpmnSummary>): BpmnSummary {
  return { hasStart: true, hasEnd: true, userTasks: [], disconnectedCount: 0, ...p }
}

describe('initialBpmnXml', () => {
  it('含 process id=modelKey 与转义后的 name', () => {
    const xml = initialBpmnXml('orderFlow', 'A & B <test>')
    expect(xml).toContain('<bpmn:process id="orderFlow"')
    expect(xml).toContain('name="A &amp; B &lt;test&gt;"')
    expect(xml).toContain('flowable:')
    expect(xml).toContain('StartEvent_1')
  })
})

describe('validateSummary', () => {
  it('完整流程(有始有终+已配办理人用户任务)→ ok', () => {
    const r = validateSummary(
      summary({ userTasks: [{ id: 'T1', name: '审批', assignee: '${initiator}' }] }),
    )
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([])
  })
  it('缺开始/结束/用户任务都报', () => {
    const r = validateSummary(summary({ hasStart: false, hasEnd: false, userTasks: [] }))
    expect(r.ok).toBe(false)
    expect(r.issues).toContain('缺少开始事件')
    expect(r.issues).toContain('缺少结束事件')
    expect(r.issues).toContain('至少需要一个用户任务节点')
  })
  it('用户任务未命名/未配办理人各报一条', () => {
    const r = validateSummary(summary({ userTasks: [{ id: 'T1' }] }))
    expect(r.issues).toContain('用户任务「T1」未命名')
    expect(r.issues).toContain('用户任务「T1」未配置办理人')
  })
  it('存在孤立节点报数量', () => {
    const r = validateSummary(
      summary({ userTasks: [{ id: 'T1', name: 'x', assignee: 'a' }], disconnectedCount: 2 }),
    )
    expect(r.issues).toContain('存在 2 个未连接的节点')
  })
})

describe('errorTaskIds', () => {
  it('返回未命名或未配办理人的用户任务 id', () => {
    const ids = errorTaskIds(
      summary({
        userTasks: [
          { id: 'T1', name: '已配', assignee: 'a' },
          { id: 'T2', name: '' },
          { id: 'T3', name: '无办理人' },
        ],
      }),
    )
    expect(ids).toEqual(['T2', 'T3'])
  })
})

describe('buildAssigneeProps', () => {
  it('initiator → assignee=${initiator},清 candidateGroups', () => {
    expect(buildAssigneeProps('initiator')).toEqual({
      'flowable:assignee': '${initiator}',
      'flowable:candidateGroups': undefined,
    })
  })
  it('candidate → candidateGroups=roleCode,清 assignee', () => {
    expect(buildAssigneeProps('candidate', 'ROLE_MGR')).toEqual({
      'flowable:assignee': undefined,
      'flowable:candidateGroups': 'ROLE_MGR',
    })
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test bpmn`
Expected: FAIL(`@/utils/bpmn` 不存在)。

- [ ] **Step 3: 写实现 `src/utils/bpmn.ts`**

```ts
export interface UserTaskSummary {
  id: string
  name?: string
  assignee?: string
  candidateGroups?: string
}

export interface BpmnSummary {
  hasStart: boolean
  hasEnd: boolean
  userTasks: UserTaskSummary[]
  disconnectedCount: number
}

export interface ValidationResult {
  ok: boolean
  issues: string[]
}

export type AssigneeType = 'initiator' | 'candidate'

/** 当前选中元素的扁平视图(驱动属性面板) */
export interface SelectedElement {
  id: string
  type: string
  name?: string
  assignee?: string
  candidateGroups?: string
}

/** 转义 XML 属性值(& < > "),避免名称含特殊字符生成非良构 XML 致 bpmn-js 导入失败 */
function escapeXmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 生成只含一个开始事件的最小 BPMN 2.0 XML(process id=modelKey) */
export function initialBpmnXml(modelKey: string, name: string): string {
  const safeName = escapeXmlAttr(name)
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:flowable="http://flowable.org/bpmn" id="Definitions_${modelKey}" targetNamespace="http://flowable.org/processdef">
  <bpmn:process id="${modelKey}" name="${safeName}" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="开始" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${modelKey}">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
}

/** 纯函数:基于结构摘要校验"流程定义完成情况" */
export function validateSummary(s: BpmnSummary): ValidationResult {
  const issues: string[] = []
  if (!s.hasStart) issues.push('缺少开始事件')
  if (!s.hasEnd) issues.push('缺少结束事件')
  if (s.userTasks.length === 0) issues.push('至少需要一个用户任务节点')
  for (const t of s.userTasks) {
    const label = t.name?.trim() || t.id
    if (!t.name?.trim()) issues.push(`用户任务「${t.id}」未命名`)
    if (!t.assignee && !t.candidateGroups) issues.push(`用户任务「${label}」未配置办理人`)
  }
  if (s.disconnectedCount > 0) issues.push(`存在 ${s.disconnectedCount} 个未连接的节点`)
  return { ok: issues.length === 0, issues }
}

/** 纯函数:提取「未命名」或「未配置办理人」的用户任务 id(与 validateSummary 判定一致),用于画布错误高亮。 */
export function errorTaskIds(s: BpmnSummary): string[] {
  return s.userTasks
    .filter((t) => !t.name?.trim() || (!t.assignee && !t.candidateGroups))
    .map((t) => t.id)
}

/** 纯函数:由办理人类型计算 flowable 属性(两者互斥,另一个置 undefined 以清除) */
export function buildAssigneeProps(
  type: AssigneeType,
  roleCode?: string,
): { 'flowable:assignee'?: string; 'flowable:candidateGroups'?: string } {
  if (type === 'initiator') {
    return { 'flowable:assignee': '${initiator}', 'flowable:candidateGroups': undefined }
  }
  return { 'flowable:assignee': undefined, 'flowable:candidateGroups': roleCode || undefined }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test bpmn`
Expected: PASS(全部用例绿)。

- [ ] **Step 5: Commit**

```bash
git add src/utils/bpmn.ts tests/bpmn.spec.ts
git commit -m "✅ test(vue3): 3a utils/bpmn 纯逻辑 + TDD(初始XML/校验/错误节点/办理人属性)"
```

---

## Task 4: flowableModdle + 设计器主题 CSS

**Files:**
- Create: `src/utils/flowableModdle.ts`
- Create: `src/assets/styles/bpmn-theme.css`

- [ ] **Step 1: 写 `src/utils/flowableModdle.ts`**(逐字移植)

```ts
/**
 * 最小 Flowable moddle 扩展:让 bpmn:UserTask 支持 flowable:assignee / candidateGroups
 * 属性,使导出的 BPMN XML 真带 flowable: 命名空间属性(将来真 Flowable 后端可直接消费)。
 */
const flowableModdle = {
  name: 'Flowable',
  uri: 'http://flowable.org/bpmn',
  prefix: 'flowable',
  xml: { tagAlias: 'lowerCase' },
  associations: [],
  types: [
    {
      name: 'AssignableUserTask',
      extends: ['bpmn:UserTask'],
      properties: [
        { name: 'assignee', isAttr: true, type: 'String' },
        { name: 'candidateGroups', isAttr: true, type: 'String' },
        { name: 'candidateUsers', isAttr: true, type: 'String' },
      ],
    },
  ],
}

export default flowableModdle
```

- [ ] **Step 2: 写 `src/assets/styles/bpmn-theme.css`**(适配 Element Plus 变量;`.bpmn-error` 错误高亮驱动自 markErrors)

```css
/* BPMN 设计器外壳主题:跟随 Element Plus 亮/暗变量。
   节点语义配色需 CustomRenderer(本周期不做),这里只管画布外壳/标签/错误态。 */

/* 点阵网格背景 */
.djs-container {
  background-color: var(--el-bg-color);
  background-image: radial-gradient(var(--el-border-color) 1px, transparent 1px);
  background-size: 18px 18px;
}

/* 调色板:卡片化 */
.djs-palette {
  border: 1px solid var(--el-border-color) !important;
  border-radius: 8px !important;
  background: var(--el-bg-color-overlay) !important;
  box-shadow: var(--el-box-shadow-light) !important;
  overflow: hidden;
}
.djs-palette .entry {
  color: var(--el-text-color-secondary) !important;
  border-radius: 6px;
  margin: 2px;
  transition: background-color 0.12s, color 0.12s;
}
.djs-palette .entry:hover {
  background: var(--el-fill-color) !important;
  color: var(--el-text-color-primary) !important;
}
.djs-palette .separator {
  border-bottom: 1px solid var(--el-border-color) !important;
  margin: 4px 6px !important;
}

/* 上下文菜单:卡片化 */
.djs-context-pad .entry {
  border-radius: 6px !important;
  box-shadow: var(--el-box-shadow-light) !important;
  background: var(--el-bg-color-overlay) !important;
  color: var(--el-text-color-secondary) !important;
  border: 1px solid var(--el-border-color) !important;
}
.djs-context-pad .entry:hover {
  background: var(--el-fill-color) !important;
  color: var(--el-text-color-primary) !important;
}

/* 选中 / hover 态 */
.djs-element.selected .djs-outline {
  stroke: var(--el-color-primary) !important;
  stroke-width: 2px !important;
}
.djs-element.hover .djs-outline {
  stroke: var(--el-color-primary-light-3) !important;
}

/* 暗色画布下标签文字提亮 */
.dark .djs-label,
.dark text.djs-label,
.dark .djs-element text {
  fill: #e6e9ef;
}

/* 检查定义未通过:问题节点红色描边 + 脉冲 */
.djs-element.bpmn-error .djs-visual > :nth-child(1) {
  stroke: var(--el-color-danger) !important;
  stroke-width: 2.5px !important;
}
.djs-element.bpmn-error {
  animation: bpmn-error-pulse 1.1s ease-in-out infinite;
}
@keyframes bpmn-error-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

/* 小地图卡片化 */
.djs-minimap {
  border: 1px solid var(--el-border-color) !important;
  border-radius: 8px !important;
  background: var(--el-bg-color-overlay) !important;
  box-shadow: var(--el-box-shadow-light) !important;
  overflow: hidden;
}
.djs-minimap .toggle {
  background: var(--el-fill-color-light) !important;
  color: var(--el-text-color-secondary) !important;
}
.djs-minimap .map {
  background: var(--el-bg-color) !important;
}
```

- [ ] **Step 3: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误(flowableModdle 无显式类型也应通过)。

- [ ] **Step 4: Commit**

```bash
git add src/utils/flowableModdle.ts src/assets/styles/bpmn-theme.css
git commit -m "✨ feat(vue3): 3a flowable moddle 扩展 + 设计器主题CSS(Element Plus 变量)"
```

---

## Task 5: BpmnDesigner.vue(bpmn-js 包装组件)

**Files:**
- Create: `src/views/workflow/model/BpmnDesigner.vue`

> 这是本周期核心组件。镜像 1f `WarehouseScene.vue` 的「onMounted 手管实例 + onBeforeUnmount 彻底清理」,把 mes-new `BpmnDesigner.tsx` 的 `useImperativeHandle` 翻成 Vue `defineExpose`。Modeler 等非响应式实例用普通变量(不进 ref/reactive,避免 Vue 代理 bpmn-js 内部对象)。

- [ ] **Step 1: 写 `src/views/workflow/model/BpmnDesigner.vue`**

```vue
<template>
  <div class="bpmn-designer">
    <div ref="containerRef" class="bpmn-designer__canvas" />
    <div class="bpmn-designer__toolbar">
      <el-button text size="small" title="缩小" @click="zoomBy(1 / 1.2)">
        <el-icon><ZoomOut /></el-icon>
      </el-button>
      <span class="bpmn-designer__zoom">{{ Math.round(zoom * 100) }}%</span>
      <el-button text size="small" title="放大" @click="zoomBy(1.2)">
        <el-icon><ZoomIn /></el-icon>
      </el-button>
      <el-divider direction="vertical" />
      <el-button text size="small" title="适应窗口" @click="fit">
        <el-icon><FullScreen /></el-icon>
      </el-button>
      <el-button text size="small" title="实际大小(100%)" @click="resetZoom">
        <el-icon><RefreshRight /></el-icon>
      </el-button>
      <el-divider direction="vertical" />
      <el-button text size="small" title="撤销" :disabled="!canUndo" @click="undo">
        <el-icon><Back /></el-icon>
      </el-button>
      <el-button text size="small" title="重做" :disabled="!canRedo" @click="redo">
        <el-icon><Right /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ZoomIn, ZoomOut, FullScreen, RefreshRight, Back, Right } from '@element-plus/icons-vue'
import Modeler from 'bpmn-js/lib/Modeler'
import minimapModule from 'diagram-js-minimap'
import flowableModdle from '@/utils/flowableModdle'
import type { BpmnSummary, UserTaskSummary, SelectedElement } from '@/utils/bpmn'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'diagram-js-minimap/assets/diagram-js-minimap.css'
import '@/assets/styles/bpmn-theme.css'

const props = defineProps<{ xml: string }>()
const emit = defineEmits<{ select: [SelectedElement | null] }>()

/** bpmn-js businessObject 的最小形状 */
interface Bo {
  $type: string
  id: string
  name?: string
  assignee?: string
  candidateGroups?: string
  get?: (name: string) => unknown
  $attrs?: Record<string, unknown>
}
interface El {
  id: string
  type: string
  businessObject: Bo
  incoming?: unknown[]
  outgoing?: unknown[]
}

const containerRef = ref<HTMLDivElement>()
const zoom = ref(1)
const canUndo = ref(false)
const canRedo = ref(false)

// 非响应式实例(不进 ref/reactive,避免 Vue 代理 bpmn-js 内部对象)
let modeler: Modeler | null = null
let current: El | null = null
let errorIds: string[] = []

/**
 * 健壮读取 flowable 扩展属性:写入用限定名(flowable:assignee),回读形式因版本而异
 * (bo.get(限定名) / bo[本地名] / bo.$attrs[限定名]),依次兜底避免写后读空。
 */
function readFlowableAttr(bo: Bo, qualified: string, local: 'assignee' | 'candidateGroups'): string | undefined {
  const viaGet = typeof bo.get === 'function' ? bo.get(qualified) : undefined
  if (viaGet != null && viaGet !== '') return String(viaGet)
  const direct = bo[local]
  if (direct != null && direct !== '') return String(direct)
  const viaAttrs = bo.$attrs?.[qualified]
  if (viaAttrs != null && viaAttrs !== '') return String(viaAttrs)
  return undefined
}

function toSelected(el: El | null): SelectedElement | null {
  if (!el || !el.businessObject) return null
  const bo = el.businessObject
  return {
    id: bo.id,
    type: bo.$type,
    name: bo.name,
    assignee: readFlowableAttr(bo, 'flowable:assignee', 'assignee'),
    candidateGroups: readFlowableAttr(bo, 'flowable:candidateGroups', 'candidateGroups'),
  }
}

onMounted(async () => {
  if (!containerRef.value) return
  modeler = new Modeler({
    container: containerRef.value,
    additionalModules: [minimapModule],
    moddleExtensions: { flowable: flowableModdle },
  })

  modeler.on('selection.changed', (e: unknown) => {
    const sel = (e as { newSelection: El[] }).newSelection
    const el = sel && sel.length === 1 ? sel[0] : null
    current = el
    emit('select', toSelected(el))
  })
  modeler.on('element.changed', (e: unknown) => {
    const changed = (e as { element: El }).element
    if (current && changed && changed.id === current.id) {
      current = changed
      emit('select', toSelected(changed))
    }
    // 元素变更时清除该节点的错误高亮(用户正在修正),delete-safe
    if (modeler && changed && errorIds.includes(changed.id)) {
      const canvas = modeler.get<{ removeMarker: (id: string, cls: string) => void }>('canvas')
      const registry = modeler.get<{ get: (id: string) => unknown }>('elementRegistry')
      if (registry.get(changed.id)) canvas.removeMarker(changed.id, 'bpmn-error')
      errorIds = errorIds.filter((id) => id !== changed.id)
    }
  })
  modeler.on('canvas.viewbox.changed', (e: unknown) => {
    const scale = (e as { viewbox: { scale: number } }).viewbox?.scale
    if (typeof scale === 'number') zoom.value = scale
  })
  modeler.on('commandStack.changed', () => {
    if (!modeler) return
    const cs = modeler.get<{ canUndo: () => boolean; canRedo: () => boolean }>('commandStack')
    canUndo.value = cs.canUndo()
    canRedo.value = cs.canRedo()
  })

  try {
    await modeler.importXML(props.xml)
    const canvas = modeler.get<{ zoom: (m: string) => void }>('canvas')
    canvas.zoom('fit-viewport')
    const minimap = modeler.get<{ close: () => void }>('minimap')
    minimap.close()
  } catch (err) {
    console.error('[BpmnDesigner] importXML 失败', err)
  }
})

onBeforeUnmount(() => {
  modeler?.destroy()
  modeler = null
})

function getCanvas() {
  return modeler?.get<{ zoom: (s?: number | string, c?: string) => number }>('canvas')
}
function getStack() {
  return modeler?.get<{ undo: () => void; redo: () => void }>('commandStack')
}
function zoomBy(factor: number) {
  const canvas = getCanvas()
  if (!canvas) return
  canvas.zoom(canvas.zoom() * factor)
}
function fit() {
  getCanvas()?.zoom('fit-viewport')
}
function resetZoom() {
  getCanvas()?.zoom(1)
}
function undo() {
  getStack()?.undo()
}
function redo() {
  getStack()?.redo()
}

defineExpose({
  async getXML(): Promise<string> {
    if (!modeler) return props.xml
    const { xml } = await modeler.saveXML({ format: true })
    return xml ?? ''
  },
  getSummary(): BpmnSummary {
    const empty: BpmnSummary = { hasStart: false, hasEnd: false, userTasks: [], disconnectedCount: 0 }
    if (!modeler) return empty
    const registry = modeler.get<{ getAll: () => El[] }>('elementRegistry')
    const all = registry.getAll()
    let hasStart = false
    let hasEnd = false
    const userTasks: UserTaskSummary[] = []
    let disconnectedCount = 0
    for (const el of all) {
      const bo = el.businessObject
      const t = bo?.$type
      if (!t || t === 'bpmn:Process' || t === 'bpmn:Collaboration' || t === 'bpmn:SequenceFlow') continue
      if (!t.startsWith('bpmn:')) continue
      if (t === 'bpmn:StartEvent') hasStart = true
      if (t === 'bpmn:EndEvent') hasEnd = true
      if (t === 'bpmn:UserTask') {
        userTasks.push({
          id: bo.id,
          name: bo.name,
          assignee: readFlowableAttr(bo, 'flowable:assignee', 'assignee'),
          candidateGroups: readFlowableAttr(bo, 'flowable:candidateGroups', 'candidateGroups'),
        })
      }
      const inc = el.incoming?.length ?? 0
      const out = el.outgoing?.length ?? 0
      if (inc === 0 && out === 0) disconnectedCount++
    }
    return { hasStart, hasEnd, userTasks, disconnectedCount }
  },
  updateSelected(propsToSet: Record<string, unknown>) {
    if (!modeler || !current) return
    const modeling = modeler.get<{ updateProperties: (e: El, p: Record<string, unknown>) => void }>('modeling')
    modeling.updateProperties(current, propsToSet)
  },
  markErrors(ids: string[]) {
    if (!modeler) return
    const canvas = modeler.get<{
      addMarker: (id: string, cls: string) => void
      removeMarker: (id: string, cls: string) => void
    }>('canvas')
    const registry = modeler.get<{ get: (id: string) => unknown }>('elementRegistry')
    errorIds.forEach((id) => {
      if (registry.get(id)) canvas.removeMarker(id, 'bpmn-error')
    })
    const present = ids.filter((id) => registry.get(id))
    present.forEach((id) => canvas.addMarker(id, 'bpmn-error'))
    errorIds = present
  },
  clearErrors() {
    if (!modeler) return
    const canvas = modeler.get<{ removeMarker: (id: string, cls: string) => void }>('canvas')
    const registry = modeler.get<{ get: (id: string) => unknown }>('elementRegistry')
    errorIds.forEach((id) => {
      if (registry.get(id)) canvas.removeMarker(id, 'bpmn-error')
    })
    errorIds = []
  },
})
</script>

<style scoped>
.bpmn-designer {
  position: relative;
  height: 100%;
  width: 100%;
}
.bpmn-designer__canvas {
  height: 100%;
  width: 100%;
}
.bpmn-designer__toolbar {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  box-shadow: var(--el-box-shadow-light);
}
.bpmn-designer__zoom {
  min-width: 44px;
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}
</style>
```

- [ ] **Step 2: 类型检查 + 构建(首次真正引入 bpmn-js,验 Vite 解析)**

Run: `pnpm typecheck && pnpm build`
Expected: 0 错误 / build ✓。**若 bpmn-js ESM 在 rolldown 下报解析错,优先排查(见 [[vue3-env-gotchas]]):可在 vite.config 的 optimizeDeps.include 加 'bpmn-js/lib/Modeler' 或给 manualChunks 加 bpmn 档。** 解决后再继续。

- [ ] **Step 3: Commit**

```bash
git add src/views/workflow/model/BpmnDesigner.vue
git commit -m "✨ feat(vue3): 3a BpmnDesigner 组件(vanilla bpmn-js 包装+命令式句柄+工具栏)"
```

---

## Task 6: PropertiesPanel.vue

**Files:**
- Create: `src/views/workflow/model/PropertiesPanel.vue`

- [ ] **Step 1: 写 `src/views/workflow/model/PropertiesPanel.vue`**

```vue
<template>
  <div v-if="!element" class="pp pp--empty">请选择左侧节点进行配置</div>
  <div v-else class="pp">
    <div class="pp__head">
      <p class="pp__title">节点属性</p>
      <p class="pp__type">{{ element.type }}</p>
    </div>

    <div class="pp__field">
      <label class="pp__label">节点名称</label>
      <el-input v-model="name" placeholder="节点名称" @blur="emit('changeName', name)" />
    </div>

    <template v-if="isUserTask">
      <div class="pp__field">
        <label class="pp__label">办理人</label>
        <el-radio-group v-model="assigneeType" @change="onTypeChange">
          <el-radio value="initiator">流程发起人</el-radio>
          <el-radio value="candidate">候选组(按角色)</el-radio>
        </el-radio-group>
      </div>
      <div v-if="assigneeType === 'candidate'" class="pp__field">
        <label class="pp__label">角色</label>
        <el-select v-model="roleCode" placeholder="选择角色" style="width: 100%" @change="onRoleChange">
          <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.code" />
        </el-select>
      </div>
    </template>
    <p v-else class="pp__hint">该节点无需配置办理人</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SelectedElement, AssigneeType } from '@/utils/bpmn'
import type { SysRole } from '@/types/system'

const props = defineProps<{
  element: SelectedElement | null
  roles: SysRole[]
}>()

const emit = defineEmits<{
  changeName: [string]
  changeAssignee: [AssigneeType, string?]
}>()

const name = ref('')
const assigneeType = ref<AssigneeType>('initiator')
const roleCode = ref('')

const isUserTask = computed(() => props.element?.type === 'bpmn:UserTask')

function deriveType(el: SelectedElement | null): AssigneeType {
  return el?.candidateGroups ? 'candidate' : 'initiator'
}

// 选中元素变化时同步本地受控态
watch(
  () => props.element,
  (el) => {
    name.value = el?.name ?? ''
    assigneeType.value = deriveType(el)
    roleCode.value = el?.candidateGroups ?? ''
  },
  { immediate: true },
)

function onTypeChange(v: string | number | boolean | undefined) {
  const t = v as AssigneeType
  emit('changeAssignee', t, t === 'candidate' ? roleCode.value || undefined : undefined)
}
function onRoleChange(v: string) {
  emit('changeAssignee', 'candidate', v)
}
</script>

<style scoped>
.pp {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px;
}
.pp--empty {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
.pp__title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--el-text-color-secondary);
  margin: 0;
}
.pp__type {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.pp__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pp__label {
  font-size: 13px;
  font-weight: 500;
}
.pp__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 3: Commit**

```bash
git add src/views/workflow/model/PropertiesPanel.vue
git commit -m "✨ feat(vue3): 3a 节点属性面板(名称+办理人 发起人/候选组角色)"
```

---

## Task 7: BpmnDesignerDialog.vue(全屏设计器弹窗)

**Files:**
- Create: `src/views/workflow/model/BpmnDesignerDialog.vue`

> 镜像 mes-new `ModelDesignerDialog.tsx`:`el-dialog fullscreen destroy-on-close`,打开时 `modelGet` 取 xml(ignore 守卫),左 `BpmnDesigner`(`v-if="xml"` + `:key="modelId"` 重挂载)右 `PropertiesPanel`,顶部校验/保存。

- [ ] **Step 1: 写 `src/views/workflow/model/BpmnDesignerDialog.vue`**

```vue
<template>
  <el-dialog
    :model-value="modelValue"
    fullscreen
    destroy-on-close
    :show-close="true"
    class="bpmn-dialog"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <template #header>
      <div class="bpmn-dialog__header">
        <span class="bpmn-dialog__title">流程模型设计{{ meta ? ` — ${meta.name}` : '' }}</span>
        <div class="bpmn-dialog__actions">
          <el-button size="small" @click="handleValidate">检查定义</el-button>
          <el-button size="small" type="primary" :loading="saving" @click="handleSave">保存</el-button>
        </div>
      </div>
    </template>

    <div class="bpmn-dialog__body">
      <div class="bpmn-dialog__canvas">
        <BpmnDesigner v-if="xml" :key="modelId ?? ''" ref="designerRef" :xml="xml" @select="onSelect" />
      </div>
      <div class="bpmn-dialog__panel">
        <PropertiesPanel
          :element="selected"
          :roles="roles"
          @change-name="onChangeName"
          @change-assignee="onChangeAssignee"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import BpmnDesigner from './BpmnDesigner.vue'
import PropertiesPanel from './PropertiesPanel.vue'
import { modelGet, modelSave } from '@/api/workflow/model'
import { rolePage } from '@/api/system/role'
import { validateSummary, errorTaskIds, buildAssigneeProps } from '@/utils/bpmn'
import type { SelectedElement, AssigneeType, BpmnSummary } from '@/utils/bpmn'
import type { SysRole } from '@/types/system'

const props = defineProps<{ modelValue: boolean; modelId: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

type DesignerExposed = {
  getXML: () => Promise<string>
  getSummary: () => BpmnSummary
  updateSelected: (p: Record<string, unknown>) => void
  markErrors: (ids: string[]) => void
  clearErrors: () => void
}

const designerRef = ref<DesignerExposed | null>(null)
const selected = ref<SelectedElement | null>(null)
const xml = ref<string | null>(null)
const meta = ref<{ name: string; modelKey: string } | null>(null)
const roles = ref<SysRole[]>([])
const saving = ref(false)

// 打开时加载该模型 xml + 角色;modelId 变化/关闭时用 watch 第三参 onCleanup 置 ignore 丢弃在途响应
watch(
  () => [props.modelValue, props.modelId] as const,
  ([open, id], _old, onCleanup) => {
    if (!open || !id) {
      xml.value = null
      meta.value = null
      selected.value = null
      return
    }
    let ignore = false
    onCleanup(() => {
      ignore = true
    })
    modelGet(id)
      .then((m) => {
        if (ignore) return
        if (m) {
          xml.value = m.bpmnXml
          meta.value = { name: m.name, modelKey: m.modelKey }
        } else {
          ElMessage.error('模型不存在')
          emit('update:modelValue', false)
        }
      })
      .catch(() => {
        /* 拦截器已提示 */
      })
    rolePage({ current: 1, size: 100 })
      .then((r) => {
        if (!ignore) roles.value = r?.records ?? []
      })
      .catch(() => {
        /* 拦截器已提示 */
      })
  },
  { immediate: true },
)

function onSelect(el: SelectedElement | null) {
  selected.value = el
}
function onChangeName(name: string) {
  designerRef.value?.updateSelected({ name })
}
function onChangeAssignee(type: AssigneeType, roleCode?: string) {
  designerRef.value?.updateSelected(buildAssigneeProps(type, roleCode))
}

async function handleSave() {
  if (!props.modelId || !meta.value || !designerRef.value) return
  saving.value = true
  try {
    const out = await designerRef.value.getXML()
    await modelSave({ id: props.modelId, modelKey: meta.value.modelKey, name: meta.value.name, bpmnXml: out })
    ElMessage.success('已保存')
    emit('saved')
  } catch {
    /* 拦截器已提示 */
  } finally {
    saving.value = false
  }
}

function handleValidate() {
  if (!designerRef.value) return
  const summary = designerRef.value.getSummary()
  const result = validateSummary(summary)
  designerRef.value.clearErrors()
  if (result.ok) {
    ElMessage.success('校验通过:流程定义完整')
  } else {
    designerRef.value.markErrors(errorTaskIds(summary))
    ElMessage.error(`校验未通过:${result.issues.join('；')}`)
  }
}
</script>

<style scoped>
.bpmn-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 32px;
}
.bpmn-dialog__title {
  font-size: 16px;
  font-weight: 600;
}
.bpmn-dialog__actions {
  display: flex;
  gap: 8px;
}
.bpmn-dialog__body {
  display: flex;
  height: calc(100vh - 110px);
}
.bpmn-dialog__canvas {
  flex: 1;
  min-width: 0;
  background: var(--el-fill-color-lighter);
}
.bpmn-dialog__panel {
  width: 288px;
  flex-shrink: 0;
  overflow-y: auto;
  border-left: 1px solid var(--el-border-color);
}
</style>
<style>
.bpmn-dialog .el-dialog__body {
  padding: 0;
}
</style>
```

- [ ] **Step 2: 类型检查 + 构建**

Run: `pnpm typecheck && pnpm build`
Expected: 0 错误 / build ✓。

- [ ] **Step 3: Commit**

```bash
git add src/views/workflow/model/BpmnDesignerDialog.vue
git commit -m "✨ feat(vue3): 3a 全屏设计器弹窗(取数+校验高亮+保存,装 designer+属性面板)"
```

---

## Task 8: ModelCreateDialog.vue + PublishDialog.vue

**Files:**
- Create: `src/views/workflow/model/ModelCreateDialog.vue`
- Create: `src/views/workflow/model/PublishDialog.vue`

- [ ] **Step 1: 写 `src/views/workflow/model/ModelCreateDialog.vue`**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    title="创建流程模型"
    width="520px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-form-item label="模型名称" prop="name">
        <el-input v-model="form.name" placeholder="如 生产订单审批流程" clearable />
      </el-form-item>
      <el-form-item label="模型 key" prop="modelKey">
        <el-input v-model="form.modelKey" placeholder="如 orderRecord(字母开头)" clearable />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { modelSave } from '@/api/workflow/model'
import { initialBpmnXml } from '@/utils/bpmn'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; created: [string] }>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ name: '', modelKey: '' })

const rules: FormRules = {
  name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  modelKey: [
    { required: true, message: '请输入模型 key', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      message: '以字母开头,仅含字母/数字/下划线',
      trigger: 'blur',
    },
  ],
}

// 打开时重置
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.name = ''
      form.modelKey = ''
    }
  },
)

async function handleSubmit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    const id = await modelSave({
      name: form.name,
      modelKey: form.modelKey,
      bpmnXml: initialBpmnXml(form.modelKey, form.name),
    })
    ElMessage.success('已创建模型')
    emit('update:modelValue', false)
    emit('created', id)
  } catch {
    /* 拦截器已提示 */
  } finally {
    loading.value = false
  }
}
</script>
```

- [ ] **Step 2: 写 `src/views/workflow/model/PublishDialog.vue`**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    title="发布流程模型"
    width="480px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <p class="publish__desc">将「{{ model?.name }}」发布到指定流程分类下</p>
    <el-form label-width="80px">
      <el-form-item label="流程分类">
        <el-select v-model="categoryCode" placeholder="选择分类" style="width: 100%">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.code" />
        </el-select>
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { categoryList } from '@/api/workflow/category'
import { modelPublish } from '@/api/workflow/model'
import type { WorkflowCategory, WorkflowModel } from '@/types/workflow'

const props = defineProps<{ modelValue: boolean; model: WorkflowModel | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; published: [] }>()

const categories = ref<WorkflowCategory[]>([])
const categoryCode = ref('')
const loading = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    categoryCode.value = props.model?.categoryCode ?? ''
    categoryList()
      .then((list) => {
        categories.value = list ?? []
      })
      .catch(() => {
        /* 拦截器已提示 */
      })
  },
)

async function handleSubmit() {
  if (!props.model) return
  if (!categoryCode.value) {
    ElMessage.error('请选择流程分类')
    return
  }
  const cat = categories.value.find((c) => c.code === categoryCode.value)
  if (!cat) {
    ElMessage.error('分类不存在')
    return
  }
  loading.value = true
  try {
    await modelPublish({ id: props.model.id, categoryCode: cat.code, categoryName: cat.name })
    ElMessage.success('发布成功')
    emit('update:modelValue', false)
    emit('published')
  } catch {
    /* 拦截器已提示 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.publish__desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
```

- [ ] **Step 3: 类型检查**

Run: `pnpm typecheck`
Expected: 0 错误。

- [ ] **Step 4: Commit**

```bash
git add src/views/workflow/model/ModelCreateDialog.vue src/views/workflow/model/PublishDialog.vue
git commit -m "✨ feat(vue3): 3a 新建模型弹窗 + 发布弹窗(选分类)"
```

---

## Task 9: ModelList.vue + 路由 + urlMap

**Files:**
- Create: `src/views/workflow/model/ModelList.vue`
- Modify: `src/utils/urlMap.ts`
- Modify: `src/router/index.ts`

- [ ] **Step 1: 写 `src/views/workflow/model/ModelList.vue`**

```vue
<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="模型名称">
        <el-input v-model="search.name" placeholder="请输入名称" clearable />
      </el-form-item>
      <el-form-item label="模型 key">
        <el-input v-model="search.modelKey" placeholder="请输入 key" clearable />
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
        <el-button v-permission="'workflow:model:list'" type="primary" :icon="Plus" @click="createVisible = true">
          新建模型
        </el-button>
      </template>

      <template #col-status="{ row }">
        <el-tag :type="(row as WorkflowModel).status === 'PUBLISHED' ? 'success' : 'info'" effect="plain">
          {{ (row as WorkflowModel).status === 'PUBLISHED' ? '已发布' : '草稿' }}
        </el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openDesigner(row as WorkflowModel)">设计</el-button>
        <el-button type="success" link size="small" @click="openPublish(row as WorkflowModel)">发布</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as WorkflowModel)">删除</el-button>
      </template>
    </DataTable>

    <ModelCreateDialog v-model="createVisible" @created="onCreated" />
    <BpmnDesignerDialog v-model="designerVisible" :model-id="designId" @saved="run" />
    <PublishDialog v-model="publishVisible" :model="publishing" @published="run" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ModelCreateDialog from './ModelCreateDialog.vue'
import BpmnDesignerDialog from './BpmnDesignerDialog.vue'
import PublishDialog from './PublishDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { modelPage, modelDelete } from '@/api/workflow/model'
import type { WorkflowModel } from '@/types/workflow'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ name: '', modelKey: '' })

const { data: pageData, loading, run } = useRequest(
  () => modelPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<WorkflowModel[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'name', label: '模型名称', minWidth: 160 },
  { prop: 'modelKey', label: '模型 key', width: 160 },
  { prop: 'status', label: '状态', width: 90 },
  { prop: 'version', label: '版本', width: 70 },
  { prop: 'categoryName', label: '分类', minWidth: 120 },
  { prop: 'updateTime', label: '更新时间', width: 170 },
]

const createVisible = ref(false)
const designerVisible = ref(false)
const designId = ref<string | null>(null)
const publishVisible = ref(false)
const publishing = ref<WorkflowModel | null>(null)

function openDesigner(row: WorkflowModel) {
  designId.value = row.id
  designerVisible.value = true
}
function onCreated(id: string) {
  designId.value = id
  designerVisible.value = true
  run()
}
function openPublish(row: WorkflowModel) {
  publishing.value = row
  publishVisible.value = true
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
  search.name = ''
  search.modelKey = ''
  reset()
  run()
}

async function handleDelete(row: WorkflowModel) {
  try {
    await ElMessageBox.confirm(`确认删除模型「${row.name}」?已发布将级联清理派生的流程定义。`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await modelDelete(row.id)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
```

- [ ] **Step 2: urlMap — `src/utils/urlMap.ts`**

把这两行(占位注释)替换:
```ts
  '/workflow/definition/list-ui': '/workflow/definition',
  // 注:'/workflow/model/list-ui'(菜单 192 流程模型设计)本周期不做,Cycle 3 补 bpmn-js 设计器
```
为:
```ts
  '/workflow/definition/list-ui': '/workflow/definition',
  '/workflow/model/list-ui': '/workflow/model',
```

- [ ] **Step 3: router — `src/router/index.ts`**

在 `workflow/definition` 路由对象之后插入:
```ts
      {
        path: 'workflow/model',
        name: 'workflow-model',
        component: () => import('@/views/workflow/model/ModelList.vue'),
        meta: { title: '流程模型设计', perm: 'workflow:model:list' },
      },
```

- [ ] **Step 4: 类型检查 + 构建**

Run: `pnpm typecheck && pnpm build`
Expected: 0 错误 / build ✓(确认 bpmn-js 进入 workflow/model 路由独立 chunk)。

- [ ] **Step 5: Commit**

```bash
git add src/views/workflow/model/ModelList.vue src/utils/urlMap.ts src/router/index.ts
git commit -m "✨ feat(vue3): 3a 流程模型列表页 + 路由 + urlMap(/workflow/model)"
```

---

## Task 10: 后端审查 + 全门禁 + ROADMAP

**Files:**
- Modify: `mes/vue3/docs/ROADMAP.md`
- (后端仅在发现暴露 bug 时改动)

- [ ] **Step 1: 后端审查(按 [[backend-deepseek-review-each-cycle]])**

读 `mes/src/main/java/com/wangziyang/mes/workflow/controller/WorkflowModelController.java` + `ISpWorkflowModelService`/impl + `ISpWorkflowDefinitionService`/impl + `ISpWorkflowEventRuleService`,复核:
- `save` 唯一性 `.ne(id)` 排除自身 + 有 id 仅更新 name/key/xml(保留 status/version/分类)。
- `publish` upsert 定义 `def.id=model.id` + 新建 `enabled=true` + 同步 processKey/Name/分类/version。
- `delete` `@Transactional` 级联清定义 + 事件规则(def.id=model.id)。
- `page` LIKE + update_time 倒序。

mes-new 周期 2n 已对同份后端端到端 curl 验证全过。若发现暴露 bug → 最小纯新增修正 + Mockito 守卫单测;否则记 backlog。

- [ ] **Step 2: 前端全门禁**

Run: `pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: typecheck 0 / test 全绿(较 293 上升约 +12) / lint 0 err(允许既有 5 warn) / build ✓(bpmn-js 独立 chunk)。

- [ ] **Step 3: 更新 ROADMAP**

`mes/vue3/docs/ROADMAP.md`:
- §9.8 矩阵「BPMN 模型设计器(bpmn-js)」`C3 | ☐` → `C3·3a | ✅`。
- §8 Cycle 3 段补 3a 完成条目(参考 2c 条目风格:分支/交付/沉淀/新依赖/后端审查结论/菜单/门禁数/backlog/人工冒烟待确认),并标注 Cycle 3 拆 3a(BPMN)/3b(动态主数据)/3c(工序内容+工艺查询)。
- §11 进度快照补 3a 一行。

- [ ] **Step 4: Commit**

```bash
git add mes/vue3/docs/ROADMAP.md
git commit -m "📝 docs(vue3): ROADMAP 标记 3a BPMN 模型设计器完成"
```

---

## 验证清单(完成全部任务后)

- [ ] 前端门禁全绿:`pnpm typecheck`(0) / `pnpm test`(全绿) / `pnpm lint:check`(0 err) / `pnpm build`(✓,bpmn-js 独立 chunk)
- [ ] 后端 `mvn compile`(若有改动)+ 守卫单测绿
- [ ] subagent 驱动逐任务两阶段审查 + 后端独立审查 + opus 整体终审
- [ ] **人工 :4200 冒烟(用户确认)**:后端 9090 + DB 已跑 `workflow-config-tables.sql` + `workflow-flow-config.sql`,`admin/123` 登录 → 流程配置工具 → 流程模型设计:
  - 新建模型(名称+key)→ 自动进设计器 → 拖入用户任务、连开始→任务→结束、配办理人(发起人/候选组角色)→ 检查定义(故意漏结束/办理人 → 红色脉冲高亮 + toast)→ 修正后校验通过 → 保存 → 列表状态草稿
  - 发布到分类 → 状态变已发布 → 切到流程定义页确认该定义出现(processKey/分类正确)
  - 删除已发布模型 → 流程定义页对应定义消失(级联)

## backlog(预登记)

- CustomRenderer 自绘节点(语义配色,视觉深化)——`bpmnTheme.ts` 待其落地再移植。
- bpmn-js d.ts 为手写最小声明,`getXML` 已加 `?? ''` 兜底(对齐 mes-new 2m-backlog)。
- `getSummary` 把「仅开始事件」空模型算 1 个孤立节点(校验提示略噪,仅 toast 不阻断)。
- 后端运行时(实例/任务/事件真正触发)留将来周期。
- 模型 version 仅后端自增占位,无版本历史 UI。
</content>
