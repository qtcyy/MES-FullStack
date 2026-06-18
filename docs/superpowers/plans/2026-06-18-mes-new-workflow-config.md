# 流程配置工具（流程管理）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/mes-new` 新增"流程配置工具"模块的两个前端页面——流程分类管理（CRUD）+ 流程模型设计（bpmn-js 设计器 + 校验 + 发布），数据走可拔插的 localStorage mock 层。

**Architecture:** 纯前端。`api/workflow/*` 是 mock 适配层（localStorage 持久化 + 返回 rxjs Observable），接口签名按下周期真后端契约设计，页面用既有 `useQuery$/useMutation$` 写法不变。BPMN 设计器用 bpmn-js（vanilla）包成 React 组件 `BpmnDesigner`，自研属性面板写 `flowable:assignee/candidateGroups`。校验拆为「薄取数 glue（从 modeler 抽 summary）+ 纯函数 `validateSummary`」，纯函数 TDD 跑在 vitest node 环境。

**Tech Stack:** React 19 + TS + Vite + @workspace/ui(shadcn/Radix) + react-hook-form + zod + 自研 `useQuery$/useMutation$`(@ngify/http + rxjs) + bpmn-js。

**关键约定（实现者必读）：**
- 当前活跃前端**只在** `mes/frontend/apps/mes-new`，**不要碰** `apps/mes1`。
- 侧边栏 `AppSidebar` **只渲染两级菜单**（顶层分组名 + 直接子项），不递归孙级 → 菜单做两级。
- 表单**凡是字段名可能撞 DOM 属性**或动态字段，一律用普通 `useState` 受控，不要 RHF（见 rhf-field-name-dom-clobbering 教训）。本计划：CategoryForm 字段名固定安全，用 RHF；PropertiesPanel/Designer 用 useState。
- 写端点用 `JSON_HEADERS`；本周期是 mock，但 api 函数签名/编码注释要按真后端契约写好。
- 提交信息用中文，遵循仓库 emoji 风格。
- 所有命令在 `mes/frontend`（pnpm workspace 根）执行，用 `--filter mes-new`。

**文件结构总览：**
```
mes/frontend/apps/mes-new/src/
├── types/workflow.ts                         # T1
├── types/bpmn-js.d.ts                         # T1 (bpmn-js + *.css 环境声明)
├── api/workflow/mockStore.ts                  # T2 (paginate 纯函数 + localStorage + ok())
├── api/workflow/__tests__/mockStore.test.ts   # T2
├── api/workflow/category.ts                   # T3
├── api/workflow/model.ts                      # T3
├── pages/workflow/category/CategoryForm.tsx   # T5
├── pages/workflow/category/CategoryList.tsx   # T5
├── pages/workflow/model/bpmnUtils.ts          # T4
├── pages/workflow/model/__tests__/bpmnUtils.test.ts  # T4
├── pages/workflow/model/flowableModdle.ts     # T4
├── pages/workflow/model/BpmnDesigner.tsx      # T6
├── pages/workflow/model/PropertiesPanel.tsx   # T7
├── pages/workflow/model/ModelCreateDialog.tsx # T8
├── pages/workflow/model/PublishDialog.tsx     # T8
├── pages/workflow/model/ModelDesignerDialog.tsx # T8
├── pages/workflow/model/ModelList.tsx         # T8
├── utils/urlMap.ts (改)                        # T5/T8
├── layouts/routeMeta.ts (改)                   # T5/T8
└── router.tsx (改)                             # T5/T8
scripts/sql/workflow-flow-config.sql           # T9
```

---

## Task 1: 依赖、类型、环境声明

**Files:**
- Modify: `mes/frontend/apps/mes-new/package.json`（由 pnpm add 写入）
- Create: `mes/frontend/apps/mes-new/src/types/workflow.ts`
- Create: `mes/frontend/apps/mes-new/src/types/bpmn-js.d.ts`

- [ ] **Step 1: 安装 bpmn-js**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new add bpmn-js
```
Expected: 写入 `apps/mes-new/package.json` dependencies，pnpm 安装成功无报错。

- [ ] **Step 2: 写类型 `types/workflow.ts`**

```ts
/** 流程分类 */
export interface WorkflowCategory {
  id: string
  code: string
  name: string
  descr?: string
  createTime?: string
}

export type WorkflowModelStatus = 'DRAFT' | 'PUBLISHED'

