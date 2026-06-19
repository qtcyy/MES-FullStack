# 流程表单 + 流程定义管理 + 流程事件配置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以前端 mock 方式补齐 workflow 模块的「流程表单管理」「流程定义管理」「流程事件配置」三块 UI，形成「分类 → 模型 → 定义管理(关联表单+事件)」闭环演示。

**Architecture:** 跟随现有 category/model 的 mock 模式（`mockStore` localStorage + `Observable` 返回）。流程定义由已发布模型派生 + mock 附加状态(enabled/formKey)。脚本只存不执行；业务状态同步仅声明配置。纯逻辑(校验/模板/预置规则)抽 `formUtils.ts` 并 vitest TDD；页面走 tsc/lint/build + 运行时核对。

**Tech Stack:** React 18 + TS + Vite，@workspace/ui(shadcn/Radix)，react-hook-form + zod，rxjs，TanStack Table(DataTable)，vitest。

**Spec:** `docs/superpowers/specs/2026-06-19-workflow-form-event-design.md`

**通用约定：** pnpm 命令在 `mes/frontend` 下用 `--filter mes-new`。git 命令 `<repo-root>` = `/Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack`。所有前端路径相对 `mes/frontend/apps/mes-new/`。

---

## File Structure

| 文件 | 职责 | 动作 |
|---|---|---|
| `src/types/workflow.ts` | 新增 WorkflowForm / WorkflowDefinition / WorkflowEventRule 等类型 | Modify |
| `src/pages/workflow/formUtils.ts` | 纯逻辑：FORM_KEY_REGEX、validateForm、脚本模板与变量、defaultEventRules、选项常量 | Create |
| `src/pages/workflow/__tests__/formUtils.test.ts` | formUtils 单测 | Create |
| `src/api/workflow/form.ts` | 流程表单 mock CRUD | Create |
| `src/api/workflow/definition.ts` | 流程定义 mock（派生已发布模型 + 附加状态） | Create |
| `src/api/workflow/event.ts` | 流程事件规则 mock CRUD | Create |
| `src/components/ScriptEditor.tsx` | 等宽 Textarea + 变量提示 | Create |
| `src/pages/workflow/form/FormList.tsx` | 流程表单管理列表页 | Create |
| `src/pages/workflow/form/FormWizardDialog.tsx` | 新增/编辑流程表单向导 | Create |
| `src/pages/workflow/definition/DefinitionList.tsx` | 流程定义管理列表页 | Create |
| `src/pages/workflow/definition/AssociateFormDialog.tsx` | 关联流程表单弹窗 | Create |
| `src/pages/workflow/definition/EventConfigDialog.tsx` | 流程事件配置弹窗 | Create |
| `src/router.tsx` | 新增 2 条路由 + import | Modify |
| `src/utils/urlMap.ts` | 新增 2 条菜单 url→路由映射 | Modify |
| `scripts/sql/workflow-form-event-config.sql` | 菜单 seed（流程表单管理/流程定义管理） | Create |

---

## Task 1: 类型 + 纯逻辑 formUtils（TDD）

**Files:**
- Modify: `src/types/workflow.ts`
- Create: `src/pages/workflow/formUtils.ts`
- Test: `src/pages/workflow/__tests__/formUtils.test.ts`

- [ ] **Step 1: 追加类型** — 在 `src/types/workflow.ts` 末尾追加：

```ts

export type WorkflowFormType = 'URL'

/** 流程表单（mock） */
export interface WorkflowForm {
  id: string
  name: string
  formKey: string
  formType: WorkflowFormType
  titleScript: string
  pcUrlScript: string
  mobileUrlScript: string
  skipSameAssignee: boolean
  createTime?: string
}

/** 流程定义 = 已发布模型派生 + mock 附加状态 */
export interface WorkflowDefinition {
  id: string // = modelId
  processKey: string // = modelKey
  processName: string
  categoryCode?: string
  categoryName?: string
  version: number
  enabled: boolean
  formKey?: string
  createTime?: string
}

export type WorkflowEventTrigger = 'START' | 'TASK_COMPLETE' | 'END' | 'REJECT'
export type WorkflowEventActionType = 'SET_AUDIT_STATUS' | 'SCRIPT'
export type OrderAuditStatus = 'DRAFT' | 'APPROVING' | 'APPROVED' | 'REJECTED'

/** 流程事件规则（mock，按 definitionId 归属） */
export interface WorkflowEventRule {
  id: string
  definitionId: string
  name?: string
  trigger: WorkflowEventTrigger
  businessType: string // 'ORDER_APPROVAL'
  actionType: WorkflowEventActionType
  targetStatus?: OrderAuditStatus
  script?: string
  enabled: boolean
  createTime?: string
}

/** 事件规则草稿（无 id/createTime，保存时再补） */
export type WorkflowEventRuleDraft = Omit<WorkflowEventRule, 'id' | 'createTime'>
```

