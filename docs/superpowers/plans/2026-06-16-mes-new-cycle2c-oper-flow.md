# 工艺路线核心(工序 Oper + 工艺路线 Flow)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development。每任务带完整代码;按顺序实现(后置任务依赖前置文件)。

**Goal:** 在 `mes-new` 重建「工序 Oper」完整 CRUD + 「工艺路线 Flow」列表与工序编排(双栏穿梭 + 右栏有序流水线),后端仅新增一个只读接口。

**Architecture:** 后端纯新增 `/basedata/flow/process/opers/{flowId}` GET(转调已有 service)。前端:types → api → 纯工具函数(TDD)→ `OrderedTransfer` 组件 → Oper 表单/列表 → Flow 编排器/列表 → 路由。全程复用既有 `FormDialog/FormField/DataTable/SearchForm/PageContainer/PermissionGuard` 与 `http` 数据层。

**Tech Stack:** React 19 + TS + Vite + shadcn `@workspace/ui` + react-hook-form + zod + `@ngify/http`/rxjs;后端 Spring Boot 2.1。参考 spec:`docs/superpowers/specs/2026-06-16-mes-new-cycle2c-oper-flow-design.md`。

**验证基线:** mes-new lint = 0 error / 9 warnings(**不得新增 warning**,尤其 `react-hooks/set-state-in-effect`——故编辑态初始化一律用 rhf `reset`,不在 effect 里 setState)。验证命令统一在 `mes/frontend/` 执行。

前端路径相对 `mes/frontend/apps/mes-new/`。

---

## Task 1:后端新增只读接口 `/opers/{flowId}`

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/technology/controller/SpFlowOperRelationController.java`

- [ ] **Step 1:确认 import**——文件顶部需有 `import org.springframework.web.bind.annotation.PathVariable;`(若无则添加;`@GetMapping`、`@ResponseBody`、`Result`、`iSpFlowOperRelationService` 字段均已存在)。

- [ ] **Step 2:在 `add-or-update` 方法之后、`delete` 方法之前插入**

```java
    /**
     * 查询流程下有序工序链(按 sortNum 升序),供前端编辑态回填
     *
     * @param flowId 流程ID
     * @return Result 有序工序穿梭对象列表
     */
    @ApiOperation("查询流程下有序工序链")
    @GetMapping("/opers/{flowId}")
    @ResponseBody
    public Result opers(@PathVariable String flowId) throws Exception {
        return Result.success(iSpFlowOperRelationService.currentOperViewServer(flowId));
    }
```

- [ ] **Step 3:编译验证**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS(无编译错误)

- [ ] **Step 4:提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/technology/controller/SpFlowOperRelationController.java
git commit -m "✨ feat(technology): SpFlowOperRelation 新增按 flowId 取有序工序链只读接口"
```

---

## Task 2:前端类型 `types/technology.ts`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/types/technology.ts`

- [ ] **Step 1:创建文件**

```ts
/** 工序(sp_oper) */
export interface SpOper {
  id: string
  oper?: string
  operCode?: string
  operDesc: string
  processUnitId?: string
  laborHours?: number
  manufacturingCycle?: number
  generatePlan?: string
  remark?: string
}

/** 加工单元下拉项 */
export interface SpProcessUnitOption {
  id: string
  code: string
  name: string
}

/** 工艺路线(sp_flow) */
export interface SpFlow {
  id: string
  flow: string
  flowDesc?: string
  /** 后端自动生成的工序链字符串,分隔符 "->" */
  process?: string
}

/** 流程-工序穿梭对象 */
export interface SpOperVo {
  value: string
  title: string
}

/** 工艺路线级联保存入参 */
export interface SpFlowDtoReq {
  id?: string
  flow: string
  flowDesc?: string
  spOperVoList: SpOperVo[]
}
```

- [ ] **Step 2:类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3:提交**

```bash
git add mes/frontend/apps/mes-new/src/types/technology.ts
git commit -m "✨ feat(mes-new): 新增工艺(Oper/Flow)类型定义"
```

---

## Task 3:工序 API `api/basedata/oper.ts`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/api/basedata/oper.ts`

- [ ] **Step 1:创建文件**

```ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpOper, SpProcessUnitOption } from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface OperPageParams extends PageParams {
  operDescLike?: string
}

/** 工序分页(表单编码) */
export function operPage(params: OperPageParams) {
  return http.post<PageResult<SpOper>>('/basedata/sp-oper/page', params)
}

/** 工序全量(下拉) */
export function operList() {
  return http.get<SpOper[]>('/basedata/sp-oper/list')
}

/** 新增/修改(表单编码,operCode 后端自动生成) */
export function operAddOrUpdate(record: Partial<SpOper>) {
  return http.post<string>('/basedata/sp-oper/add-or-update', record)
}

/** 删除(@RequestBody JSON {id}) */
export function operDelete(id: string) {
  return http.post<void>('/basedata/sp-oper/delete', { id }, JSON_HEADERS)
}

/** 加工单元下拉 */
export function operProcessUnits() {
  return http.get<SpProcessUnitOption[]>('/basedata/sp-oper/process-units')
}
```

- [ ] **Step 2:类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3:提交**

```bash
git add mes/frontend/apps/mes-new/src/api/basedata/oper.ts
git commit -m "✨ feat(mes-new): 新增工序 Oper API"
```

---

## Task 4:工艺路线 API `api/technology/flow.ts`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/api/technology/flow.ts`

- [ ] **Step 1:创建文件**

```ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpFlow, SpOperVo, SpFlowDtoReq } from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 工艺路线分页(表单编码) */
export function flowPage(params: PageParams) {
  return http.post<PageResult<SpFlow>>('/basedata/flow/page', params)
}

/** 按 id 查工艺路线主信息(不含工序链) */
export function flowGetById(id: string) {
  return http.get<SpFlow>(`/basedata/flow/get-by-id?id=${encodeURIComponent(id)}`)
}

/** 级联保存(@RequestBody JSON;后端按顺序推导 sortNum/前后道/首末道/process) */
export function flowSaveProcess(body: SpFlowDtoReq) {
  return http.post<unknown>('/basedata/flow/process/add-or-update', body, JSON_HEADERS)
}

/** 删除(表单编码 {id};后端按 flow_id 级联删关系) */
export function flowDelete(id: string) {
  return http.post<unknown>('/basedata/flow/process/delete', { id })
}

/** 取有序工序链(编辑态回填) */
export function flowOpers(flowId: string) {
  return http.get<SpOperVo[]>(`/basedata/flow/process/opers/${encodeURIComponent(flowId)}`)
}
```

- [ ] **Step 2:类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3:提交**

```bash
git add mes/frontend/apps/mes-new/src/api/technology/flow.ts
git commit -m "✨ feat(mes-new): 新增工艺路线 Flow API"
```

---

## Task 5:纯工具函数 `moveItem`(TDD)

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/utils/transfer.ts`
- Modify: `mes/frontend/apps/mes-new/src/utils/__tests__/transfer.test.ts`

- [ ] **Step 1:先写失败测试**——在 `transfer.test.ts` 顶部 import 改为:

```ts
import { describe, it, expect } from 'vitest'
import { filterTransferItems, excludeSelected, moveItem } from '../transfer'
```

文件末尾追加:

```ts
describe('moveItem', () => {
  const list = ['a', 'b', 'c', 'd']
  it('向后移动', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })
  it('向前移动', () => {
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })
  it('同位返回原序副本(新数组实例)', () => {
    const r = moveItem(list, 1, 1)
    expect(r).toEqual(list)
    expect(r).not.toBe(list)
  })
  it('越界返回原序副本', () => {
    expect(moveItem(list, -1, 2)).toEqual(list)
    expect(moveItem(list, 0, 9)).toEqual(list)
  })
})
```

- [ ] **Step 2:运行测试确认失败** — Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/utils/__tests__/transfer.test.ts` → Expected: FAIL(`moveItem is not a function`)

- [ ] **Step 3:实现**——在 `transfer.ts` 末尾追加:

```ts
/** 在数组中把 from 位置的元素移动到 to 位置,返回新数组(越界或同位返回原序副本) */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  if (
    from < 0 || from >= next.length ||
    to < 0 || to >= next.length ||
    from === to
  ) {
    return next
  }
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
```