/** 流程模型(含 BPMN XML) */
export interface WorkflowModel {
  id: string
  modelKey: string
  name: string
  categoryCode?: string
  categoryName?: string
  bpmnXml: string
  status: WorkflowModelStatus
  version: number
  createTime?: string
  updateTime?: string
}
```

- [ ] **Step 3: 写环境声明 `types/bpmn-js.d.ts`**

> 说明：bpmn-js 的 TS 类型不完整，且 `import 'x.css'` 副作用导入需 `*.css` 声明。先写最小声明保证 tsc 通过。

```ts
declare module 'bpmn-js/lib/Modeler' {
  export interface ImportResult {
    warnings: unknown[]
  }
  export interface SaveResult {
    xml: string
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

declare module '*.css'
```

- [ ] **Step 4: 验证类型编译**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit
```
Expected: PASS（0 error）。

> 若报 `*.css` 重复声明（项目已有 vite/client 提供），删除 `declare module '*.css'` 这一行后重跑；若 bpmn-js 自带类型与本声明冲突报 duplicate，则删除整个 `declare module 'bpmn-js/lib/Modeler'` 块、改用其自带类型。以 tsc 0 error 为准。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/package.json mes/frontend/pnpm-lock.yaml mes/frontend/apps/mes-new/src/types/workflow.ts mes/frontend/apps/mes-new/src/types/bpmn-js.d.ts && git commit -m "✨ feat(mes-new): 流程管理类型 + bpmn-js 依赖与环境声明"
```

---

## Task 2: Mock 数据层基座（paginate 纯函数 + localStorage）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/api/workflow/mockStore.ts`
- Test: `mes/frontend/apps/mes-new/src/api/workflow/__tests__/mockStore.test.ts`

- [ ] **Step 1: 写 failing test `__tests__/mockStore.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { paginate } from '../mockStore'

describe('paginate', () => {
  const data = Array.from({ length: 13 }, (_, i) => i + 1)

  it('第一页按 size 切片,pages 向上取整', () => {
    const r = paginate(data, 1, 5)
    expect(r.records).toEqual([1, 2, 3, 4, 5])
    expect(r.total).toBe(13)
    expect(r.size).toBe(5)
    expect(r.current).toBe(1)
    expect(r.pages).toBe(3)
  })

  it('末页只返回剩余记录', () => {
    expect(paginate(data, 3, 5).records).toEqual([11, 12, 13])
  })

  it('current 超出范围被夹到末页', () => {
    expect(paginate(data, 99, 5).current).toBe(3)
  })

  it('current 小于 1 被夹到第一页', () => {
    expect(paginate(data, 0, 5).current).toBe(1)
  })

  it('空数据返回 total=0/pages=1/records=[]', () => {
    const r = paginate([], 1, 5)
    expect(r.records).toEqual([])
    expect(r.total).toBe(0)
    expect(r.pages).toBe(1)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec vitest run src/api/workflow/__tests__/mockStore.test.ts
```
Expected: FAIL（`Cannot find module '../mockStore'`）。

- [ ] **Step 3: 写实现 `mockStore.ts`**

```ts
import { of, type Observable } from 'rxjs'
import type { PageResult } from '@/types/api'

/** 生成无连字符 id(对齐后端雪花串风格) */
export function genId(): string {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
  return uuid.replace(/-/g, '')
}

/** 当前时间 'YYYY-MM-DD HH:mm:ss' */
export function nowStr(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

export function writeList<T>(key: string, list: T[]): void {
  localStorage.setItem(key, JSON.stringify(list))
}

/** 纯函数:内存分页切片(current 为 1 基,越界自动夹紧) */
export function paginate<T>(all: T[], current: number, size: number): PageResult<T> {
  const total = all.length
  const pages = Math.max(1, Math.ceil(total / size))
  const safeCurrent = Math.min(Math.max(1, current), pages)
  const start = (safeCurrent - 1) * size
  return {
    records: all.slice(start, start + size),
    total,
    size,
    current: safeCurrent,
    pages,
  }
}

/** 把同步结果包成 Observable,模仿真 http 解包后的返回形态 */
export function ok<T>(data: T): Observable<T> {
  return of(data)
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec vitest run src/api/workflow/__tests__/mockStore.test.ts
```
Expected: PASS（5 个用例全绿）。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/api/workflow/mockStore.ts mes/frontend/apps/mes-new/src/api/workflow/__tests__/mockStore.test.ts && git commit -m "✨ feat(mes-new): 流程 mock 数据层基座(paginate 纯函数 TDD + localStorage)"
```

---

## Task 3: 流程分类 / 流程模型 mock API

**Files:**
- Create: `mes/frontend/apps/mes-new/src/api/workflow/category.ts`
- Create: `mes/frontend/apps/mes-new/src/api/workflow/model.ts`

- [ ] **Step 1: 写 `category.ts`**

```ts
import type { Observable } from 'rxjs'
import type { PageResult } from '@/types/api'
import type { WorkflowCategory } from '@/types/workflow'
import { ok, readList, writeList, paginate, genId, nowStr } from './mockStore'

// 下周期真后端:POST /workflow/category/* (page/add-or-update form 编码;delete/list 见各注)
const KEY = 'wf_categories'

export interface CategoryPageParams {
  current: number
  size: number
  code?: string
  name?: string
}

/** 分类分页(真后端 form 编码) */
export function categoryPage(params: CategoryPageParams): Observable<PageResult<WorkflowCategory>> {
  let all = readList<WorkflowCategory>(KEY)
  if (params.code) all = all.filter((c) => c.code.includes(params.code!))
  if (params.name) all = all.filter((c) => c.name.includes(params.name!))
  all = [...all].sort((a, b) => (b.createTime ?? '').localeCompare(a.createTime ?? ''))
  return ok(paginate(all, params.current, params.size))
}

/** 全部分类(发布弹窗下拉用;真后端 POST /workflow/category/list) */
export function categoryList(): Observable<WorkflowCategory[]> {
  return ok(readList<WorkflowCategory>(KEY))
}

/** 新增/编辑(真后端 form 编码;空 id 走新增) */
export function categoryAddOrUpdate(record: WorkflowCategory): Observable<string> {
  const all = readList<WorkflowCategory>(KEY)
  if (record.id) {
    const idx = all.findIndex((c) => c.id === record.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...record }
    writeList(KEY, all)
    return ok(record.id)
  }
  const id = genId()
  all.push({ ...record, id, createTime: nowStr() })
  writeList(KEY, all)
  return ok(id)
}

/** 删除(真后端 JSON {id}) */
export function categoryDelete(id: string): Observable<void> {
  writeList(
    KEY,
    readList<WorkflowCategory>(KEY).filter((c) => c.id !== id),
  )
  return ok(undefined as unknown as void)
}
```

- [ ] **Step 2: 写 `model.ts`**

```ts
import type { Observable } from 'rxjs'
import type { PageResult } from '@/types/api'
import type { WorkflowModel } from '@/types/workflow'
import { ok, readList, writeList, paginate, genId, nowStr } from './mockStore'

// 下周期真后端:POST /workflow/model/* (XML 体大,save/delete/publish 走 JSON)
const KEY = 'wf_models'

export interface ModelPageParams {
  current: number
  size: number
  name?: string
  modelKey?: string
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

/** 模型分页(真后端 form 编码) */
export function modelPage(params: ModelPageParams): Observable<PageResult<WorkflowModel>> {
  let all = readList<WorkflowModel>(KEY)
  if (params.name) all = all.filter((m) => m.name.includes(params.name!))
  if (params.modelKey) all = all.filter((m) => m.modelKey.includes(params.modelKey!))
  all = [...all].sort((a, b) => (b.updateTime ?? '').localeCompare(a.updateTime ?? ''))
  return ok(paginate(all, params.current, params.size))
}

/** 取单个模型(含 bpmnXml;真后端 GET /workflow/model/{id}) */
export function modelGet(id: string): Observable<WorkflowModel | undefined> {
  return ok(readList<WorkflowModel>(KEY).find((m) => m.id === id))
}

/** 新建/保存设计(真后端 JSON;空 id 走新建,状态 DRAFT) */
export function modelSave(dto: ModelSaveDTO): Observable<string> {
  const all = readList<WorkflowModel>(KEY)
  const ts = nowStr()
  if (dto.id) {
    const idx = all.findIndex((m) => m.id === dto.id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], name: dto.name, modelKey: dto.modelKey, bpmnXml: dto.bpmnXml, updateTime: ts }
    }
    writeList(KEY, all)
    return ok(dto.id)
  }
  const id = genId()
  all.push({
    id,
    modelKey: dto.modelKey,
    name: dto.name,
    bpmnXml: dto.bpmnXml,
    status: 'DRAFT',
    version: 1,
    createTime: ts,
    updateTime: ts,
  })
  writeList(KEY, all)
  return ok(id)
}

/** 删除(真后端 JSON {id}) */
export function modelDelete(id: string): Observable<void> {
  writeList(
    KEY,
    readList<WorkflowModel>(KEY).filter((m) => m.id !== id),
  )
  return ok(undefined as unknown as void)
}

/** 发布到分类(真后端 JSON;置 PUBLISHED + 回填分类) */
export function modelPublish(dto: ModelPublishDTO): Observable<void> {
  const all = readList<WorkflowModel>(KEY)
  const idx = all.findIndex((m) => m.id === dto.id)
  if (idx >= 0) {
    all[idx] = {
      ...all[idx],
      status: 'PUBLISHED',
      categoryCode: dto.categoryCode,
      categoryName: dto.categoryName,
      updateTime: nowStr(),
    }
    writeList(KEY, all)
  }
  return ok(undefined as unknown as void)
}
```

- [ ] **Step 3: 验证类型编译**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit
```
Expected: PASS（0 error）。

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/api/workflow/category.ts mes/frontend/apps/mes-new/src/api/workflow/model.ts && git commit -m "✨ feat(mes-new): 流程分类/模型 mock API(签名对齐下周期真后端契约)"
```

---

## Task 4: BPMN 纯函数（bpmnUtils）+ Flowable moddle

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/workflow/model/bpmnUtils.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/workflow/model/__tests__/bpmnUtils.test.ts`
- Create: `mes/frontend/apps/mes-new/src/pages/workflow/model/flowableModdle.ts`

- [ ] **Step 1: 写 failing test `__tests__/bpmnUtils.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { initialBpmnXml, validateSummary, buildAssigneeProps, type BpmnSummary } from '../bpmnUtils'

describe('initialBpmnXml', () => {
  it('process id=modelKey、含 name 与开始事件', () => {
    const xml = initialBpmnXml('orderRecord', '生产订单审批流程')
    expect(xml).toContain('id="orderRecord"')
    expect(xml).toContain('name="生产订单审批流程"')
    expect(xml).toContain('bpmn:startEvent')
    expect(xml).toContain('xmlns:flowable')
  })
  it('转义 name 中的双引号', () => {
    expect(initialBpmnXml('k', 'a"b')).toContain('name="a&quot;b"')
  })
})

const fullSummary: BpmnSummary = {
  hasStart: true,
  hasEnd: true,
  userTasks: [
    { id: 'UserTask_1', name: '计划员发起', assignee: '${initiator}' },
    { id: 'UserTask_2', name: '生产主管审批', candidateGroups: 'prod_manager' },
  ],
  disconnectedCount: 0,
}

describe('validateSummary', () => {
  it('完整定义 → ok,无问题', () => {
    const r = validateSummary(fullSummary)
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([])
  })
  it('缺开始/结束 → 报对应问题', () => {
    const r = validateSummary({ ...fullSummary, hasStart: false, hasEnd: false })
    expect(r.ok).toBe(false)
    expect(r.issues).toContain('缺少开始事件')
    expect(r.issues).toContain('缺少结束事件')
  })
  it('无用户任务 → 报问题', () => {
    const r = validateSummary({ ...fullSummary, userTasks: [] })
    expect(r.issues).toContain('至少需要一个用户任务节点')
  })
  it('用户任务未命名/未配办理人 → 报问题', () => {
    const r = validateSummary({
      ...fullSummary,
      userTasks: [{ id: 'UserTask_9' }],
    })
    expect(r.issues).toContain('用户任务「UserTask_9」未命名')
    expect(r.issues).toContain('用户任务「UserTask_9」未配置办理人')
  })
  it('有孤立节点 → 报数量', () => {
    expect(validateSummary({ ...fullSummary, disconnectedCount: 2 }).issues).toContain(
      '存在 2 个未连接的节点',
    )
  })
})

describe('buildAssigneeProps', () => {
  it('流程发起人 → assignee=${initiator},清空候选组', () => {
    expect(buildAssigneeProps('initiator')).toEqual({
      'flowable:assignee': '${initiator}',
      'flowable:candidateGroups': undefined,
    })
  })
  it('候选组 → candidateGroups=角色code,清空 assignee', () => {
    expect(buildAssigneeProps('candidate', 'prod_manager')).toEqual({
      'flowable:assignee': undefined,
      'flowable:candidateGroups': 'prod_manager',
    })
  })
  it('候选组无角色 → candidateGroups undefined', () => {
    expect(buildAssigneeProps('candidate')).toEqual({
      'flowable:assignee': undefined,
      'flowable:candidateGroups': undefined,
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec vitest run src/pages/workflow/model/__tests__/bpmnUtils.test.ts
```
Expected: FAIL（`Cannot find module '../bpmnUtils'`）。

- [ ] **Step 3: 写实现 `bpmnUtils.ts`**

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

/** 生成只含一个开始事件的最小 BPMN 2.0 XML(process id=modelKey) */
export function initialBpmnXml(modelKey: string, name: string): string {
  const safeName = name.replace(/"/g, '&quot;')
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

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec vitest run src/pages/workflow/model/__tests__/bpmnUtils.test.ts
```
Expected: PASS（全部用例绿）。

- [ ] **Step 5: 写 `flowableModdle.ts`**

```ts
/**
 * 最小 Flowable moddle 扩展:让 bpmn:UserTask 支持 flowable:assignee / candidateGroups
 * 属性,使导出的 BPMN XML 真带 flowable: 命名空间属性(下周期真 Flowable 后端可直接消费)。
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

- [ ] **Step 6: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/pages/workflow/model/bpmnUtils.ts mes/frontend/apps/mes-new/src/pages/workflow/model/__tests__/bpmnUtils.test.ts mes/frontend/apps/mes-new/src/pages/workflow/model/flowableModdle.ts && git commit -m "✨ feat(mes-new): BPMN 纯函数(initialXml/validateSummary/assignee TDD)+ Flowable moddle"
```

---

## Task 5: 流程分类管理页（CategoryForm + CategoryList + 路由接入）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/workflow/category/CategoryForm.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/workflow/category/CategoryList.tsx`
- Modify: `mes/frontend/apps/mes-new/src/utils/urlMap.ts`
- Modify: `mes/frontend/apps/mes-new/src/layouts/routeMeta.ts`
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1: 写 `CategoryForm.tsx`**

```tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FolderTree, Info } from 'lucide-react'
import { Input, Textarea, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { categoryAddOrUpdate } from '@/api/workflow/category'
import type { WorkflowCategory } from '@/types/workflow'

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: WorkflowCategory | null
}

const schema = z.object({
  code: z.string().min(1, '请输入分类编码'),
  name: z.string().min(1, '请输入分类名称'),
  descr: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function CategoryForm({ open, onOpenChange, record }: CategoryFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: WorkflowCategory) => categoryAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', descr: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ code: record?.code ?? '', name: record?.name ?? '', descr: record?.descr ?? '' })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: WorkflowCategory = {
      id: record?.id ?? '',
      code: values.code,
      name: values.name,
      descr: values.descr ?? '',
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["workflow","category"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑流程分类' : '新增流程分类'}
      icon={FolderTree}
      description="维护流程分类(如 生产流程 / prod)"
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="分类编码" htmlFor="wc-code" required error={errors.code?.message}>
            <Input id="wc-code" aria-invalid={!!errors.code} placeholder="如 prod" {...register('code')} />
          </FormField>
          <FormField label="分类名称" htmlFor="wc-name" required error={errors.name?.message}>
            <Input id="wc-name" aria-invalid={!!errors.name} placeholder="如 生产流程" {...register('name')} />
          </FormField>
        </div>
        <FormField label="备注" htmlFor="wc-descr">
          <Textarea id="wc-descr" {...register('descr')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2: 写 `CategoryList.tsx`**

```tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DataTable,
  Input,
  Label,
  toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import CategoryForm from './CategoryForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { categoryPage, categoryDelete, type CategoryPageParams } from '@/api/workflow/category'
import type { WorkflowCategory } from '@/types/workflow'

const PAGE_SIZE = 10

export default function CategoryList() {
  const [params, setParams] = useState<CategoryPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WorkflowCategory | null>(null)
  const [deleting, setDeleting] = useState<WorkflowCategory | null>(null)

  const { data, loading } = useQuery$(['workflow', 'category', 'page', params], () => categoryPage(params))
  const { mutate: removeCategory } = useMutation$((id: string) => categoryDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeCategory(deleting.id)
      toast.success('删除成功')
      invalidate('["workflow","category"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<WorkflowCategory>[]>(
    () => [
      { accessorKey: 'name', header: '分类名称' },
      { accessorKey: 'code', header: '分类编码' },
      {
        id: 'descr',
        header: '备注',
        cell: ({ row }) => row.original.descr || '-',
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditing(row.original)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer
      title="流程分类管理"
      description="维护流程分类,供流程模型发布归类"
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          新增分类
        </Button>
      }
    >
      <div className="space-y-3">
        <SearchForm onSearch={onSearch} onReset={onReset}>
          <div className="space-y-1.5">
            <Label htmlFor="wc-s-code">分类编码</Label>
            <Input
              id="wc-s-code"
              className="h-9 w-40"
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-s-name">分类名称</Label>
            <Input
              id="wc-s-name"
              className="h-9 w-40"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
          </div>
        </SearchForm>
        <DataTable
          columns={columns}
          data={data?.records ?? []}
          loading={loading}
          loadingRowCount={PAGE_SIZE}
          getRowId={(r) => r.id}
          pagination={{
            mode: 'server',
            pageIndex: (data?.current ?? params.current) - 1,
            pageSize: PAGE_SIZE,
            totalPages: data?.pages ?? 1,
            totalRows: data?.total,
            onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
          }}
        />
      </div>

      <CategoryForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除流程分类「{deleting?.name}」吗?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
```

- [ ] **Step 3: 注册 urlMap（`utils/urlMap.ts`）**

在 `URL_MAP` 对象内,`'/digital/simulation/list-ui': '/digitization/simulation',` 这一行之后追加两行:

```ts
  '/workflow/category/list-ui': '/workflow/category',
  '/workflow/model/list-ui': '/workflow/model',
```

- [ ] **Step 4: 注册 routeMeta（`layouts/routeMeta.ts`）**

在 `ROUTE_META` 对象内,`'/order/gantt': { title: '生产甘特图', icon: 'schedule' },` 这一行之后追加:

```ts
  // 流程配置工具
  '/workflow/category': { title: '流程分类管理', icon: 'apartment' },
  '/workflow/model': { title: '流程模型设计', icon: 'branches' },
```

- [ ] **Step 5: 注册路由（`router.tsx`）**

在文件顶部 import 区(`import NotFound ...` 之前)追加:

```tsx
import CategoryList from '@/pages/workflow/category/CategoryList'
```

在 children 数组内,`{ path: 'inventory/manual-inbound', element: <ManualInbound /> },` 之后追加:

```tsx
          { path: 'workflow/category', element: <CategoryList /> },
```

- [ ] **Step 6: 验证类型 + lint + 构建**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new lint && pnpm --filter mes-new build
```
Expected: tsc 0 error；lint 0 error（workflow 目录无告警）；build 成功。

- [ ] **Step 7: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/pages/workflow/category mes/frontend/apps/mes-new/src/utils/urlMap.ts mes/frontend/apps/mes-new/src/layouts/routeMeta.ts mes/frontend/apps/mes-new/src/router.tsx && git commit -m "✨ feat(mes-new): 流程分类管理页 CRUD + 路由/菜单映射接入"
```

---

## Task 6: BpmnDesigner（bpmn-js React 包装）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/workflow/model/BpmnDesigner.tsx`

> 该组件是 bpmn-js 的薄 glue：挂载 Modeler、导入 XML、暴露 getXML/getSummary/updateUserTask、转发选中事件。不做单测（依赖 canvas/DOM）。校验逻辑已在 Task 4 的纯函数里测过。

- [ ] **Step 1: 写 `BpmnDesigner.tsx`**

```tsx
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import Modeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import flowableModdle from './flowableModdle'
import type { BpmnSummary, UserTaskSummary } from './bpmnUtils'

/** 当前选中元素的扁平视图(驱动属性面板) */
export interface SelectedElement {
  id: string
  type: string
  name?: string
  assignee?: string
  candidateGroups?: string
}

export interface BpmnDesignerHandle {
  getXML: () => Promise<string>
  getSummary: () => BpmnSummary
  /** 给当前选中的用户任务写属性(name 或 flowable:* );值为 undefined 即清除 */
  updateSelected: (props: Record<string, unknown>) => void
}

interface BpmnDesignerProps {
  xml: string
  onSelect: (el: SelectedElement | null) => void
}

/** bpmn-js businessObject 的最小形状 */
interface Bo {
  $type: string
  id: string
  name?: string
  assignee?: string
  candidateGroups?: string
}
interface El {
  id: string
  type: string
  businessObject: Bo
  incoming?: unknown[]
  outgoing?: unknown[]
}

function toSelected(el: El | null): SelectedElement | null {
  if (!el || !el.businessObject) return null
  const bo = el.businessObject
  return {
    id: bo.id,
    type: bo.$type,
    name: bo.name,
    assignee: bo.assignee,
    candidateGroups: bo.candidateGroups,
  }
}

const BpmnDesigner = forwardRef<BpmnDesignerHandle, BpmnDesignerProps>(function BpmnDesigner(
  { xml, onSelect },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const modelerRef = useRef<Modeler | null>(null)
  const currentRef = useRef<El | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current) return
    const modeler = new Modeler({
      container: containerRef.current,
      moddleExtensions: { flowable: flowableModdle },
    })
    modelerRef.current = modeler

    modeler.on('selection.changed', (e: unknown) => {
      const sel = (e as { newSelection: El[] }).newSelection
      const el = sel && sel.length === 1 ? sel[0] : null
      currentRef.current = el
      onSelectRef.current(toSelected(el))
    })
    modeler.on('element.changed', (e: unknown) => {
      const changed = (e as { element: El }).element
      if (currentRef.current && changed && changed.id === currentRef.current.id) {
        currentRef.current = changed
        onSelectRef.current(toSelected(changed))
      }
    })

    modeler
      .importXML(xml)
      .then(() => {
        const canvas = modeler.get<{ zoom: (m: string) => void }>('canvas')
        canvas.zoom('fit-viewport')
      })
      .catch((err) => {
        console.error('[BpmnDesigner] importXML 失败', err)
      })

    return () => {
      modeler.destroy()
      modelerRef.current = null
    }
    // 仅挂载时创建一次;xml 后续变化通过重建组件(key) 处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    async getXML() {
      const modeler = modelerRef.current
      if (!modeler) return xml
      const { xml: out } = await modeler.saveXML({ format: true })
      return out
    },
    getSummary(): BpmnSummary {
      const modeler = modelerRef.current
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
            assignee: bo.assignee,
            candidateGroups: bo.candidateGroups,
          })
        }
        const inc = el.incoming?.length ?? 0
        const out = el.outgoing?.length ?? 0
        if (inc === 0 && out === 0) disconnectedCount++
      }
      return { hasStart, hasEnd, userTasks, disconnectedCount }
    },
    updateSelected(props: Record<string, unknown>) {
      const modeler = modelerRef.current
      const el = currentRef.current
      if (!modeler || !el) return
      const modeling = modeler.get<{ updateProperties: (e: El, p: Record<string, unknown>) => void }>('modeling')
      modeling.updateProperties(el, props)
    },
  }))

  return <div ref={containerRef} className="h-full w-full" />
})