- [ ] **Step 2: 写失败测试** — Create `src/pages/workflow/__tests__/formUtils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  FORM_KEY_REGEX,
  defaultEventRules,
  DEFAULT_TITLE_SCRIPT,
  DEFAULT_PC_URL_SCRIPT,
  DEFAULT_MOBILE_URL_SCRIPT,
} from '../formUtils'

describe('FORM_KEY_REGEX', () => {
  it('合法 key 通过', () => {
    expect(FORM_KEY_REGEX.test('orderRecord')).toBe(true)
    expect(FORM_KEY_REGEX.test('a_1')).toBe(true)
  })
  it('非法 key 拒绝', () => {
    expect(FORM_KEY_REGEX.test('1abc')).toBe(false)
    expect(FORM_KEY_REGEX.test('order-record')).toBe(false)
    expect(FORM_KEY_REGEX.test('')).toBe(false)
  })
})

describe('脚本模板常量', () => {
  it('三个默认脚本均非空', () => {
    expect(DEFAULT_TITLE_SCRIPT.trim()).not.toBe('')
    expect(DEFAULT_PC_URL_SCRIPT.trim()).not.toBe('')
    expect(DEFAULT_MOBILE_URL_SCRIPT.trim()).not.toBe('')
  })
})

describe('defaultEventRules', () => {
  it('返回三条生产订单审批示例(启动/通过/驳回)', () => {
    const rules = defaultEventRules('DEF1')
    expect(rules).toHaveLength(3)
    expect(rules.every((r) => r.definitionId === 'DEF1')).toBe(true)
    expect(rules.every((r) => r.businessType === 'ORDER_APPROVAL')).toBe(true)
    expect(rules.every((r) => r.actionType === 'SET_AUDIT_STATUS')).toBe(true)
    expect(rules.map((r) => r.trigger)).toEqual(['START', 'END', 'REJECT'])
    expect(rules.map((r) => r.targetStatus)).toEqual(['APPROVING', 'APPROVED', 'REJECTED'])
    expect(rules.every((r) => r.enabled)).toBe(true)
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/workflow/__tests__/formUtils.test.ts`
Expected: FAIL（`Cannot find module '../formUtils'`）。

- [ ] **Step 4: 实现 formUtils** — Create `src/pages/workflow/formUtils.ts`:

```ts
import type {
  OrderAuditStatus,
  WorkflowEventActionType,
  WorkflowEventRuleDraft,
  WorkflowEventTrigger,
} from '@/types/workflow'

/** 表单 key：字母开头，仅字母/数字/下划线 */
export const FORM_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/

/** 默认脚本模板（新建表单预填，便于演示；mock 不执行） */
export const DEFAULT_TITLE_SCRIPT = '"生产订单审批 - " + orderCode'
export const DEFAULT_PC_URL_SCRIPT = '"/order/detail?id=" + businessId'
export const DEFAULT_MOBILE_URL_SCRIPT = '"/mobile/order/detail?id=" + businessId'

/** 脚本可用变量提示 */
export const SCRIPT_VARIABLES: { token: string; label: string }[] = [
  { token: '${orderCode}', label: '订单号' },
  { token: '${businessId}', label: '业务主键' },
  { token: '${businessType}', label: '业务类型' },
  { token: '${initiator}', label: '发起人' },
  { token: '${processName}', label: '流程名' },
]

/** 触发时机 / 动作 / 审批状态 选项（label 映射，UI 与展示共用） */
export const TRIGGER_OPTIONS: { value: WorkflowEventTrigger; label: string }[] = [
  { value: 'START', label: '流程启动' },
  { value: 'TASK_COMPLETE', label: '任务完成' },
  { value: 'END', label: '流程结束(通过)' },
  { value: 'REJECT', label: '流程驳回' },
]

export const ACTION_OPTIONS: { value: WorkflowEventActionType; label: string }[] = [
  { value: 'SET_AUDIT_STATUS', label: '设置审批状态' },
  { value: 'SCRIPT', label: '执行脚本' },
]

export const AUDIT_STATUS_OPTIONS: { value: OrderAuditStatus; label: string }[] = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'APPROVING', label: '审批中' },
  { value: 'APPROVED', label: '审批通过' },
  { value: 'REJECTED', label: '审批驳回' },
]

export function triggerLabel(t: WorkflowEventTrigger): string {
  return TRIGGER_OPTIONS.find((o) => o.value === t)?.label ?? t
}
export function auditStatusLabel(s?: OrderAuditStatus): string {
  return AUDIT_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? (s ?? '')
}

/** 纯函数：生产订单审批的三条预置事件规则草稿 */
export function defaultEventRules(definitionId: string): WorkflowEventRuleDraft[] {
  const base = { definitionId, businessType: 'ORDER_APPROVAL', actionType: 'SET_AUDIT_STATUS' as const, enabled: true }
  return [
    { ...base, name: '发起即审批中', trigger: 'START', targetStatus: 'APPROVING' },
    { ...base, name: '通过置审批通过', trigger: 'END', targetStatus: 'APPROVED' },
    { ...base, name: '驳回置审批驳回', trigger: 'REJECT', targetStatus: 'REJECTED' },
  ]
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/workflow/__tests__/formUtils.test.ts`
Expected: PASS（全部用例绿）。

- [ ] **Step 6: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: exit 0。

