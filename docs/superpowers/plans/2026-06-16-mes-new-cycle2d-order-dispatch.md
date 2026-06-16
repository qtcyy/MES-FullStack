# 生产订单 + 派工(Order + Dispatch)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development。按顺序实现(后置依赖前置)。后端多为 AI 生成,T1 需审查+修正。

**Goal:** 重建生产订单 CRUD + 派工,形成"下单→派工"闭环;修正订单后端坏代码。
**Tech:** React19+TS+shadcn+rhf+zod+rxjs;后端 Spring Boot 2.1。参考 spec:`docs/superpowers/specs/2026-06-16-mes-new-cycle2d-order-dispatch-design.md`。
**基线:** mes-new lint = 0 error / 9 warnings(不得新增,尤其 set-state-in-effect)。前端路径相对 `mes/frontend/apps/mes-new/`,验证命令在 `mes/frontend/` 执行。

---

## Task 1:后端审查 + 修正(订单)

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/order/request/SpOrderReq.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/order/controller/SpOrderController.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/order/entity/SpOrder.java`(仅改 statue 注释)
- Review: `mes/src/main/java/com/wangziyang/mes/order/service/impl/SpDispatchServiceImpl.java`(通读确认/修 bug)

- [ ] **Step 1:新建 SpOrderReq.java**

```java
package com.wangziyang.mes.order.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 生产订单分页请求
 */
public class SpOrderReq extends BasePageReq {
    /** 工单编号模糊查询 */
    private String orderCodeLike;
    /** 物料编码模糊查询 */
    private String materielLike;

    public String getOrderCodeLike() { return orderCodeLike; }
    public void setOrderCodeLike(String orderCodeLike) { this.orderCodeLike = orderCodeLike; }
    public String getMaterielLike() { return materielLike; }
    public void setMaterielLike(String materielLike) { this.materielLike = materielLike; }
}
```

- [ ] **Step 2:修正 SpOrderController** —— 改动三处方法 + import:
  - import:删 `import com.wangziyang.mes.basedata.entity.SpMaterile;` 与 `import com.wangziyang.mes.basedata.request.spMaterileReq;`;加 `import com.wangziyang.mes.order.request.SpOrderReq;`。(保留 `SpTableManager` import,`addOrUpdateUI` 仍用。)
  - `page` 方法整体替换为:

```java
    @ApiOperation("生产订单界界面分页查询")
    @PostMapping("/page")
    @ResponseBody
    public Result page(SpOrderReq req) {
        QueryWrapper queryWrapper = new QueryWrapper();
        if (StringUtils.isNotEmpty(req.getOrderCodeLike())) {
            queryWrapper.like("order_code", req.getOrderCodeLike());
        }
        if (StringUtils.isNotEmpty(req.getMaterielLike())) {
            queryWrapper.like("materiel", req.getMaterielLike());
        }
        queryWrapper.orderByDesc("create_time");
        IPage result = iSpOrderService.page(req, queryWrapper);
        return Result.success(result);
    }
```

  - `add-or-update` 方法整体替换为(**修正:正确保存 SpOrder + 新建置 statue=0**):

```java
    @ApiOperation("生产订单修改、新增")
    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpOrder record) {
        // 新建订单默认状态=0(已下发/待派工),以进入派工列表
        if (StringUtils.isEmpty(record.getId()) && record.getStatue() == null) {
            record.setStatue(0);
        }
        iSpOrderService.saveOrUpdate(record);
        return Result.success();
    }
```

  - `delete` 方法入参由 `SpMaterile` 改为 `SpOrder`(逻辑不变):

```java
    @ApiOperation("删除生产订单")
    @PostMapping("/delete")
    @ResponseBody
    public Result deleteByTableNameId(SpOrder req) throws Exception {
        iSpOrderService.removeById(req.getId());
        return Result.success();
    }