export default BpmnDesigner
```

- [ ] **Step 2: 验证类型编译**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit
```
Expected: PASS（0 error）。

> 若 `modeler.get<...>('modeling')` 等泛型调用报类型错,确认 Task 1 的 `bpmn-js/lib/Modeler` 声明里 `get<T>` 存在。lint 若报 `console` 可保留(其它页面也用 console.error)或按既有约定调整。

- [ ] **Step 3: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/pages/workflow/model/BpmnDesigner.tsx && git commit -m "✨ feat(mes-new): BpmnDesigner(bpmn-js 包装,导入/导出/选中/摘要/写属性)"
```

---

## Task 7: PropertiesPanel（自研节点属性面板）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/workflow/model/PropertiesPanel.tsx`

> 普通 useState 受控(规避 RHF 字段名 DOM 冲突)。仅当选中 `bpmn:UserTask` 时显示办理人配置;否则提示无需配置。

- [ ] **Step 1: 写 `PropertiesPanel.tsx`**

```tsx
import { useEffect, useState } from 'react'
import {
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui'
import type { SelectedElement } from './BpmnDesigner'
import type { AssigneeType } from './bpmnUtils'
import type { SysRole } from '@/types/system'

interface PropertiesPanelProps {
  element: SelectedElement | null
  roles: SysRole[]
  onChangeName: (name: string) => void
  onChangeAssignee: (type: AssigneeType, roleCode?: string) => void
}

function deriveType(el: SelectedElement | null): AssigneeType {
  if (el?.candidateGroups) return 'candidate'
  return 'initiator'
}

export default function PropertiesPanel({
  element,
  roles,
  onChangeName,
  onChangeAssignee,
}: PropertiesPanelProps) {
  const [name, setName] = useState('')
  const [assigneeType, setAssigneeType] = useState<AssigneeType>('initiator')
  const [roleCode, setRoleCode] = useState<string>('')

  // 选中元素变化时同步本地受控态
  useEffect(() => {
    setName(element?.name ?? '')
    setAssigneeType(deriveType(element))
    setRoleCode(element?.candidateGroups ?? '')
  }, [element])

  if (!element) {
    return (
      <div className="p-4 text-sm text-muted-foreground">请选择左侧节点进行配置</div>
    )
  }

  const isUserTask = element.type === 'bpmn:UserTask'

  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          节点属性
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{element.type}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pp-name">节点名称</Label>
        <Input
          id="pp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => onChangeName(name)}
        />
      </div>

      {isUserTask ? (
        <div className="space-y-3">
          <Label>办理人</Label>
          <RadioGroup
            value={assigneeType}
            onValueChange={(v) => {
              const t = v as AssigneeType
              setAssigneeType(t)
              onChangeAssignee(t, t === 'candidate' ? roleCode || undefined : undefined)
            }}
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="initiator" id="pp-initiator" />
              流程发起人
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="candidate" id="pp-candidate" />
              候选组(按角色)
            </label>
          </RadioGroup>

          {assigneeType === 'candidate' && (
            <div className="space-y-1.5">
              <Label htmlFor="pp-role">生产主管角色</Label>
              <Select
                value={roleCode}
                onValueChange={(v) => {
                  setRoleCode(v)
                  onChangeAssignee('candidate', v)
                }}
              >
                <SelectTrigger id="pp-role">
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">该节点无需配置办理人</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证类型编译**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit
```
Expected: PASS（0 error）。