- [ ] **Step 7: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/types/workflow.ts mes/frontend/apps/mes-new/src/pages/workflow/formUtils.ts mes/frontend/apps/mes-new/src/pages/workflow/__tests__/formUtils.test.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): workflow 表单/定义/事件 类型 + formUtils 纯逻辑(TDD)"
```

---

## Task 2: Mock API 层（form / definition / event）

**Files:**
- Create: `src/api/workflow/form.ts`
- Create: `src/api/workflow/definition.ts`
- Create: `src/api/workflow/event.ts`

- [ ] **Step 1: Create `src/api/workflow/form.ts`:**

```ts
import type { Observable } from 'rxjs'
import type { PageResult } from '@/types/api'
import type { WorkflowForm } from '@/types/workflow'
import { ok, readList, writeList, paginate, genId, nowStr } from './mockStore'

// 下周期真后端:POST /workflow/form/* (page/add-or-update form 编码;delete/list 见各注)
const KEY = 'wf_forms'

export interface FormPageParams {
  current: number
  size: number
  name?: string
  formKey?: string
}

/** 表单分页 */
export function formPage(params: FormPageParams): Observable<PageResult<WorkflowForm>> {
  let all = readList<WorkflowForm>(KEY)
  if (params.name) all = all.filter((f) => f.name.includes(params.name!))
  if (params.formKey) all = all.filter((f) => f.formKey.includes(params.formKey!))
  all = [...all].sort((a, b) => (b.createTime ?? '').localeCompare(a.createTime ?? ''))
  return ok(paginate(all, params.current, params.size))
}

/** 全部表单(关联弹窗下拉用) */
export function formList(): Observable<WorkflowForm[]> {
  return ok(readList<WorkflowForm>(KEY))
}

/** 新增/编辑(空 id 走新增) */
export function formAddOrUpdate(record: WorkflowForm): Observable<string> {
  const all = readList<WorkflowForm>(KEY)
  if (record.id) {
    const idx = all.findIndex((f) => f.id === record.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...record }
    writeList(KEY, all)
    return ok(record.id)
  }
  const id = genId()
  all.push({ ...record, id, createTime: nowStr() })
  writeList(KEY, all)
  return ok(id)
}

/** 删除 */
export function formDelete(id: string): Observable<void> {
  writeList(
    KEY,
    readList<WorkflowForm>(KEY).filter((f) => f.id !== id),
  )
  return ok(undefined as unknown as void)
}
```

- [ ] **Step 2: Create `src/api/workflow/definition.ts`:**

```ts
import { map, type Observable } from 'rxjs'
import type { PageResult } from '@/types/api'
import type { WorkflowDefinition, WorkflowModel } from '@/types/workflow'
import { ok, readList, writeList, paginate } from './mockStore'
import { modelPage } from './model'

// 下周期真后端:流程定义由发布动作落库;当前由已发布模型派生 + mock 附加状态
const STATE_KEY = 'wf_definition_state'

interface DefinitionState {
  id: string
  enabled: boolean
  formKey?: string
}

export interface DefinitionPageParams {
  current: number
  size: number
  name?: string
}

function readState(id: string): DefinitionState {
  const all = readList<DefinitionState>(STATE_KEY)
  return all.find((s) => s.id === id) ?? { id, enabled: true }
}

function writeState(next: DefinitionState): void {
  const all = readList<DefinitionState>(STATE_KEY)
  const idx = all.findIndex((s) => s.id === next.id)
  if (idx >= 0) all[idx] = next
  else all.push(next)
  writeList(STATE_KEY, all)
}

/** 定义分页：取已发布模型，叠加 mock 附加状态(enabled/formKey) */
export function definitionPage(params: DefinitionPageParams): Observable<PageResult<WorkflowDefinition>> {
  // 取足够大的一页已发布模型(mock 数据量小),前端再分页
  return modelPage({ current: 1, size: 9999, name: params.name }).pipe(
    map((page) => {
      const defs: WorkflowDefinition[] = page.records
        .filter((m: WorkflowModel) => m.status === 'PUBLISHED')
        .map((m) => {
          const st = readState(m.id)
          return {
            id: m.id,
            processKey: m.modelKey,
            processName: m.name,
            categoryCode: m.categoryCode,
            categoryName: m.categoryName,
            version: m.version,
            enabled: st.enabled,
            formKey: st.formKey,
            createTime: m.createTime,
          }
        })
      return paginate(defs, params.current, params.size)
    }),
  )
}

/** 启用/停用 */
export function definitionSetEnabled(id: string, enabled: boolean): Observable<void> {
  const st = readState(id)
  writeState({ ...st, enabled })
  return ok(undefined as unknown as void)
}

/** 关联/清除流程表单(formKey 为 null 清除) */
export function definitionSetForm(id: string, formKey: string | null): Observable<void> {
  const st = readState(id)
  writeState({ ...st, formKey: formKey ?? undefined })
  return ok(undefined as unknown as void)
}
```

- [ ] **Step 3: Create `src/api/workflow/event.ts`:**

```ts
import type { Observable } from 'rxjs'
import type { WorkflowEventRule } from '@/types/workflow'
import { ok, readList, writeList, genId, nowStr } from './mockStore'