```

- [ ] **Step 3:更新 SpOrder.statue 注释**——把 statue 字段上方注释改为:

```java
    /**
     * 订单状态:0 已下发(待派工),1 已派工,2 进行中,3 订单结束,4 订单终结
     */
    private Integer statue;
```

- [ ] **Step 4:审查派工后端**——通读 `SpDispatchServiceImpl.java`(`pageOrdersForDispatch`/`assignWorker`/`getDispatchByOrderId`)。预期它已正确(statue=0 过滤、assign 事务校验 statue==0 后建 SpOrderDispatch 并置订单 statue=1)。若发现明显 bug(空指针/状态写错/事务缺失),一并修正并在提交信息注明;若无问题则不改。

- [ ] **Step 5:编译验证** — Run: `cd mes && mvn -q -DskipTests compile` → Expected: BUILD SUCCESS

- [ ] **Step 6:提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/order/
git commit -m "🐛 fix(order): 修正生产订单 add-or-update(正确保存SpOrder+新建statue=0)/delete入参,新增SpOrderReq支持工单号搜索,统一statue注释"
```

---

## Task 2:类型 `types/order.ts`

**Files:** Create `mes/frontend/apps/mes-new/src/types/order.ts`

- [ ] **Step 1:创建文件**

```ts
/** 生产订单 */
export interface SpOrder {
  id: string
  orderCode: string
  orderDescription?: string
  qty?: number
  orderType?: string
  flowId?: string
  materiel?: string
  materielDesc?: string
  planStartTime?: string
  planEndTime?: string
  statue?: number
}

/** 待派工列表行(后端返回 Map,含派工冗余字段) */
export interface DispatchableOrder {
  id: string
  orderCode: string
  orderDescription?: string
  qty?: number
  orderType?: string
  materiel?: string
  materielDesc?: string
  planStartTime?: string
  planEndTime?: string
  statue?: number
  dispatchStatus?: number | null
  workerName?: string | null
  teamName?: string | null
}

/** 派工执行入参 */
export interface SpDispatchAssign {
  orderIds: string[]
  teamId: string
  userId: string
  laborHours: number
  planStartTime?: string
  planEndTime?: string
  remark?: string
}

export interface SpTeamOption { id: string; code: string; name: string }
export interface TeamUserOption { id: string; name: string; username?: string }
```

- [ ] **Step 2:tsc** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → PASS
- [ ] **Step 3:提交** — `git commit -m "✨ feat(mes-new): 新增订单/派工类型定义"`

---

## Task 3:datetime 工具(TDD)

**Files:** Create `src/utils/datetime.ts` + `src/utils/__tests__/datetime.test.ts`

- [ ] **Step 1:先写测试** `src/utils/__tests__/datetime.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { toDatetimeLocal, fromDatetimeLocal } from '../datetime'

describe('toDatetimeLocal', () => {
  it('后端字符串→datetime-local(取到分钟)', () => {
    expect(toDatetimeLocal('2026-06-16 08:30:00')).toBe('2026-06-16T08:30')
  })
  it('空值返回空串', () => {
    expect(toDatetimeLocal()).toBe('')
    expect(toDatetimeLocal('')).toBe('')
  })
  it('非法格式返回空串', () => {
    expect(toDatetimeLocal('abc')).toBe('')
  })
})

describe('fromDatetimeLocal', () => {
  it('datetime-local→后端字符串(补秒)', () => {
    expect(fromDatetimeLocal('2026-06-16T08:30')).toBe('2026-06-16 08:30:00')
  })
  it('已带秒则保留', () => {
    expect(fromDatetimeLocal('2026-06-16T08:30:45')).toBe('2026-06-16 08:30:45')
  })
  it('空/非法返回空串', () => {
    expect(fromDatetimeLocal()).toBe('')
    expect(fromDatetimeLocal('xyz')).toBe('')
  })
})
```