- [ ] **Step 3: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/pages/workflow/model/PropertiesPanel.tsx && git commit -m "✨ feat(mes-new): 流程节点属性面板(用户任务办理人:发起人/候选组角色)"
```

---

## Task 8: 模型设计编排（CreateDialog / PublishDialog / DesignerDialog / ModelList + 路由）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/workflow/model/ModelCreateDialog.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/workflow/model/PublishDialog.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/workflow/model/ModelDesignerDialog.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/workflow/model/ModelList.tsx`
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1: 写 `ModelCreateDialog.tsx`**

```tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Workflow, Info } from 'lucide-react'
import { Input, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { modelSave } from '@/api/workflow/model'
import { initialBpmnXml } from './bpmnUtils'

interface ModelCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 新建成功后回传 modelId,父组件可直接打开设计器 */
  onCreated: (modelId: string) => void
}

const schema = z.object({
  name: z.string().min(1, '请输入模型名称'),
  modelKey: z
    .string()
    .min(1, '请输入模型 key')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '以字母开头,仅含字母/数字/下划线'),
})

type FormValues = z.infer<typeof schema>

export default function ModelCreateDialog({ open, onOpenChange, onCreated }: ModelCreateDialogProps) {
  const { mutate, loading } = useMutation$((v: FormValues) =>
    modelSave({ name: v.name, modelKey: v.modelKey, bpmnXml: initialBpmnXml(v.modelKey, v.name) }),
  )
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', modelKey: '' },
  })

  useEffect(() => {
    if (open) reset({ name: '', modelKey: '' })
  }, [open, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const id = await mutate(values)
      toast.success('已创建模型')
      invalidate('["workflow","model"')
      onOpenChange(false)
      onCreated(id)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="创建流程模型"
      icon={Workflow}
      description="填写模型名称与 key(如 生产订单审批流程 / orderRecord)"
      onSubmit={onSubmit}
      submitting={loading}
      submitText="创建并设计"
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <FormField label="模型名称" htmlFor="mc-name" required error={errors.name?.message}>
          <Input id="mc-name" aria-invalid={!!errors.name} placeholder="生产订单审批流程" {...register('name')} />
        </FormField>
        <FormField label="模型 key" htmlFor="mc-key" required error={errors.modelKey?.message}>
          <Input id="mc-key" aria-invalid={!!errors.modelKey} placeholder="orderRecord" {...register('modelKey')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2: 写 `PublishDialog.tsx`**

```tsx
import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { categoryList } from '@/api/workflow/category'
import { modelPublish } from '@/api/workflow/model'
import type { WorkflowModel } from '@/types/workflow'