// 下周期真后端:POST /workflow/event/*
const KEY = 'wf_event_rules'

/** 某定义下的全部事件规则 */
export function eventList(definitionId: string): Observable<WorkflowEventRule[]> {
  return ok(readList<WorkflowEventRule>(KEY).filter((r) => r.definitionId === definitionId))
}

/** 新增/编辑事件规则(空 id 走新增) */
export function eventSave(rule: WorkflowEventRule): Observable<string> {
  const all = readList<WorkflowEventRule>(KEY)
  if (rule.id) {
    const idx = all.findIndex((r) => r.id === rule.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...rule }
    writeList(KEY, all)
    return ok(rule.id)
  }
  const id = genId()
  all.push({ ...rule, id, createTime: nowStr() })
  writeList(KEY, all)
  return ok(id)
}

/** 删除事件规则 */
export function eventDelete(id: string): Observable<void> {
  writeList(
    KEY,
    readList<WorkflowEventRule>(KEY).filter((r) => r.id !== id),
  )
  return ok(undefined as unknown as void)
}
```

- [ ] **Step 4: 验证**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new exec eslint src/api/workflow 2>&1 | grep -E "problems?|error" || echo "lint clean"`
Expected: check-types exit 0；eslint 对这些文件无 error。

- [ ] **Step 5: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/api/workflow/form.ts mes/frontend/apps/mes-new/src/api/workflow/definition.ts mes/frontend/apps/mes-new/src/api/workflow/event.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): workflow 表单/定义/事件 mock API"
```

---

## Task 3: ScriptEditor 组件

**Files:**
- Create: `src/components/ScriptEditor.tsx`

- [ ] **Step 1: Create `src/components/ScriptEditor.tsx`:**

```tsx
import { Textarea } from '@workspace/ui'
import { SCRIPT_VARIABLES } from '@/pages/workflow/formUtils'

interface ScriptEditorProps {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  invalid?: boolean
  /** 是否显示底部变量提示(默认显示) */
  showHint?: boolean
}

/** 轻量脚本编辑器：等宽 Textarea + 变量提示(mock 不执行脚本) */
export default function ScriptEditor({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  invalid,
  showHint = true,
}: ScriptEditorProps) {
  return (
    <div className="space-y-1">
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        aria-invalid={invalid}
        className="font-mono text-xs leading-relaxed"
      />
      {showHint && (
        <p className="text-[11px] text-muted-foreground">
          可用变量：{SCRIPT_VARIABLES.map((v) => `${v.token}(${v.label})`).join('、')}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: exit 0。

- [ ] **Step 3: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/components/ScriptEditor.tsx
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): 轻量 ScriptEditor 组件(等宽+变量提示)"
```

---

## Task 4: 流程表单管理页（FormList + FormWizardDialog）+ 路由 + 菜单映射

**Files:**
- Create: `src/pages/workflow/form/FormWizardDialog.tsx`
- Create: `src/pages/workflow/form/FormList.tsx`
- Modify: `src/router.tsx`
- Modify: `src/utils/urlMap.ts`

- [ ] **Step 1: Create `src/pages/workflow/form/FormWizardDialog.tsx`:**

```tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, Info, Link2, SlidersHorizontal } from 'lucide-react'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
} from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import ScriptEditor from '@/components/ScriptEditor'
import { firstValueFrom } from 'rxjs'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { formAddOrUpdate, formList } from '@/api/workflow/form'
import {
  FORM_KEY_REGEX,
  DEFAULT_TITLE_SCRIPT,
  DEFAULT_PC_URL_SCRIPT,
  DEFAULT_MOBILE_URL_SCRIPT,
} from '@/pages/workflow/formUtils'
import type { WorkflowForm } from '@/types/workflow'

interface FormWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: WorkflowForm | null
}