- [ ] **Step 2:跑测试确认 FAIL** — Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/utils/__tests__/datetime.test.ts` → FAIL(模块不存在)

- [ ] **Step 3:实现** `src/utils/datetime.ts`

```ts
/** 后端 "YYYY-MM-DD HH:mm:ss" → <input type="datetime-local"> 的 "YYYY-MM-DDTHH:mm" */
export function toDatetimeLocal(value?: string): string {
  if (!value) return ''
  const normalized = value.trim().replace(' ', 'T')
  const m = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
  return m ? m[1] : ''
}

/** datetime-local "YYYY-MM-DDTHH:mm[:ss]" → 后端 "YYYY-MM-DD HH:mm:ss"(无秒补 00) */
export function fromDatetimeLocal(value?: string): string {
  if (!value) return ''
  const m = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/)
  if (!m) return ''
  return `${m[1]} ${m[2]}:${m[3] ?? '00'}`
}
```

- [ ] **Step 4:跑测试确认 PASS** — Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/utils/__tests__/datetime.test.ts` → PASS
- [ ] **Step 5:提交** — `git commit -m "✨ feat(mes-new): 新增 datetime-local 转换工具 + 单测"`

---

## Task 4:订单 API `api/order/order.ts`

**Files:** Create `src/api/order/order.ts`

- [ ] **Step 1:创建文件**

```ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpOrder } from '@/types/order'

export interface OrderPageParams extends PageParams {
  orderCodeLike?: string
  materielLike?: string
}

/** 订单分页(表单编码) */
export function orderPage(params: OrderPageParams) {
  return http.post<PageResult<SpOrder>>('/order/release/page', params)
}

export function orderGetById(id: string) {
  return http.get<SpOrder>(`/order/release/get-by-id?id=${encodeURIComponent(id)}`)
}

/** 新增/修改(表单编码;新建后端置 statue=0) */
export function orderAddOrUpdate(record: Partial<SpOrder>) {
  return http.post<void>('/order/release/add-or-update', record)
}

/** 删除(表单编码 {id}) */
export function orderDelete(id: string) {
  return http.post<void>('/order/release/delete', { id })
}
```

- [ ] **Step 2:tsc** → PASS
- [ ] **Step 3:提交** — `git commit -m "✨ feat(mes-new): 新增生产订单 API"`

---

## Task 5:派工 API + flowList

**Files:** Create `src/api/order/dispatch.ts`;Modify `src/api/technology/flow.ts`

- [ ] **Step 1:创建 `src/api/order/dispatch.ts`**

```ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { DispatchableOrder, SpDispatchAssign, SpTeamOption, TeamUserOption } from '@/types/order'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface DispatchPageParams extends PageParams {
  orderCode?: string
}

/** 待派工工单分页(表单编码;后端只返回 statue=0) */
export function dispatchPage(params: DispatchPageParams) {
  return http.post<PageResult<DispatchableOrder>>('/order/dispatch/page', params)
}

/** 执行派工(@RequestBody JSON) */
export function dispatchAssign(body: SpDispatchAssign) {
  return http.post<void>('/order/dispatch/assign', body, JSON_HEADERS)
}

/** 班组下拉 */
export function dispatchTeams() {
  return http.get<SpTeamOption[]>('/order/dispatch/teams')
}

/** 班组下作业员 */
export function dispatchTeamUsers(teamId: string) {
  return http.get<TeamUserOption[]>(`/order/dispatch/team-users/${encodeURIComponent(teamId)}`)
}
```

- [ ] **Step 2:在 `src/api/technology/flow.ts` 末尾追加 `flowList`**(供订单工艺下拉):

```ts
/** 工艺路线全量(下拉) */
export function flowList() {
  return http.get<SpFlow[]>('/basedata/flow/list')
}
```

（`SpFlow` 已在该文件 import,无需改 import。）

- [ ] **Step 3:tsc** → PASS
- [ ] **Step 4:提交** — `git commit -m "✨ feat(mes-new): 新增派工 API + 工艺路线全量下拉 flowList"`

---

## Task 6:DataTable 增加可选 `getRowId`(稳定选择键)