interface PublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model: WorkflowModel | null
}

export default function PublishDialog({ open, onOpenChange, model }: PublishDialogProps) {
  const { data: categories } = useQuery$(['workflow', 'category', 'list'], () => categoryList(), {
    enabled: open,
  })
  const { mutate, loading } = useMutation$((args: { id: string; categoryCode: string; categoryName: string }) =>
    modelPublish(args),
  )
  const [categoryCode, setCategoryCode] = useState('')

  useEffect(() => {
    if (open) setCategoryCode(model?.categoryCode ?? '')
  }, [open, model])

  const onConfirm = async () => {
    if (!model) return
    if (!categoryCode) {
      toast.error('请选择流程分类')
      return
    }
    const cat = (categories ?? []).find((c) => c.code === categoryCode)
    if (!cat) {
      toast.error('分类不存在')
      return
    }
    try {
      await mutate({ id: model.id, categoryCode: cat.code, categoryName: cat.name })
      toast.success('发布成功')
      invalidate('["workflow","model"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>发布流程模型</DialogTitle>
          <DialogDescription>将「{model?.name}」发布到指定流程分类下</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="pub-cat">流程分类</Label>
          <Select value={categoryCode} onValueChange={setCategoryCode}>
            <SelectTrigger id="pub-cat">
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? '发布中…' : '发布'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: 写 `ModelDesignerDialog.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  toast,
} from '@workspace/ui'
import { Save, CheckCircle2 } from 'lucide-react'
import { firstValueFrom } from 'rxjs'
import { useMutation$, useQuery$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { modelGet, modelSave } from '@/api/workflow/model'
import { rolePage } from '@/api/system/role'
import BpmnDesigner, { type BpmnDesignerHandle, type SelectedElement } from './BpmnDesigner'
import PropertiesPanel from './PropertiesPanel'
import { validateSummary, buildAssigneeProps, type AssigneeType } from './bpmnUtils'
import type { SysRole } from '@/types/system'

interface ModelDesignerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelId: string | null
}

export default function ModelDesignerDialog({ open, onOpenChange, modelId }: ModelDesignerDialogProps) {
  const designerRef = useRef<BpmnDesignerHandle>(null)
  const [selected, setSelected] = useState<SelectedElement | null>(null)
  const [xml, setXml] = useState<string | null>(null)
  const [modelMeta, setModelMeta] = useState<{ name: string; modelKey: string } | null>(null)

  const { data: roleData } = useQuery$(['workflow', 'roles'], () => rolePage({ current: 1, size: 100 }), {
    enabled: open,
  })
  const roles: SysRole[] = roleData?.records ?? []
  const { mutate: saveModel, loading: saving } = useMutation$(
    (args: { id: string; modelKey: string; name: string; bpmnXml: string }) => modelSave(args),
  )

  // 打开时加载该模型的 bpmnXml(mock 同步返回)
  useEffect(() => {
    if (!open || !modelId) {
      setXml(null)
      setModelMeta(null)
      setSelected(null)
      return
    }
    firstValueFrom(modelGet(modelId)).then((m) => {
      if (m) {
        setXml(m.bpmnXml)
        setModelMeta({ name: m.name, modelKey: m.modelKey })
      } else {
        toast.error('模型不存在')
        onOpenChange(false)
      }
    })
  }, [open, modelId, onOpenChange])

  const handleChangeName = (name: string) => {
    designerRef.current?.updateSelected({ name })
  }
  const handleChangeAssignee = (type: AssigneeType, roleCode?: string) => {
    designerRef.current?.updateSelected(buildAssigneeProps(type, roleCode))
  }

  const handleSave = async () => {
    if (!modelId || !modelMeta || !designerRef.current) return
    try {
      const out = await designerRef.current.getXML()
      await saveModel({ id: modelId, modelKey: modelMeta.modelKey, name: modelMeta.name, bpmnXml: out })
      toast.success('已保存')
      invalidate('["workflow","model"')
    } catch {
      /* 拦截器已 toast */
    }
  }

  const handleValidate = () => {
    if (!designerRef.current) return
    const result = validateSummary(designerRef.current.getSummary())
    if (result.ok) {
      toast.success('校验通过:流程定义完整')
    } else {
      toast.error(`校验未通过:${result.issues.join('；')}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-[95vw] flex-col gap-0 p-0">
        <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-base">
            流程模型设计{modelMeta ? ` — ${modelMeta.name}` : ''}
          </DialogTitle>
          <div className="flex gap-2 pr-8">
            <Button size="sm" variant="outline" onClick={handleValidate}>
              <CheckCircle2 className="size-4" />
              检查定义
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="size-4" />
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </DialogHeader>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 bg-muted/20">
            {xml && <BpmnDesigner key={modelId} ref={designerRef} xml={xml} onSelect={setSelected} />}
          </div>
          <div className="w-72 shrink-0 overflow-y-auto border-l">
            <PropertiesPanel
              element={selected}
              roles={roles}
              onChangeName={handleChangeName}
              onChangeAssignee={handleChangeAssignee}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: 写 `ModelList.tsx`**

```tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DataTable,
  Input,
  Label,
  toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import ModelCreateDialog from './ModelCreateDialog'
import ModelDesignerDialog from './ModelDesignerDialog'
import PublishDialog from './PublishDialog'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { modelPage, modelDelete, type ModelPageParams } from '@/api/workflow/model'
import type { WorkflowModel } from '@/types/workflow'

const PAGE_SIZE = 10

export default function ModelList() {
  const [params, setParams] = useState<ModelPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [draftKey, setDraftKey] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [designId, setDesignId] = useState<string | null>(null)
  const [designerOpen, setDesignerOpen] = useState(false)
  const [publishing, setPublishing] = useState<WorkflowModel | null>(null)
  const [deleting, setDeleting] = useState<WorkflowModel | null>(null)

  const { data, loading } = useQuery$(['workflow', 'model', 'page', params], () => modelPage(params))
  const { mutate: removeModel } = useMutation$((id: string) => modelDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, name: draftName || undefined, modelKey: draftKey || undefined })
  const onReset = () => {
    setDraftName('')
    setDraftKey('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const openDesigner = (id: string) => {
    setDesignId(id)
    setDesignerOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeModel(deleting.id)
      toast.success('删除成功')
      invalidate('["workflow","model"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<WorkflowModel>[]>(
    () => [
      { accessorKey: 'name', header: '模型名称' },
      { accessorKey: 'modelKey', header: '模型 key' },
      {
        id: 'category',
        header: '所属分类',
        cell: ({ row }) => row.original.categoryName || '-',
      },
      {
        id: 'status',
        header: '状态',
        cell: ({ row }) =>
          row.original.status === 'PUBLISHED' ? (
            <Badge>已发布</Badge>
          ) : (
            <Badge variant="secondary">草稿</Badge>
          ),
      },
      { accessorKey: 'updateTime', header: '更新时间' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" title="设计" onClick={() => openDesigner(row.original.id)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="发布" onClick={() => setPublishing(row.original)}>
              <Upload className="size-4 text-primary" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="删除" onClick={() => setDeleting(row.original)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer
      title="流程模型设计"
      description="设计 BPMN 流程模型并发布到分类下"
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          创建模型
        </Button>
      }
    >
      <div className="space-y-3">
        <SearchForm onSearch={onSearch} onReset={onReset}>
          <div className="space-y-1.5">
            <Label htmlFor="wm-s-name">模型名称</Label>
            <Input
              id="wm-s-name"
              className="h-9 w-40"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wm-s-key">模型 key</Label>
            <Input
              id="wm-s-key"
              className="h-9 w-40"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
            />
          </div>
        </SearchForm>
        <DataTable
          columns={columns}
          data={data?.records ?? []}
          loading={loading}
          loadingRowCount={PAGE_SIZE}
          getRowId={(r) => r.id}
          pagination={{
            mode: 'server',
            pageIndex: (data?.current ?? params.current) - 1,
            pageSize: PAGE_SIZE,
            totalPages: data?.pages ?? 1,
            totalRows: data?.total,
            onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
          }}
        />
      </div>

      <ModelCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => openDesigner(id)}
      />
      <ModelDesignerDialog open={designerOpen} onOpenChange={setDesignerOpen} modelId={designId} />
      <PublishDialog open={!!publishing} onOpenChange={(o) => !o && setPublishing(null)} model={publishing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除流程模型「{deleting?.name}」吗?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
```

- [ ] **Step 5: 注册模型路由（`router.tsx`）**

在顶部 import 区,`CategoryList` 那一行之后追加:

```tsx
import ModelList from '@/pages/workflow/model/ModelList'
```

在 children 数组内,`{ path: 'workflow/category', element: <CategoryList /> },` 之后追加:

```tsx
          { path: 'workflow/model', element: <ModelList /> },
```

- [ ] **Step 6: 验证类型 + lint + 测试 + 构建**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new lint && pnpm --filter mes-new test && pnpm --filter mes-new build
```
Expected: tsc 0 error；lint 0 error；test 全绿（含 mockStore 5 + bpmnUtils 多用例 + 既有用例）；build 成功（bpmn-js 进 chunk）。

- [ ] **Step 7: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/pages/workflow/model mes/frontend/apps/mes-new/src/router.tsx && git commit -m "✨ feat(mes-new): 流程模型设计页(列表/创建/设计器编排/校验/发布)+ 路由接入"
```

---

## Task 9: 菜单种子 SQL

**Files:**
- Create: `mes/scripts/sql/workflow-flow-config.sql` 实际路径 `scripts/sql/workflow-flow-config.sql`（与既有 sql 同目录）

> 顶层目录「流程配置工具」(id=19) + 两个叶子菜单(id=191/192)。`AppSidebar` 只渲染两级,故做成 目录 → 两叶子。id 19/191/192 经核对未被占用(已用顶层:10/12/13/18 等)。全部 NOT EXISTS 幂等。

- [ ] **Step 1: 写 `scripts/sql/workflow-flow-config.sql`**

```sql
-- 流程配置工具菜单(两级:流程配置工具 → 流程分类管理 / 流程模型设计)
-- AppSidebar 仅渲染两级菜单,故不再嵌套"流程管控"中间层。
-- 列序: id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username

-- 顶层目录
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '19', 'workflowTool', '流程配置工具', '#', '0', '0', 9, '0', 'workflow:view', 'deployment-unit', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '19');

-- 流程分类管理
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '191', 'workflowCategory', '流程分类管理', '/workflow/category/list-ui', '19', '3', 1, '0', 'workflow:category:list', 'apartment', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '191');

-- 流程模型设计
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '192', 'workflowModel', '流程模型设计', '/workflow/model/list-ui', '19', '3', 2, '0', 'workflow:model:list', 'branches', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '192');
```

- [ ] **Step 2: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add scripts/sql/workflow-flow-config.sql && git commit -m "✨ feat(sql): 流程配置工具菜单种子(流程分类管理/流程模型设计)"
```

---

## Task 10: 终验与人工冒烟

**Files:** 无（仅验证）

- [ ] **Step 1: 全量门禁**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new lint && pnpm --filter mes-new test && pnpm --filter mes-new build
```
Expected: 四项全过(tsc 0 / lint 0 / test 全绿 / build 成功)。贴出实际输出。

- [ ] **Step 2: 人工冒烟(需后端 :9090 + DB 已执行 `scripts/sql/workflow-flow-config.sql`)**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new dev
```
浏览器 `:4100`,admin/123 登录后逐项确认(对照 PPT):
1. 侧边栏出现「流程配置工具」分组,下含「流程分类管理」「流程模型设计」。
2. 流程分类管理:新增 名称「生产流程」编码「prod」→ 列表出现 → 刷新仍在(localStorage)。
3. 流程模型设计:创建模型 名称「生产订单审批流程」key「orderRecord」→ 自动进设计器。
4. 设计器:从开始事件拖出/添加两个任务,用扳手(替换)改为「用户任务」,再加一个结束事件,依次连线。
5. 选中任务1命名「计划员发起」,办理人=流程发起人;选中任务2命名「生产主管审批」,办理人=候选组→选角色。
6. 点「检查定义」→ 通过提示;点「保存」→ 成功。
7. 列表点「发布」→ 选「生产流程」→ 状态变「已发布」、所属分类显示「生产流程」。

> 注:人工浏览器端到端由用户确认;门禁层(tsc/lint/test/build)与脚本已自验。

- [ ] **Step 3: 收尾**

提醒用户:运行 `scripts/sql/workflow-flow-config.sql` 建菜单;按需 `/commit` 或合并分支。

---

## Self-Review（计划自检结果）

**1. Spec 覆盖：**
- §3 导航/菜单 → Task 9(SQL) + Task 5 Step3-5(urlMap/routeMeta/router)。✅(注:spec 写三级,因 AppSidebar 只渲染两级改为两级,已在 Task 9 注明理由)
- §4 数据层 mock → Task 2(mockStore)+ Task 3(category/model api)。✅
- §4 类型 → Task 1(types/workflow.ts)。✅
- §5 流程分类页 → Task 5。✅
- §6.1 模型列表 → Task 8 ModelList。✅
- §6.2 新建模型 → Task 8 ModelCreateDialog。✅
- §6.3 设计器/属性面板/moddle → Task 6/7 + Task 4 flowableModdle。✅
- §6.4 保存/校验/发布 → Task 8 DesignerDialog(保存/校验)+ PublishDialog。✅
- §6.5 bpmnUtils 纯函数 → Task 4。✅
- §7 依赖 bpmn-js → Task 1。✅
- §9 验证 → Task 6/8/10。✅

**2. 占位符扫描：** 无 TBD/TODO;每个代码步骤含完整代码。Task 1 的 tsc 回退说明是确定性分支判断(以 0 error 为准),非占位。✅

**3. 类型一致性：**
- `WorkflowCategory`/`WorkflowModel`(T1)在 api(T3)、页面(T5/T8)一致引用。✅
- `BpmnSummary`/`ValidationResult`/`AssigneeType`/`buildAssigneeProps`(T4)被 BpmnDesigner(T6)、PropertiesPanel(T7)、DesignerDialog(T8)一致引用。✅
- `SelectedElement`/`BpmnDesignerHandle`(T6)被 PropertiesPanel(T7)、DesignerDialog(T8)一致引用。✅
- mock api 函数名(categoryPage/categoryAddOrUpdate/categoryDelete/categoryList、modelPage/modelGet/modelSave/modelDelete/modelPublish)在页面调用处一致。✅
- invalidate 前缀 `["workflow","category"` / `["workflow","model"` 与 useQuery$ key 一致。✅
```