- [ ] **Step 4:运行测试确认通过** — Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/utils/__tests__/transfer.test.ts` → Expected: PASS(全部用例)
- [ ] **Step 5:提交**

```bash
git add mes/frontend/apps/mes-new/src/utils/transfer.ts mes/frontend/apps/mes-new/src/utils/__tests__/transfer.test.ts
git commit -m "✨ feat(mes-new): transfer 工具新增 moveItem(有序重排) + 单测"
```

---

## Task 6:招牌组件 `OrderedTransfer`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/components/OrderedTransfer.tsx`

依赖:Task 5 的 `moveItem`、既有 `excludeSelected`/`filterTransferItems`/`TransferItem`。

- [ ] **Step 1:创建文件**

```tsx
import { useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, ChevronUp, GripVertical, Search, X } from 'lucide-react'
import { Badge, Button, Input, ScrollArea, cn } from '@workspace/ui'
import { excludeSelected, filterTransferItems, moveItem, type TransferItem } from '@/utils/transfer'

export interface OrderedTransferProps {
  /** 全量候选 */
  candidates: TransferItem[]
  /** 已选有序列表(受控) */
  value: TransferItem[]
  onChange: (next: TransferItem[]) => void
  leftTitle?: string
  rightTitle?: string
  firstLabel?: string
  lastLabel?: string
  className?: string
}

export default function OrderedTransfer({
  candidates,
  value,
  onChange,
  leftTitle = '可选工序',
  rightTitle = '工序流水线',
  firstLabel = '首道',
  lastLabel = '末道',
  className,
}: OrderedTransferProps) {
  const [leftKw, setLeftKw] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const selectedIds = useMemo(() => value.map((v) => v.id), [value])
  const leftItems = useMemo(
    () => filterTransferItems(excludeSelected(candidates, selectedIds), leftKw),
    [candidates, selectedIds, leftKw],
  )

  const add = (item: TransferItem) => onChange([...value, item])
  const remove = (id: string) => onChange(value.filter((v) => v.id !== id))
  const move = (from: number, to: number) => onChange(moveItem(value, from, to))

  const handleDrop = (to: number) => {
    if (dragIndex === null) return
    move(dragIndex, to)
    setDragIndex(null)
  }

  return (
    <div className={cn('grid gap-4 lg:grid-cols-2', className)}>
      {/* 左:可选工序池 */}
      <div className="flex flex-col rounded-lg border">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{leftTitle}</span>
          <Badge variant="secondary">{leftItems.length}</Badge>
        </div>
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8"
              placeholder="搜索工序"
              value={leftKw}
              onChange={(e) => setLeftKw(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="h-80">
          <ul className="px-2 pb-2">
            {leftItems.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => add(it)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{it.primary}</span>
                    {it.secondary && (
                      <span className="block truncate text-xs text-muted-foreground">{it.secondary}</span>
                    )}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
            {leftItems.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">无可选工序</li>
            )}
          </ul>
        </ScrollArea>
      </div>

      {/* 右:工序流水线(有序、可重排) */}
      <div className="flex flex-col rounded-lg border">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{rightTitle}</span>
          <Badge variant="secondary">{value.length}</Badge>
        </div>
        <ScrollArea className="h-80">
          <ul className="space-y-1 p-2">
            {value.map((it, idx) => {
              const isFirst = idx === 0
              const isLast = idx === value.length - 1
              return (
                <li
                  key={it.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(idx)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 transition-colors hover:bg-accent',
                    dragIndex === idx && 'opacity-50',
                  )}
                >
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                  <span className="grid size-5 shrink-0 place-items-center rounded bg-muted text-xs font-medium text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm">{it.primary}</span>
                      {value.length >= 2 && isFirst && <Badge className="shrink-0">{firstLabel}</Badge>}
                      {value.length >= 2 && isLast && (
                        <Badge variant="secondary" className="shrink-0">{lastLabel}</Badge>
                      )}
                    </span>
                    {it.secondary && (
                      <span className="block truncate text-xs text-muted-foreground">{it.secondary}</span>
                    )}
                  </span>
                  <div className="flex shrink-0 items-center">
                    <Button type="button" variant="ghost" size="icon-sm" disabled={isFirst} onClick={() => move(idx, idx - 1)}>
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={isLast} onClick={() => move(idx, idx + 1)}>
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(it.id)}>
                      <X className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              )
            })}
            {value.length === 0 && (
              <li className="px-2 py-10 text-center text-sm text-muted-foreground">
                请从左侧添加工序(至少 2 个)
              </li>
            )}
          </ul>
        </ScrollArea>
        {/* 工序链预览 */}
        <div className="border-t px-3 py-2">
          {value.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {value.map((it, idx) => (
                <span key={it.id} className="flex items-center gap-1">
                  <span className="rounded bg-muted px-1.5 py-0.5">{it.primary}</span>
                  {idx < value.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">工序链预览</span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2:类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3:提交**

```bash
git add mes/frontend/apps/mes-new/src/components/OrderedTransfer.tsx
git commit -m "✨ feat(mes-new): 新增 OrderedTransfer(双栏穿梭+右栏有序流水线)"
```

---

## Task 7:工序表单 `OperForm`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/basedata/oper/OperForm.tsx`