**Files:** Modify `mes/frontend/packages/ui/src/components/data-table.tsx`

派工列表多选需以订单 id 作选择键(而非行下标),给 DataTable 加可选 `getRowId`。

- [ ] **Step 1:在 `DataTableProps` 接口内(`rowClassName?` 之后)加一行:**

```tsx
  /** 行稳定 id(用于跨页/按业务 id 选择)。默认 TanStack 用行下标 */
  getRowId?: (row: TData) => string
```

- [ ] **Step 2:在函数参数解构里加 `getRowId,`**(与 `rowClassName,` 并列)。

- [ ] **Step 3:在 `useReactTable({ ... })` 配置里加一行**(放在 `data,` 附近):

```tsx
    getRowId: getRowId,
```

（TanStack 的 `getRowId(originalRow, index, parent)` 兼容只取一个参数的函数;`undefined` 时回退默认行下标。）

- [ ] **Step 4:tsc** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → PASS
- [ ] **Step 5:提交** — `git commit -m "✨ feat(ui): DataTable 增加可选 getRowId(稳定行选择键)"`

---

## Task 7:订单表单 `OrderForm`

**Files:** Create `src/pages/order/production/OrderForm.tsx`

- [ ] **Step 1:创建文件**

```tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@workspace/ui'
import { ClipboardList, Info } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { orderAddOrUpdate } from '@/api/order/order'
import { materilePage } from '@/api/basedata/materile'
import { flowList } from '@/api/technology/flow'
import { toDatetimeLocal, fromDatetimeLocal } from '@/utils/datetime'
import type { SpOrder } from '@/types/order'

const ORDER_TYPES = [
  { value: 'P', label: '批量' },
  { value: 'A', label: '验证' },
  { value: 'F', label: '返工' },
]

const schema = z.object({
  orderCode: z.string().min(1, '请输入工单编号'),
  orderDescription: z.string().optional(),
  qty: z.coerce.number({ invalid_type_error: '请输入数量' }).int('需为整数').min(1, '数量至少 1'),
  orderType: z.enum(['P', 'A', 'F']),
  materiel: z.string().min(1, '请选择物料'),
  materielDesc: z.string().optional(),
  flowId: z.string().optional(),
  planStartTime: z.string().optional(),
  planEndTime: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpOrder | null
}

export default function OrderForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { data: materials } = useQuery$(
    ['order', 'materials'],
    () => materilePage({ current: 1, size: 200 }),
    { enabled: open },
  )
  const { data: flows } = useQuery$(['order', 'flows'], () => flowList(), { enabled: open })
  const { mutate, loading } = useMutation$((dto: Partial<SpOrder>) => orderAddOrUpdate(dto))

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderCode: '', orderDescription: '', qty: 1, orderType: 'P',
      materiel: '', materielDesc: '', flowId: '', planStartTime: '', planEndTime: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        orderCode: record?.orderCode ?? '',
        orderDescription: record?.orderDescription ?? '',
        qty: record?.qty ?? 1,
        orderType: (record?.orderType as FormValues['orderType']) ?? 'P',
        materiel: record?.materiel ?? '',
        materielDesc: record?.materielDesc ?? '',
        flowId: record?.flowId ?? '',
        planStartTime: toDatetimeLocal(record?.planStartTime),
        planEndTime: toDatetimeLocal(record?.planEndTime),
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        id: record?.id,
        orderCode: values.orderCode,
        orderDescription: values.orderDescription ?? '',
        qty: values.qty,
        orderType: values.orderType,
        materiel: values.materiel,
        materielDesc: values.materielDesc ?? '',
        flowId: values.flowId ?? '',
        planStartTime: fromDatetimeLocal(values.planStartTime),
        planEndTime: fromDatetimeLocal(values.planEndTime),
        ...(isEdit ? { statue: record?.statue } : {}),
      })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["order","page"')
      onOpenChange(false)
    } catch {
      /* toast by interceptor */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑生产订单' : '新增生产订单'}
      description="维护生产工单(物料、工艺路线、计划时间)"
      icon={ClipboardList}
      onSubmit={onSubmit}
      submitting={loading}
      contentClassName="sm:max-w-2xl"
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="工单编号" htmlFor="o-code" required error={errors.orderCode?.message}>
            <Input id="o-code" aria-invalid={!!errors.orderCode} {...register('orderCode')} />
          </FormField>
          <FormField label="数量" htmlFor="o-qty" required error={errors.qty?.message}>
            <Input id="o-qty" type="number" min={1} aria-invalid={!!errors.qty} {...register('qty')} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="订单类型" required>
            <Controller
              control={control}
              name="orderType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="物料" required error={errors.materiel?.message}>
            <Controller
              control={control}
              name="materiel"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => {
                    field.onChange(v)
                    const m = (materials?.records ?? []).find((x) => x.materiel === v)
                    setValue('materielDesc', m?.materielDesc ?? '')
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择物料" /></SelectTrigger>
                  <SelectContent>
                    {(materials?.records ?? []).map((m) => (
                      <SelectItem key={m.materiel} value={m.materiel}>{m.materiel} - {m.materielDesc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <FormField label="工艺路线" htmlFor="o-flow">
          <Controller
            control={control}
            name="flowId"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="o-flow" className="w-full"><SelectValue placeholder="请选择工艺路线" /></SelectTrigger>
                <SelectContent>
                  {(flows ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.flow} - {f.flowDesc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField label="工单描述" htmlFor="o-desc">
          <Textarea id="o-desc" {...register('orderDescription')} />
        </FormField>
      </FormSection>
      <FormSection title="计划时间" icon={Info} tag="选填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="计划开始" htmlFor="o-start">
            <Input id="o-start" type="datetime-local" {...register('planStartTime')} />
          </FormField>
          <FormField label="计划结束" htmlFor="o-end">
            <Input id="o-end" type="datetime-local" {...register('planEndTime')} />
          </FormField>
        </div>
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2:tsc** → PASS（注意 `Materiel` 类型须含 `materiel`/`materielDesc` 字段——已存在于 `@/types/basedata`）
- [ ] **Step 3:提交** — `git commit -m "✨ feat(mes-new): 生产订单表单(物料/工艺下拉+计划时间)"`

---

## Task 8:订单列表 `OrderList`

**Files:** Create `src/pages/order/production/OrderList.tsx`

- [ ] **Step 1:创建文件**

```tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Badge, Button, DataTable, Input, Label, toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import OrderForm from './OrderForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { orderPage, orderDelete, type OrderPageParams } from '@/api/order/order'
import type { SpOrder } from '@/types/order'