const schema = z.object({
  name: z.string().min(1, '请输入表单名称'),
  formKey: z.string().min(1, '请输入表单key').regex(FORM_KEY_REGEX, '以字母开头,仅字母/数字/下划线'),
  formType: z.literal('URL'),
  titleScript: z.string().min(1, '请输入流程标题生成脚本'),
  pcUrlScript: z.string().min(1, '请输入PC表单地址脚本'),
  mobileUrlScript: z.string().min(1, '请输入手机表单地址脚本'),
  skipSameAssignee: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  name: '',
  formKey: '',
  formType: 'URL',
  titleScript: DEFAULT_TITLE_SCRIPT,
  pcUrlScript: DEFAULT_PC_URL_SCRIPT,
  mobileUrlScript: DEFAULT_MOBILE_URL_SCRIPT,
  skipSameAssignee: true,
}

export default function FormWizardDialog({ open, onOpenChange, record }: FormWizardDialogProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: WorkflowForm) => formAddOrUpdate(dto))
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  useEffect(() => {
    if (open) {
      reset(
        record
          ? {
              name: record.name,
              formKey: record.formKey,
              formType: 'URL',
              titleScript: record.titleScript,
              pcUrlScript: record.pcUrlScript,
              mobileUrlScript: record.mobileUrlScript,
              skipSameAssignee: record.skipSameAssignee,
            }
          : EMPTY,
      )
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    // key 唯一性(排除自身)
    const existing = await firstValueFrom(formList())
    if (existing.some((f) => f.formKey === values.formKey && f.id !== (record?.id ?? ''))) {
      toast.error(`表单key「${values.formKey}」已存在`)
      return
    }
    const dto: WorkflowForm = { id: record?.id ?? '', ...values }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["workflow","form"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑流程表单' : '新增流程表单'}
      icon={FileText}
      description="为已发布流程配置 URL 表单与地址脚本"
      onSubmit={onSubmit}
      submitting={loading}
      contentClassName="sm:max-w-2xl"
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="表单名称" htmlFor="wf-name" required error={errors.name?.message}>
            <Input id="wf-name" aria-invalid={!!errors.name} placeholder="如 生产订单审批流程" {...register('name')} />
          </FormField>
          <FormField label="表单key" htmlFor="wf-key" required error={errors.formKey?.message}>
            <Input id="wf-key" aria-invalid={!!errors.formKey} placeholder="如 orderRecord" {...register('formKey')} />
          </FormField>
        </div>
        <FormField label="表单类型" required>
          <Controller
            control={control}
            name="formType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URL">URL表单</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title="地址脚本" icon={Link2} tag="URL表单">
        <FormField label="流程标题生成脚本" htmlFor="wf-title" required error={errors.titleScript?.message}>
          <Controller
            control={control}
            name="titleScript"
            render={({ field }) => (
              <ScriptEditor id="wf-title" value={field.value} onChange={field.onChange} invalid={!!errors.titleScript} />
            )}
          />
        </FormField>
        <FormField label="PC表单地址脚本" htmlFor="wf-pc" required error={errors.pcUrlScript?.message}>
          <Controller
            control={control}
            name="pcUrlScript"
            render={({ field }) => (
              <ScriptEditor id="wf-pc" value={field.value} onChange={field.onChange} invalid={!!errors.pcUrlScript} showHint={false} />
            )}
          />
        </FormField>
        <FormField label="手机表单地址脚本" htmlFor="wf-mobile" required error={errors.mobileUrlScript?.message}>
          <Controller
            control={control}
            name="mobileUrlScript"
            render={({ field }) => (
              <ScriptEditor id="wf-mobile" value={field.value} onChange={field.onChange} invalid={!!errors.mobileUrlScript} showHint={false} />
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title="表单选项" icon={SlidersHorizontal}>
        <Controller
          control={control}
          name="skipSameAssignee"
          render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} />
              <span>跳过相同处理人</span>
            </label>
          )}
        />
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2: Create `src/pages/workflow/form/FormList.tsx`:**

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
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import FormWizardDialog from './FormWizardDialog'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { formPage, formDelete, type FormPageParams } from '@/api/workflow/form'
import type { WorkflowForm } from '@/types/workflow'

const PAGE_SIZE = 10

export default function FormList() {
  const [params, setParams] = useState<FormPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [draftKey, setDraftKey] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WorkflowForm | null>(null)
  const [deleting, setDeleting] = useState<WorkflowForm | null>(null)

  const { data, loading } = useQuery$(['workflow', 'form', 'page', params], () => formPage(params))
  const { mutate: removeForm } = useMutation$((id: string) => formDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, name: draftName || undefined, formKey: draftKey || undefined })
  const onReset = () => {
    setDraftName('')
    setDraftKey('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeForm(deleting.id)
      toast.success('删除成功')
      invalidate('["workflow","form"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<WorkflowForm>[]>(
    () => [
      { accessorKey: 'name', header: '表单名称' },
      { accessorKey: 'formKey', header: '表单key' },
      {
        id: 'formType',
        header: '表单类型',
        cell: ({ row }) => <Badge variant="secondary">{row.original.formType === 'URL' ? 'URL表单' : row.original.formType}</Badge>,
      },
      {
        id: 'skip',
        header: '跳过相同处理人',
        cell: ({ row }) => (row.original.skipSameAssignee ? '是' : '否'),
      },
      {
        id: 'createTime',
        header: '创建时间',
        cell: ({ row }) => row.original.createTime || '-',
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
      title="流程表单管理"
      description="维护流程表单(URL表单/地址脚本),供流程定义关联"
      actions={
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          新增流程表单
        </Button>
      }
    >
      <div className="space-y-3">
        <SearchForm onSearch={onSearch} onReset={onReset}>
          <div className="space-y-1.5">
            <Label htmlFor="wf-s-name">表单名称</Label>
            <Input id="wf-s-name" className="h-9 w-40" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wf-s-key">表单key</Label>
            <Input id="wf-s-key" className="h-9 w-40" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} />
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

      <FormWizardDialog open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除流程表单「{deleting?.name}」吗?</AlertDialogDescription>
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

- [ ] **Step 3: 注册路由** — 在 `src/router.tsx`：

(a) 在第 34 行 `import ModelList ...` 之后新增：
```tsx
import FormList from '@/pages/workflow/form/FormList'
```
(b) 在第 81 行 `{ path: 'workflow/model', element: <ModelList /> },` 之后新增：
```tsx
          { path: 'workflow/form', element: <FormList /> },
```

- [ ] **Step 4: 菜单 url→路由映射** — 在 `src/utils/urlMap.ts` 的 `URL_MAP` 对象中，`'/workflow/model/list-ui': '/workflow/model',` 之后新增：
```ts
  '/workflow/form/list-ui': '/workflow/form',
```

- [ ] **Step 5: 验证**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new exec eslint . 2>&1 | grep -E "problems?" && pnpm --filter mes-new build`
Expected: check-types exit 0；eslint **0 errors**（既有 warnings 允许）；build exit 0。

- [ ] **Step 6 (manual):** SKIP — 控制器做运行时核对。

- [ ] **Step 7: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/pages/workflow/form mes/frontend/apps/mes-new/src/router.tsx mes/frontend/apps/mes-new/src/utils/urlMap.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): 流程表单管理页(列表+新增向导)"
```

---

## Task 5: 流程定义管理页（DefinitionList + AssociateFormDialog + EventConfigDialog）+ 路由 + 菜单映射

**Files:**
- Create: `src/pages/workflow/definition/AssociateFormDialog.tsx`
- Create: `src/pages/workflow/definition/EventConfigDialog.tsx`
- Create: `src/pages/workflow/definition/DefinitionList.tsx`
- Modify: `src/router.tsx`
- Modify: `src/utils/urlMap.ts`

- [ ] **Step 1: Create `src/pages/workflow/definition/AssociateFormDialog.tsx`:**

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { formList } from '@/api/workflow/form'
import { definitionSetForm } from '@/api/workflow/definition'
import type { WorkflowDefinition } from '@/types/workflow'

interface AssociateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  definition: WorkflowDefinition | null
}

const NONE = '__none__'

export default function AssociateFormDialog({ open, onOpenChange, definition }: AssociateFormDialogProps) {
  const { data: forms } = useQuery$(['workflow', 'form', 'all'], () => formList(), { enabled: open })
  const { mutate, loading } = useMutation$((arg: { id: string; formKey: string | null }) =>
    definitionSetForm(arg.id, arg.formKey),
  )
  const [selected, setSelected] = useState<string>(NONE)

  useEffect(() => {
    if (open) setSelected(definition?.formKey ?? NONE)
  }, [open, definition])

  const onSave = async () => {
    if (!definition) return
    try {
      await mutate({ id: definition.id, formKey: selected === NONE ? null : selected })
      toast.success('关联已更新')
      invalidate('["workflow","definition"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>关联流程表单</DialogTitle>
          <DialogDescription>为「{definition?.processName}」选择一个流程表单(按 key)。</DialogDescription>
        </DialogHeader>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择流程表单" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>未关联</SelectItem>
            {(forms ?? []).map((f) => (
              <SelectItem key={f.id} value={f.formKey}>
                {f.name}（{f.formKey}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSave} disabled={loading}>
            {loading ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create `src/pages/workflow/definition/EventConfigDialog.tsx`:**

```tsx
import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
} from '@workspace/ui'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { firstValueFrom } from 'rxjs'
import ScriptEditor from '@/components/ScriptEditor'
import { eventList, eventSave, eventDelete } from '@/api/workflow/event'
import {
  TRIGGER_OPTIONS,
  ACTION_OPTIONS,
  AUDIT_STATUS_OPTIONS,
  triggerLabel,
  auditStatusLabel,
  defaultEventRules,
} from '@/pages/workflow/formUtils'
import type {
  OrderAuditStatus,
  WorkflowDefinition,
  WorkflowEventActionType,
  WorkflowEventRule,
  WorkflowEventTrigger,
} from '@/types/workflow'

interface EventConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  definition: WorkflowDefinition | null
}

interface Draft {
  id: string
  name: string
  trigger: WorkflowEventTrigger
  actionType: WorkflowEventActionType
  targetStatus: OrderAuditStatus
  script: string
  enabled: boolean
}

const EMPTY_DRAFT: Draft = {
  id: '',
  name: '',
  trigger: 'START',
  actionType: 'SET_AUDIT_STATUS',
  targetStatus: 'APPROVING',
  script: '',
  enabled: true,
}

export default function EventConfigDialog({ open, onOpenChange, definition }: EventConfigDialogProps) {
  const [rules, setRules] = useState<WorkflowEventRule[]>([])
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)

  const reload = async () => {
    if (!definition) return
    setRules(await firstValueFrom(eventList(definition.id)))
  }

  useEffect(() => {
    if (open && definition) {
      setDraft(EMPTY_DRAFT)
      void reload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, definition])

  const persist = async (rule: WorkflowEventRule) => {
    await firstValueFrom(eventSave(rule))
    await reload()
  }

  const onAddOrUpdate = async () => {
    if (!definition) return
    const rule: WorkflowEventRule = {
      id: draft.id,
      definitionId: definition.id,
      name: draft.name || undefined,
      trigger: draft.trigger,
      businessType: 'ORDER_APPROVAL',
      actionType: draft.actionType,
      targetStatus: draft.actionType === 'SET_AUDIT_STATUS' ? draft.targetStatus : undefined,
      script: draft.actionType === 'SCRIPT' ? draft.script : undefined,
      enabled: draft.enabled,
    }
    if (draft.actionType === 'SCRIPT' && !draft.script.trim()) {
      toast.error('请填写脚本内容')
      return
    }
    await persist(rule)
    setDraft(EMPTY_DRAFT)
    toast.success(draft.id ? '规则已更新' : '规则已添加')
  }

  const onEdit = (r: WorkflowEventRule) => {
    setDraft({
      id: r.id,
      name: r.name ?? '',
      trigger: r.trigger,
      actionType: r.actionType,
      targetStatus: r.targetStatus ?? 'APPROVING',
      script: r.script ?? '',
      enabled: r.enabled,
    })
  }

  const onDelete = async (id: string) => {
    await firstValueFrom(eventDelete(id))
    await reload()
    if (draft.id === id) setDraft(EMPTY_DRAFT)
  }

  const onFillSample = async () => {
    if (!definition) return
    for (const d of defaultEventRules(definition.id)) {
      await firstValueFrom(
        eventSave({ id: '', ...d }),
      )
    }
    await reload()
    toast.success('已填入生产订单审批示例规则')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>流程事件配置</DialogTitle>
          <DialogDescription>
            为「{definition?.processName}」配置审批过程/结束时的业务状态同步(生产订单 audit_status)。
          </DialogDescription>
        </DialogHeader>

        {/* 编辑器 */}
        <div className="space-y-3 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>规则名称</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="可选" />
            </div>
            <div className="space-y-1.5">
              <Label>触发时机</Label>
              <Select value={draft.trigger} onValueChange={(v) => setDraft((d) => ({ ...d, trigger: v as WorkflowEventTrigger }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>同步动作</Label>
              <Select value={draft.actionType} onValueChange={(v) => setDraft((d) => ({ ...d, actionType: v as WorkflowEventActionType }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {draft.actionType === 'SET_AUDIT_STATUS' ? (
              <div className="space-y-1.5">
                <Label>目标审批状态</Label>
                <Select value={draft.targetStatus} onValueChange={(v) => setDraft((d) => ({ ...d, targetStatus: v as OrderAuditStatus }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIT_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="col-span-2 space-y-1.5">
                <Label>脚本</Label>
                <ScriptEditor value={draft.script} onChange={(v) => setDraft((d) => ({ ...d, script: v }))} />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} />
              <span>启用</span>
            </label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onFillSample}>
                <Wand2 className="size-4" />填入示例
              </Button>
              <Button size="sm" onClick={onAddOrUpdate}>
                <Plus className="size-4" />{draft.id ? '更新规则' : '添加规则'}
              </Button>
            </div>
          </div>
        </div>

        {/* 规则列表 */}
        <div className="space-y-2">
          {rules.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">暂无事件规则</p>}
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{triggerLabel(r.trigger)}</Badge>
                <span className="text-muted-foreground">→</span>
                <span>
                  {r.actionType === 'SET_AUDIT_STATUS' ? `设置审批状态 = ${auditStatusLabel(r.targetStatus)}` : '执行脚本'}
                </span>
                {!r.enabled && <Badge variant="secondary">已停用</Badge>}
                {r.name && <span className="text-xs text-muted-foreground">({r.name})</span>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)}>编辑</Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onDelete(r.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Create `src/pages/workflow/definition/DefinitionList.tsx`:**

```tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Button, DataTable, Input, Label, toast } from '@workspace/ui'
import { FileText, Power, Workflow } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import AssociateFormDialog from './AssociateFormDialog'
import EventConfigDialog from './EventConfigDialog'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { definitionPage, definitionSetEnabled, type DefinitionPageParams } from '@/api/workflow/definition'
import type { WorkflowDefinition } from '@/types/workflow'

const PAGE_SIZE = 10

export default function DefinitionList() {
  const [params, setParams] = useState<DefinitionPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [associating, setAssociating] = useState<WorkflowDefinition | null>(null)
  const [eventing, setEventing] = useState<WorkflowDefinition | null>(null)

  const { data, loading } = useQuery$(['workflow', 'definition', 'page', params], () => definitionPage(params))
  const { mutate: toggleEnabled } = useMutation$((arg: { id: string; enabled: boolean }) =>
    definitionSetEnabled(arg.id, arg.enabled),
  )

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, name: draftName || undefined })
  const onReset = () => {
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const onToggle = async (d: WorkflowDefinition) => {
    try {
      await toggleEnabled({ id: d.id, enabled: !d.enabled })
      toast.success(d.enabled ? '已停用' : '已启用')
      invalidate('["workflow","definition"')
    } catch {
      /* 拦截器已 toast */
    }
  }

  const columns = useMemo<ColumnDef<WorkflowDefinition>[]>(
    () => [
      { accessorKey: 'processName', header: '流程名称' },
      { accessorKey: 'processKey', header: 'processKey' },
      { id: 'category', header: '分类', cell: ({ row }) => row.original.categoryName || '-' },
      { id: 'version', header: '版本', cell: ({ row }) => `v${row.original.version}` },
      {
        id: 'enabled',
        header: '状态',
        cell: ({ row }) =>
          row.original.enabled ? <Badge>启用</Badge> : <Badge variant="secondary">停用</Badge>,
      },
      {
        id: 'formKey',
        header: '关联表单',
        cell: ({ row }) =>
          row.original.formKey ? (
            <Badge variant="outline">{row.original.formKey}</Badge>
          ) : (
            <span className="text-muted-foreground">未关联</span>
          ),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onToggle(row.original)}>
              <Power className="size-4" />
              {row.original.enabled ? '停用' : '启用'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAssociating(row.original)}>
              <FileText className="size-4" />
              关联表单
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEventing(row.original)}>
              <Workflow className="size-4" />
              流程事件
            </Button>
          </div>
        ),
      },
    ],
    // onToggle 用到的 mutate 引用稳定,空依赖可接受(对齐 CategoryList 列定义风格)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <PageContainer title="流程定义管理" description="已发布流程定义:启用停用、关联表单、配置流程事件">
      <div className="space-y-3">
        <SearchForm onSearch={onSearch} onReset={onReset}>
          <div className="space-y-1.5">
            <Label htmlFor="wd-s-name">流程名称</Label>
            <Input id="wd-s-name" className="h-9 w-40" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
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

      <AssociateFormDialog open={!!associating} onOpenChange={(o) => !o && setAssociating(null)} definition={associating} />
      <EventConfigDialog open={!!eventing} onOpenChange={(o) => !o && setEventing(null)} definition={eventing} />
    </PageContainer>
  )
}
```

- [ ] **Step 4: 注册路由** — 在 `src/router.tsx`：

(a) 在 Task 4 新增的 `import FormList ...` 之后新增：
```tsx
import DefinitionList from '@/pages/workflow/definition/DefinitionList'
```
(b) 在 `{ path: 'workflow/form', element: <FormList /> },` 之后新增：
```tsx
          { path: 'workflow/definition', element: <DefinitionList /> },
```

- [ ] **Step 5: 菜单 url→路由映射** — 在 `src/utils/urlMap.ts` 的 `URL_MAP` 中，Task 4 新增的 `'/workflow/form/list-ui': '/workflow/form',` 之后新增：
```ts
  '/workflow/definition/list-ui': '/workflow/definition',
```

- [ ] **Step 6: 验证**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new exec eslint . 2>&1 | grep -E "problems?" && pnpm --filter mes-new test && pnpm --filter mes-new build`
Expected: check-types exit 0；eslint **0 errors**；vitest 全绿；build exit 0。

- [ ] **Step 7 (manual):** SKIP — 控制器做运行时核对。

- [ ] **Step 8: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/pages/workflow/definition mes/frontend/apps/mes-new/src/router.tsx mes/frontend/apps/mes-new/src/utils/urlMap.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): 流程定义管理页(启用停用/关联表单/流程事件)"
```

---

## Task 6: 菜单 seed SQL

**Files:**
- Create: `scripts/sql/workflow-form-event-config.sql`

- [ ] **Step 1: Create `scripts/sql/workflow-form-event-config.sql`:**

```sql
-- 流程配置工具新增菜单:流程表单管理 / 流程定义管理(挂在 sp_sys_menu#19 流程配置工具下)
-- 列序: id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username
-- 注:前端 urlMap 将 /workflow/form/list-ui → /workflow/form, /workflow/definition/list-ui → /workflow/definition

-- 流程表单管理
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '193', 'workflowForm', '流程表单管理', '/workflow/form/list-ui', '19', '3', 3, '0', 'workflow:form:list', 'form', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '193');

-- 流程定义管理
INSERT INTO sp_sys_menu (id, code, name, url, parent_id, grade, sort_num, type, permission, icon, descr, create_time, create_username, update_time, update_username)
SELECT '194', 'workflowDefinition', '流程定义管理', '/workflow/definition/list-ui', '19', '3', 4, '0', 'workflow:definition:list', 'partition', '', NOW(), 'admin', NOW(), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_sys_menu WHERE id = '194');
```

- [ ] **Step 2: 校验 SQL 与既有 seed 一致** — 对照 `scripts/sql/workflow-flow-config.sql` 列序、parent_id='19'、grade='3'、id 不冲突（已用 19/191/192，本次用 193/194）。无法在无数据库环境执行，仅静态核对。

- [ ] **Step 3: Commit**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add scripts/sql/workflow-form-event-config.sql
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(sql): 流程表单管理/流程定义管理 菜单种子"
```

---

## 最终验证（对照 spec §10）

- [ ] `pnpm --filter mes-new check-types` 通过
- [ ] `pnpm --filter mes-new exec eslint .` → 0 errors
- [ ] `pnpm --filter mes-new test` 全绿（含 formUtils 用例）
- [ ] `pnpm --filter mes-new build` 通过
- [ ] 运行时 `:4100` 五项人工核对（见 spec §10）：新增表单(orderRecord)、编辑删除、定义管理启停/关联/事件、事件增改删+示例、原 category/model 不回归。