- [ ] **Step 1:创建文件**

```tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  toast,
} from '@workspace/ui'
import { Cog, Info } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { operAddOrUpdate, operProcessUnits } from '@/api/basedata/oper'
import type { SpOper } from '@/types/technology'

const schema = z
  .object({
    operDesc: z.string().min(1, '请输入工序描述'),
    processUnitId: z.string().optional(),
    laborHours: z.coerce.number({ invalid_type_error: '请输入工时' }).int('需为整数').min(1, '工时至少 1 分钟'),
    manufacturingCycle: z.coerce
      .number({ invalid_type_error: '请输入制造周期' })
      .int('需为整数')
      .min(1, '制造周期至少 1 分钟'),
    generatePlan: z.enum(['0', '1']),
    remark: z.string().optional(),
  })
  .refine((d) => d.manufacturingCycle > d.laborHours, {
    message: '制造周期必须大于工时',
    path: ['manufacturingCycle'],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpOper | null
}

export default function OperForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { data: units } = useQuery$(['oper', 'process-units'], () => operProcessUnits(), { enabled: open })
  const { mutate, loading } = useMutation$((dto: Partial<SpOper>) => operAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { operDesc: '', processUnitId: '', laborHours: 1, manufacturingCycle: 2, generatePlan: '1', remark: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        operDesc: record?.operDesc ?? '',
        processUnitId: record?.processUnitId ?? '',
        laborHours: record?.laborHours ?? 1,
        manufacturingCycle: record?.manufacturingCycle ?? 2,
        generatePlan: record?.generatePlan === '0' ? '0' : '1',
        remark: record?.remark ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        id: record?.id,
        operDesc: values.operDesc,
        processUnitId: values.processUnitId ?? '',
        laborHours: values.laborHours,
        manufacturingCycle: values.manufacturingCycle,
        generatePlan: values.generatePlan,
        remark: values.remark ?? '',
      })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["oper","page"')
      onOpenChange(false)
    } catch {
      /* 错误已由响应拦截器 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑工序' : '新增工序'}
      description="维护工序基础数据"
      icon={Cog}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info}>
        <FormField label="工序描述" htmlFor="oper-desc" required error={errors.operDesc?.message}>
          <Input id="oper-desc" placeholder="如:主板组装作业工序" aria-invalid={!!errors.operDesc} {...register('operDesc')} />
        </FormField>
        <FormField label="加工单元" htmlFor="oper-unit">
          <Controller
            control={control}
            name="processUnitId"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="oper-unit" className="w-full">
                  <SelectValue placeholder="请选择加工单元" />
                </SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.code} - {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="工时(分钟)" htmlFor="oper-lh" required error={errors.laborHours?.message}>
            <Input id="oper-lh" type="number" min={1} aria-invalid={!!errors.laborHours} {...register('laborHours')} />
          </FormField>
          <FormField label="制造周期(分钟)" htmlFor="oper-mc" required error={errors.manufacturingCycle?.message}>
            <Input id="oper-mc" type="number" min={1} aria-invalid={!!errors.manufacturingCycle} {...register('manufacturingCycle')} />
          </FormField>
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label htmlFor="oper-gp">是否生成生产计划</Label>
          <Controller
            control={control}
            name="generatePlan"
            render={({ field }) => (
              <Switch id="oper-gp" checked={field.value === '1'} onCheckedChange={(v) => field.onChange(v ? '1' : '0')} />
            )}
          />
        </div>
        <FormField label="备注" htmlFor="oper-remark">
          <Textarea id="oper-remark" {...register('remark')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2:类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3:提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/basedata/oper/OperForm.tsx
git commit -m "✨ feat(mes-new): 工序新增/编辑表单(周期>工时校验)"
```