const PAGE_SIZE = 10
const ORDER_TYPE_LABEL: Record<string, string> = { P: '批量', A: '验证', F: '返工' }
const STATUE_LABEL: Record<number, string> = { 0: '待派工', 1: '已派工', 2: '进行中', 3: '已结束', 4: '已终结' }

export default function OrderList() {
  const [params, setParams] = useState<OrderPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftMat, setDraftMat] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpOrder | null>(null)
  const [deleting, setDeleting] = useState<SpOrder | null>(null)

  const { data, loading } = useQuery$(['order', 'page', params], () => orderPage(params))
  const { mutate: removeOrder } = useMutation$((id: string) => orderDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, orderCodeLike: draftCode || undefined, materielLike: draftMat || undefined })
  const onReset = () => {
    setDraftCode(''); setDraftMat(''); setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeOrder(deleting.id)
      toast.success('删除成功')
      invalidate('["order","page"')
    } catch { /* toast */ } finally { setDeleting(null) }
  }

  const columns = useMemo<ColumnDef<SpOrder>[]>(
    () => [
      { accessorKey: 'orderCode', header: '工单编号' },
      { accessorKey: 'materiel', header: '物料', cell: ({ row }) => row.original.materiel || '—' },
      { accessorKey: 'materielDesc', header: '物料描述', cell: ({ row }) => row.original.materielDesc || '—' },
      { accessorKey: 'qty', header: '数量', cell: ({ row }) => row.original.qty ?? '—' },
      {
        accessorKey: 'orderType', header: '类型',
        cell: ({ row }) => <Badge variant="secondary">{ORDER_TYPE_LABEL[row.original.orderType ?? ''] ?? '—'}</Badge>,
      },
      { accessorKey: 'planStartTime', header: '计划开始', cell: ({ row }) => row.original.planStartTime || '—' },
      { accessorKey: 'planEndTime', header: '计划结束', cell: ({ row }) => row.original.planEndTime || '—' },
      {
        accessorKey: 'statue', header: '状态',
        cell: ({ row }) => {
          const s = row.original.statue ?? 0
          return <Badge variant={s === 0 ? 'default' : 'secondary'}>{STATUE_LABEL[s] ?? s}</Badge>
        },
      },
      {
        id: 'actions', header: '操作',
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
      title="生产订单"
      description="维护生产工单并下达"
      actions={
        <PermissionGuard perm="order:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建订单
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-o-code">工单编号</Label>
          <Input id="s-o-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-o-mat">物料</Label>
          <Input id="s-o-mat" className="h-9 w-44" value={draftMat} onChange={(e) => setDraftMat(e.target.value)} />
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

      <OrderForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除工单「{deleting?.orderCode}」吗?</AlertDialogDescription>
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

- [ ] **Step 2:tsc** → PASS
- [ ] **Step 3:提交** — `git commit -m "✨ feat(mes-new): 生产订单列表(分页+工单号/物料搜索+增删改)"`

---

## Task 9:派工弹窗 `DispatchDialog`

**Files:** Create `src/pages/order/dispatch/DispatchDialog.tsx`

- [ ] **Step 1:创建文件**

```tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, toast,
} from '@workspace/ui'
import { UserCheck, Info } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { dispatchTeams, dispatchTeamUsers, dispatchAssign } from '@/api/order/dispatch'
import { toDatetimeLocal, fromDatetimeLocal } from '@/utils/datetime'
import type { SpDispatchAssign } from '@/types/order'

const schema = z.object({
  teamId: z.string().min(1, '请选择班组'),
  userId: z.string().min(1, '请选择作业员'),
  laborHours: z.coerce.number({ invalid_type_error: '请输入工时' }).positive('工时需大于 0'),
  planStartTime: z.string().optional(),
  planEndTime: z.string().optional(),
  remark: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderIds: string[]
  onAssigned: () => void
}

export default function DispatchDialog({ open, onOpenChange, orderIds, onAssigned }: Props) {
  const { data: teams } = useQuery$(['dispatch', 'teams'], () => dispatchTeams(), { enabled: open })
  const { mutate, loading } = useMutation$((dto: SpDispatchAssign) => dispatchAssign(dto))

  const {
    register, handleSubmit, control, reset, watch, setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { teamId: '', userId: '', laborHours: 8, planStartTime: '', planEndTime: '', remark: '' },
  })

  const teamId = watch('teamId')
  const { data: users } = useQuery$(
    ['dispatch', 'team-users', teamId],
    () => dispatchTeamUsers(teamId),
    { enabled: open && !!teamId },
  )

  useEffect(() => {
    if (open) {
      reset({ teamId: '', userId: '', laborHours: 8, planStartTime: '', planEndTime: '', remark: '' })
    }
  }, [open, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (orderIds.length === 0) {
      toast.error('请先选择待派工工单')
      return
    }
    try {
      await mutate({
        orderIds,
        teamId: values.teamId,
        userId: values.userId,
        laborHours: values.laborHours,
        planStartTime: fromDatetimeLocal(values.planStartTime),
        planEndTime: fromDatetimeLocal(values.planEndTime),
        remark: values.remark ?? '',
      })
      toast.success(`已派工 ${orderIds.length} 张工单`)
      invalidate('["dispatch","page"')
      onAssigned()
      onOpenChange(false)
    } catch { /* toast */ }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="批量派工"
      description={`将 ${orderIds.length} 张工单派给班组与作业员`}
      icon={UserCheck}
      onSubmit={onSubmit}
      submitting={loading}
      submitText="确认派工"
    >
      <FormSection title="派工信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="班组" required error={errors.teamId?.message}>
            <Controller
              control={control}
              name="teamId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => { field.onChange(v); setValue('userId', '') }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择班组" /></SelectTrigger>
                  <SelectContent>
                    {(teams ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.code} - {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="作业员" required error={errors.userId?.message}>
            <Controller
              control={control}
              name="userId"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange} disabled={!teamId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={teamId ? '请选择作业员' : '请先选班组'} /></SelectTrigger>
                  <SelectContent>
                    {(users ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <FormField label="工时(小时)" htmlFor="d-hours" required error={errors.laborHours?.message}>
          <Input id="d-hours" type="number" step="0.5" min={0.5} aria-invalid={!!errors.laborHours} {...register('laborHours')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="计划开始" htmlFor="d-start">
            <Input id="d-start" type="datetime-local" {...register('planStartTime')} />
          </FormField>
          <FormField label="计划结束" htmlFor="d-end">
            <Input id="d-end" type="datetime-local" {...register('planEndTime')} />
          </FormField>
        </div>
        <FormField label="备注" htmlFor="d-remark">
          <Textarea id="d-remark" {...register('remark')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
```

注:`toDatetimeLocal` 已 import 但派工弹窗新建态不回填时间(仅用 `fromDatetimeLocal`)。**实现时若 `toDatetimeLocal` 未被使用导致 lint no-unused,删除该 import。**

- [ ] **Step 2:tsc + lint** → PASS / 0 error;若有未用 import 警告则删除对应 import
- [ ] **Step 3:提交** — `git commit -m "✨ feat(mes-new): 派工弹窗(班组→作业员级联)"`

---

## Task 10:待派工列表 `DispatchList`

**Files:** Create `src/pages/order/dispatch/DispatchList.tsx`

- [ ] **Step 1:创建文件**

```tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Button, DataTable, Input, Label } from '@workspace/ui'
import { Send } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import DispatchDialog from './DispatchDialog'
import { useQuery$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { dispatchPage, type DispatchPageParams } from '@/api/order/dispatch'
import type { DispatchableOrder } from '@/types/order'

const PAGE_SIZE = 10
const ORDER_TYPE_LABEL: Record<string, string> = { P: '批量', A: '验证', F: '返工' }

export default function DispatchList() {
  const [params, setParams] = useState<DispatchPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, loading } = useQuery$(['dispatch', 'page', params], () => dispatchPage(params))

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k])

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, orderCode: draftCode || undefined })
  const onReset = () => { setDraftCode(''); setParams({ current: 1, size: PAGE_SIZE }) }

  const onAssigned = () => {
    setRowSelection({})
    invalidate('["dispatch","page"')
  }

  const columns = useMemo<ColumnDef<DispatchableOrder>[]>(
    () => [
      { accessorKey: 'orderCode', header: '工单编号' },
      { accessorKey: 'materiel', header: '物料', cell: ({ row }) => row.original.materiel || '—' },
      { accessorKey: 'materielDesc', header: '物料描述', cell: ({ row }) => row.original.materielDesc || '—' },
      { accessorKey: 'qty', header: '数量', cell: ({ row }) => row.original.qty ?? '—' },
      {
        accessorKey: 'orderType', header: '类型',
        cell: ({ row }) => <Badge variant="secondary">{ORDER_TYPE_LABEL[row.original.orderType ?? ''] ?? '—'}</Badge>,
      },
      { accessorKey: 'planStartTime', header: '计划开始', cell: ({ row }) => row.original.planStartTime || '—' },
      { accessorKey: 'planEndTime', header: '计划结束', cell: ({ row }) => row.original.planEndTime || '—' },
    ],
    [],
  )

  return (
    <PageContainer
      title="作业派工"
      description="选择待派工工单,批量分配班组与作业员"
      actions={
        <PermissionGuard perm="order:dispatch">
          <Button disabled={selectedIds.length === 0} onClick={() => setDialogOpen(true)}>
            <Send className="size-4" />
            批量派工{selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-d-code">工单编号</Label>
          <Input id="s-d-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
      </SearchForm>

      <DataTable
        columns={columns}
        data={data?.records ?? []}
        loading={loading}
        loadingRowCount={PAGE_SIZE}
        enableRowSelection
        getRowId={(row) => row.id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        pagination={{
          mode: 'server',
          pageIndex: (data?.current ?? params.current) - 1,
          pageSize: PAGE_SIZE,
          totalPages: data?.pages ?? 1,
          totalRows: data?.total,
          onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
        }}
      />

      <DispatchDialog open={dialogOpen} onOpenChange={setDialogOpen} orderIds={selectedIds} onAssigned={onAssigned} />
    </PageContainer>
  )
}
```

- [ ] **Step 2:tsc + lint** → PASS / 0 error
- [ ] **Step 3:提交** — `git commit -m "✨ feat(mes-new): 待派工列表(多选+批量派工)"`

---

## Task 11:routeMeta + 路由注册

**Files:** Modify `src/layouts/routeMeta.ts`、`src/router.tsx`

- [ ] **Step 1:`routeMeta.ts`** —— 在 `ROUTE_META` 的工艺路线条目之后加:

```tsx
  // 计划/订单
  '/order/production': { title: '生产订单', icon: 'schedule' },
  '/order/dispatch': { title: '作业派工', icon: 'team' },
```

- [ ] **Step 2:`router.tsx`** —— import(在 `FlowList` import 之后):

```tsx
import OrderList from '@/pages/order/production/OrderList'
import DispatchList from '@/pages/order/dispatch/DispatchList'
```

路由(在 `technology/flow` 之后):

```tsx
          { path: 'order/production', element: <OrderList /> },
          { path: 'order/dispatch', element: <DispatchList /> },
```

- [ ] **Step 3:tsc** → PASS
- [ ] **Step 4:提交** — `git commit -m "✨ feat(mes-new): 注册生产订单/派工路由 + 标签元信息"`

---

## Task 12:全量验证

**Files:** 无

- [ ] **Step 1:tsc** — `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → PASS
- [ ] **Step 2:单测** — `pnpm --filter mes-new exec vitest run` → 全部 PASS(含 datetime)
- [ ] **Step 3:lint** — `pnpm --filter mes-new lint` → 0 error / ≤9 warnings(无新增)
- [ ] **Step 4:build** — `pnpm --filter mes-new build` → 成功
- [ ] **Step 5:后端编译** — `cd mes && mvn -q -DskipTests compile` → BUILD SUCCESS
- [ ] **Step 6:(如有遗留修复)** 按文件 commit `🐛 fix(...)`

---

## Self-Review
- **Spec coverage**:§4.1/4.2 后端 → T1;§5 文件结构 → T2–T11;§11 验证 → T12。
- **Placeholder scan**:无 TBD;每步完整代码 + 命令。
- **Type consistency**:`SpOrder/DispatchableOrder/SpDispatchAssign/SpTeamOption/TeamUserOption`(T2)在 T4/T5/T7/T8/T9/T10 用法一致;`getRowId`(T6)在 T10 用;`toDatetimeLocal/fromDatetimeLocal`(T3)在 T7/T9 用;invalidate 前缀 `["order","page"`/`["dispatch","page"` 与查询键一致;路由 `/order/production`、`/order/dispatch` 与菜单 url 映射一致(免改 urlMap)。
- **Lint 风险**:DispatchDialog 若 `toDatetimeLocal` 未用须删 import(T9 已标注);表单初始化用 reset(非 effect setState)。