---

## Task 8:工序列表 `OperList`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/basedata/oper/OperList.tsx`

- [ ] **Step 1:创建文件**

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
import PermissionGuard from '@/components/PermissionGuard'
import OperForm from './OperForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { operPage, operDelete, type OperPageParams } from '@/api/basedata/oper'
import type { SpOper } from '@/types/technology'

const PAGE_SIZE = 10

export default function OperList() {
  const [params, setParams] = useState<OperPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftDesc, setDraftDesc] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpOper | null>(null)
  const [deleting, setDeleting] = useState<SpOper | null>(null)

  const { data, loading } = useQuery$(['oper', 'page', params], () => operPage(params))
  const { mutate: removeOper } = useMutation$((id: string) => operDelete(id))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, operDescLike: draftDesc || undefined })
  const onReset = () => {
    setDraftDesc('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeOper(deleting.id)
      toast.success('删除成功')
      invalidate('["oper","page"')
    } catch {
      /* toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpOper>[]>(
    () => [
      { accessorKey: 'operCode', header: '工序编号', cell: ({ row }) => row.original.operCode || '—' },
      { accessorKey: 'operDesc', header: '工序描述' },
      { accessorKey: 'laborHours', header: '工时(分钟)', cell: ({ row }) => row.original.laborHours ?? '—' },
      { accessorKey: 'manufacturingCycle', header: '制造周期(分钟)', cell: ({ row }) => row.original.manufacturingCycle ?? '—' },
      {
        accessorKey: 'generatePlan',
        header: '生成计划',
        cell: ({ row }) =>
          row.original.generatePlan === '1' ? <Badge>是</Badge> : <Badge variant="secondary">否</Badge>,
      },
      {
        accessorKey: 'remark',
        header: '备注',
        cell: ({ row }) => <span className="block max-w-[16rem] truncate text-muted-foreground">{row.original.remark || '—'}</span>,
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
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
      title="工序管理"
      description="维护工序基础数据及工时 / 制造周期"
      actions={
        <PermissionGuard perm="oper:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建工序
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-oper-desc">工序描述</Label>
          <Input id="s-oper-desc" className="h-9 w-56" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
        </div>
      </SearchForm>

      <DataTable
        columns={columns}
        data={data?.records ?? []}
        loading={loading}
        loadingRowCount={PAGE_SIZE}
        pagination={{
          mode: 'server',
          pageIndex: (data?.current ?? params.current) - 1,
          pageSize: PAGE_SIZE,
          totalPages: data?.pages ?? 1,
          totalRows: data?.total,
          onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
        }}
      />

      <OperForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除工序「{deleting?.operDesc}」吗?</AlertDialogDescription>
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

- [ ] **Step 2:类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3:提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/basedata/oper/OperList.tsx
git commit -m "✨ feat(mes-new): 工序列表(分页+描述搜索+增删改)"
```

---

## Task 9:工艺路线编排器 `FlowProcessEditor`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/technology/flow/FlowProcessEditor.tsx`

依赖:Task 6 `OrderedTransfer`、Task 3/4 API。**编辑态初始化用 rhf `reset`(含 opers 数组字段),不在 effect 里 setState。**

- [ ] **Step 1:创建文件**

```tsx
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, toast } from '@workspace/ui'
import { Info, ListOrdered, Route } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import OrderedTransfer from '@/components/OrderedTransfer'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { operList } from '@/api/basedata/oper'
import { flowOpers, flowSaveProcess } from '@/api/technology/flow'
import type { SpFlow, SpFlowDtoReq } from '@/types/technology'
import type { TransferItem } from '@/utils/transfer'

const transferItemSchema = z.object({
  id: z.string(),
  primary: z.string(),
  secondary: z.string().optional(),
})

const schema = z.object({
  flow: z.string().min(1, '请输入流程代码'),
  flowDesc: z.string().min(1, '请输入流程描述'),
  opers: z.array(transferItemSchema).min(2, '工艺路线至少需要 2 个工序'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpFlow | null
}

export default function FlowProcessEditor({ open, onOpenChange, record }: Props) {
  const isEdit = !!record

  const { data: opers } = useQuery$(['oper', 'list'], () => operList(), { enabled: open })
  const { data: chain } = useQuery$(
    ['flow', 'opers', record?.id ?? ''],
    () => flowOpers(record!.id),
    { enabled: open && isEdit },
  )
  const { mutate, loading } = useMutation$((body: SpFlowDtoReq) => flowSaveProcess(body))

  const candidates = useMemo<TransferItem[]>(
    () => (opers ?? []).map((o) => ({ id: o.id, primary: o.operDesc, secondary: o.operCode })),
    [opers],
  )
  const candidateById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates])

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { flow: '', flowDesc: '', opers: [] },
  })

  // 初始化仅用 reset(非 setState),避免 react-hooks/set-state-in-effect 警告。
  // 新增:开窗即置空;编辑:待工序链(chain)到达后用 reset 回填。
  useEffect(() => {
    if (!open) return
    if (isEdit) {
      if (!chain) return
      reset({
        flow: record?.flow ?? '',
        flowDesc: record?.flowDesc ?? '',
        opers: chain.map((vo) => ({
          id: vo.value,
          primary: vo.title,
          secondary: candidateById.get(vo.value)?.secondary,
        })),
      })
    } else {
      reset({ flow: '', flowDesc: '', opers: [] })
    }
  }, [open, isEdit, chain, candidateById, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        id: record?.id,
        flow: values.flow,
        flowDesc: values.flowDesc,
        spOperVoList: values.opers.map((o) => ({ value: o.id, title: o.primary })),
      })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["flow","page"')
      onOpenChange(false)
    } catch {
      /* toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑工艺路线' : '新增工艺路线'}
      description="编排工序生成工艺路线(至少 2 个工序)"
      icon={Route}
      onSubmit={onSubmit}
      submitting={loading}
      contentClassName="sm:max-w-3xl"
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="流程代码" htmlFor="flow-code" required error={errors.flow?.message}>
            <Input id="flow-code" aria-invalid={!!errors.flow} {...register('flow')} />
          </FormField>
          <FormField label="流程描述" htmlFor="flow-desc" required error={errors.flowDesc?.message}>
            <Input id="flow-desc" aria-invalid={!!errors.flowDesc} {...register('flowDesc')} />
          </FormField>
        </div>
      </FormSection>
      <FormSection title="工序编排" icon={ListOrdered} tag="拖拽 / 上下移调整顺序">
        <Controller
          control={control}
          name="opers"
          render={({ field }) => (
            <OrderedTransfer candidates={candidates} value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.opers && <p className="text-xs text-destructive">{errors.opers.message}</p>}
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2:类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3:Lint(确认无新增 set-state-in-effect 警告)** — Run: `cd mes/frontend && pnpm --filter mes-new lint` → Expected: 0 error / ≤9 warnings
- [ ] **Step 4:提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/technology/flow/FlowProcessEditor.tsx
git commit -m "✨ feat(mes-new): 工艺路线编排器(双栏穿梭+有序流水线,编辑态回填工序链)"
```

---

## Task 10:工艺路线列表 `FlowList`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/technology/flow/FlowList.tsx`

- [ ] **Step 1:创建文件**

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
  toast,
} from '@workspace/ui'
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import PermissionGuard from '@/components/PermissionGuard'
import FlowProcessEditor from './FlowProcessEditor'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { flowPage, flowDelete } from '@/api/technology/flow'
import type { PageParams } from '@/types/api'
import type { SpFlow } from '@/types/technology'

const PAGE_SIZE = 10

export default function FlowList() {
  const [params, setParams] = useState<PageParams>({ current: 1, size: PAGE_SIZE })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpFlow | null>(null)
  const [deleting, setDeleting] = useState<SpFlow | null>(null)

  const { data, loading } = useQuery$(['flow', 'page', params], () => flowPage(params))
  const { mutate: removeFlow } = useMutation$((id: string) => flowDelete(id))

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeFlow(deleting.id)
      toast.success('删除成功')
      invalidate('["flow","page"')
    } catch {
      /* toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpFlow>[]>(
    () => [
      { accessorKey: 'flow', header: '流程代码' },
      { accessorKey: 'flowDesc', header: '流程描述', cell: ({ row }) => row.original.flowDesc || '—' },
      {
        accessorKey: 'process',
        header: '工序链',
        cell: ({ row }) => {
          const p = row.original.process
          if (!p) return <span className="text-muted-foreground">—</span>
          const parts = p.split('->')
          return (
            <div className="flex flex-wrap items-center gap-1">
              {parts.map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  <Badge variant="secondary" className="font-normal">{s}</Badge>
                  {i < parts.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                </span>
              ))}
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
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
      title="工艺路线管理"
      description="编排工序生成工艺路线"
      actions={
        <PermissionGuard perm="flow:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建工艺路线
          </Button>
        </PermissionGuard>
      }
    >
      <DataTable
        columns={columns}
        data={data?.records ?? []}
        loading={loading}
        loadingRowCount={PAGE_SIZE}
        pagination={{
          mode: 'server',
          pageIndex: (data?.current ?? params.current) - 1,
          pageSize: PAGE_SIZE,
          totalPages: data?.pages ?? 1,
          totalRows: data?.total,
          onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
        }}
      />

      <FlowProcessEditor open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除工艺路线「{deleting?.flow}」吗?将同时删除其工序关系。</AlertDialogDescription>
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

- [ ] **Step 2:类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3:提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/technology/flow/FlowList.tsx
git commit -m "✨ feat(mes-new): 工艺路线列表(工序链 chips + 增删改)"
```

---

## Task 11:注册路由

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1:加 import**(放在 `WarehouseList` import 之后):

```tsx
import OperList from '@/pages/basedata/oper/OperList'
import FlowList from '@/pages/technology/flow/FlowList'
```

- [ ] **Step 2:加路由**(在 `basedata/warehouse` 行之后插入):

```tsx
          { path: 'basedata/oper', element: <OperList /> },
          { path: 'technology/flow', element: <FlowList /> },
```

- [ ] **Step 3:类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 4:提交**

```bash
git add mes/frontend/apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 注册工序/工艺路线路由"
```

---

## Task 12:全量验证

**Files:** 无(仅验证)

- [ ] **Step 1:类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 2:单测** — Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run` → Expected: 全部 PASS(含新增 moveItem 用例)
- [ ] **Step 3:Lint** — Run: `cd mes/frontend && pnpm --filter mes-new lint` → Expected: 0 error / ≤9 warnings(无新增)
- [ ] **Step 4:构建** — Run: `cd mes/frontend && pnpm --filter mes-new build` → Expected: 构建成功
- [ ] **Step 5:后端编译** — Run: `cd mes && mvn -q -DskipTests compile` → Expected: BUILD SUCCESS
- [ ] **Step 6:(如有遗留修复)** 按文件 `git add` + `git commit -m "🐛 fix(mes-new): 修复 <具体问题>"`

---

## Self-Review(计划自检)

- **Spec coverage**:spec §4.3 后端接口 → T1;§5 文件结构逐一 → T2–T11;§11 验证 → T12。无遗漏。
- **Placeholder scan**:无 TBD/TODO,每步含完整代码与确切命令。
- **Type consistency**:`SpOper/SpFlow/SpOperVo/SpFlowDtoReq` 在 T2 定义,T3/T4/T7/T8/T9/T10 用法一致;`OrderedTransfer` props(`candidates/value/onChange`)在 T6 定义,T9 用法一致;`moveItem` 在 T5 定义并测试,T6 调用;`TransferItem` 复用既有定义;invalidate 前缀(`["oper","page"` / `["flow","page"`)与各 List 查询键一致。
- **Lint 风险**:FlowProcessEditor 编辑态初始化用 `reset`(非 setState),规避 `react-hooks/set-state-in-effect`;T9 专设 lint 步骤把关。
