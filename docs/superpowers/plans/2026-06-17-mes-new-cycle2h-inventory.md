# 周期 2h · 库存管理 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/mes-new` 新建库存管理 4 个页面（计划入库确认 / 库存明细查询 / 配套出库确认 / 手动入库），对接后端已存在的 8 个端点。

**Architecture:** 纯前端对接现有后端（后端零生产代码改动，审查已确认无 bug，见 spec §2.3）。入库/出库为"主从右面板 + 弹窗登账"，查询为只读列表，手动入库为表单页。复用 `DataTable / MasterDetailLayout / RelatedPanel / SearchForm / FormDialog / FormField`，HTTP 走自研 `useQuery$/useMutation$` + `invalidate`。

**Tech Stack:** React 18 + TS + Vite + `@workspace/ui`(shadcn/Radix) + `@ngify/http` + rxjs + lucide-react + vitest(node)。

参考 spec：`docs/superpowers/specs/2026-06-17-mes-new-cycle2h-inventory-design.md`

---

## 关键既有约定（实现前必读）

- **HTTP**：`http.post<T>(url, body, JSON_HEADERS?)` / `http.get<T>(url)` 返回 `Observable<T>`。`const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }`。POST 默认 form-urlencoded；带 `JSON_HEADERS` 才是 JSON。
- **查询/变更**：`useQuery$(key: unknown[], factory, { enabled? })` → `{ data, loading, error, refetch }`；`useMutation$(factory)` → `{ mutate, loading, error }`，`mutate(...)` 返回 Promise。
- **失效**：`invalidate(prefix: string)`，prefix 为序列化 key 前缀。例：`invalidate('["inventory","receipt"')` 会刷新所有 `['inventory','receipt',...]` 查询。
- **分页**：请求 `{ current(1基), size }`；响应 `PageResult<T> = { records, total, size, current, pages }`。
- **DataTable**（来自 `@workspace/ui`）：`columns: ColumnDef<T>[]`（`@tanstack/react-table`）、`data`、`loading`、`loadingRowCount`、`onRowClick`、`rowClassName`、`pagination={ mode:'server', pageIndex, pageSize, totalPages, totalRows, onPageChange }`。
- **表单**：本周期两个写表单（入库登账弹窗、手动入库页）含"库房→库位"级联与物料自动带出，用**普通 useState 受控**（与甘特 TaskDetailSheet 一致，规避 [[rhf-field-name-dom-clobbering]]），提交前手动校验必填 + `toast.error`。
- **测试**：vitest `environment: 'node'`，仅收 `src/**/*.test.ts`；组件不做渲染测，仅纯函数测。
- **命令**（在 `mes/frontend/` 下）：
  - 类型检查：`pnpm --filter mes-new check-types`
  - 单测：`pnpm --filter mes-new test`
  - Lint：`pnpm --filter mes-new lint`
  - 构建：`pnpm --filter mes-new build`

---

## 前置准备（环境，非代码）

- [ ] **P1：确认后端库存 seed 与菜单已落 dev 库**

后端库存端点已存在（`com.wangziyang.mes.inventory`）。菜单与 seed 在 `scripts/sql/planned-inbound.sql` + `scripts/sql/kitting-outbound.sql`（含菜单 id `18/181/182/183/184` + 电脑配件库/库位/入库单/出库单/库存）。

验证（用 application-dev.yml 的 dev 连接，替换 `<host>/<user>/<db>`）：

```bash
mysql -h<host> -u<user> -p <db> -e "SELECT id,name,url FROM sp_sys_menu WHERE id IN (18,181,182,183,184); SELECT COUNT(*) recs FROM sp_warehouse_receipt; SELECT COUNT(*) obs FROM sp_outbound_order;"
```

若菜单/单据为空，则应用 seed（幂等，文件内含 id 固定的 INSERT）：

```bash
mysql -h<host> -u<user> -p <db> < scripts/sql/planned-inbound.sql
mysql -h<host> -u<user> -p <db> < scripts/sql/kitting-outbound.sql
```

预期：5 行菜单、入库单 ≥1、出库单 ≥2。侧边栏"库存管理"4 子项可见（路由匹配，见 [[menu-driven-sidebar-route-mapping]]）。

---

## Task 1：库存类型定义

**Files:**
- Create: `mes/frontend/apps/mes-new/src/types/inventory.ts`

- [ ] **Step 1：创建类型文件**

```typescript
import type { PageParams } from '@/types/api'

export type ReceiptStatus = 'pending' | 'partial' | 'completed'
export type OutboundStatus = 'pending' | 'partial' | 'completed'
export type PostStatus = 'pending' | 'posted'

/** 入库单主表 sp_warehouse_receipt */
export interface SpWarehouseReceipt {
  id: string
  receiptCode: string
  sourceType?: string
  planId?: string
  orderId?: string
  orderCode?: string
  productCode?: string
  productDesc?: string
  receiptStatus: ReceiptStatus
  totalItems: number
  postedItems: number
  createTime?: string
  updateTime?: string
}

/** 入库单明细 sp_warehouse_receipt_item */
export interface SpWarehouseReceiptItem {
  id: string
  receiptId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity: number
  warehouseId?: string
  warehouseName?: string
  locationId?: string
  locationCode?: string
  postStatus: PostStatus
  postedAt?: string
}

/** 出库单主表 sp_outbound_order */
export interface SpOutboundOrder {
  id: string
  outboundCode: string
  orderId?: string
  orderCode?: string
  productCode?: string
  productDesc?: string
  outboundStatus: OutboundStatus
  totalItems: number
  postedItems: number
  createTime?: string
  updateTime?: string
}

/** 出库单明细 sp_outbound_order_item */
export interface SpOutboundOrderItem {
  id: string
  outboundId: string
  materialCode: string
  materialDesc?: string
  unit?: string
  quantity: number
  postStatus: PostStatus
  allocationDetail?: string
  postedAt?: string
}

/** 库存台账(库位级) sp_inventory */
export interface SpInventory {
  id: string
  materialCode: string
  materialDesc?: string
  unit?: string
  warehouseId?: string
  warehouseName?: string
  locationId?: string
  locationCode?: string
  quantity: number
  status?: string
  lastInboundTime?: string
}

/** 分页参数 */
export interface ReceiptPageParams extends PageParams {
  receiptCode?: string
  receiptStatus?: string
}
export interface OutboundPageParams extends PageParams {
  outboundCode?: string
  outboundStatus?: string
}
export interface InventoryPageParams extends PageParams {
  materialCode?: string
  startDate?: string
  endDate?: string
}

/** 写入 DTO(JSON 体) */
export interface PostReceiptItemDTO {
  itemId: string
  warehouseId: string
  locationId: string
}
export interface PostOutboundItemDTO {
  itemId: string
}
export interface ManualInboundDTO {
  materialCode: string
  materialDesc?: string
  unit?: string
  warehouseId: string
  locationId: string
  quantity: number
}
```

- [ ] **Step 2：类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 通过（无新增报错；此文件仅类型声明）。

- [ ] **Step 3：提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/types/inventory.ts
git commit -m "🏷️ feat(mes-new): 库存模块类型定义(入库单/出库单/库存台账/DTO)"
```

---

## Task 2：库存 API 层

**Files:**
- Create: `mes/frontend/apps/mes-new/src/api/inventory/receipt.ts`
- Create: `mes/frontend/apps/mes-new/src/api/inventory/outbound.ts`
- Create: `mes/frontend/apps/mes-new/src/api/inventory/stock.ts`

- [ ] **Step 1：入库单 API**

`api/inventory/receipt.ts`：

```typescript
import { http } from '@/http/client'
import type { PageResult } from '@/types/api'
import type {
  SpWarehouseReceipt,
  SpWarehouseReceiptItem,
  ReceiptPageParams,
  PostReceiptItemDTO,
} from '@/types/inventory'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 分页查询入库单(form 编码) */
export function pageReceipts(params: ReceiptPageParams) {
  return http.post<PageResult<SpWarehouseReceipt>>('/inventory/receipt/page', params)
}

/** 查询单张入库单明细 */
export function receiptItems(receiptId: string) {
  return http.get<SpWarehouseReceiptItem[]>(`/inventory/receipt/${receiptId}/items`)
}

/** 入库登账(JSON 体) */
export function postReceiptItem(dto: PostReceiptItemDTO) {
  return http.post<void>('/inventory/receipt/item/post', dto, JSON_HEADERS)
}
```

- [ ] **Step 2：出库单 API**

`api/inventory/outbound.ts`：

```typescript
import { http } from '@/http/client'
import type { PageResult } from '@/types/api'
import type {
  SpOutboundOrder,
  SpOutboundOrderItem,
  OutboundPageParams,
  PostOutboundItemDTO,
} from '@/types/inventory'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 分页查询出库单(form 编码) */
export function pageOutbounds(params: OutboundPageParams) {
  return http.post<PageResult<SpOutboundOrder>>('/inventory/outbound/page', params)
}

/** 查询单张出库单明细 */
export function outboundItems(outboundId: string) {
  return http.get<SpOutboundOrderItem[]>(`/inventory/outbound/${outboundId}/items`)
}

/** 出库登账 FIFO(JSON 体) */
export function postOutboundItem(dto: PostOutboundItemDTO) {
  return http.post<void>('/inventory/outbound/item/post', dto, JSON_HEADERS)
}
```

- [ ] **Step 3：库存查询 + 手动入库 API**

`api/inventory/stock.ts`（注意查询端点是 `/inventory/page`，挂在 ReceiptController）：

```typescript
import { http } from '@/http/client'
import type { PageResult } from '@/types/api'
import type { SpInventory, InventoryPageParams, ManualInboundDTO } from '@/types/inventory'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 库存明细查询(form 编码) —— 端点为 /inventory/page,非 /inventory/inventory/page */
export function pageInventory(params: InventoryPageParams) {
  return http.post<PageResult<SpInventory>>('/inventory/page', params)
}

/** 手动入库(JSON 体) */
export function manualInbound(dto: ManualInboundDTO) {
  return http.post<void>('/inventory/manual-inbound', dto, JSON_HEADERS)
}
```

- [ ] **Step 4：类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 通过。

- [ ] **Step 5：提交**

```bash
git add mes/frontend/apps/mes-new/src/api/inventory/
git commit -m "✨ feat(mes-new): 库存 API 层(入库单/出库单/库存查询/手动入库)"
```

---

## Task 3：库存状态工具（纯函数 + TDD）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/inventory/inventoryStatus.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/inventory/__tests__/inventoryStatus.test.ts`

- [ ] **Step 1：写失败测试**

`pages/inventory/__tests__/inventoryStatus.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import {
  receiptStatusMeta,
  outboundStatusMeta,
  postStatusMeta,
  progressText,
  progressPercent,
} from '../inventoryStatus'

describe('receiptStatusMeta', () => {
  it('pending → 待确认', () => { expect(receiptStatusMeta('pending').label).toBe('待确认') })
  it('partial → 部分登账', () => { expect(receiptStatusMeta('partial').label).toBe('部分登账') })
  it('completed → 已完成', () => { expect(receiptStatusMeta('completed').label).toBe('已完成') })
  it('未知值 → 原值', () => { expect(receiptStatusMeta('foo').label).toBe('foo') })
  it('空值 → —', () => { expect(receiptStatusMeta(undefined).label).toBe('—') })
})

describe('outboundStatusMeta', () => {
  it('partial → 部分出库', () => { expect(outboundStatusMeta('partial').label).toBe('部分出库') })
  it('completed → 已完成', () => { expect(outboundStatusMeta('completed').label).toBe('已完成') })
})

describe('postStatusMeta', () => {
  it('pending → 待登账', () => { expect(postStatusMeta('pending').label).toBe('待登账') })
  it('posted → 已登账', () => { expect(postStatusMeta('posted').label).toBe('已登账') })
})

describe('progressText', () => {
  it('正常', () => { expect(progressText(3, 8)).toBe('3/8') })
  it('空值按 0', () => { expect(progressText(undefined, undefined)).toBe('0/0') })
})

describe('progressPercent', () => {
  it('3/8 → 38', () => { expect(progressPercent(3, 8)).toBe(38) })
  it('total 0 → 0(不除零)', () => { expect(progressPercent(0, 0)).toBe(0) })
  it('全部完成 → 100', () => { expect(progressPercent(8, 8)).toBe(100) })
})
```

- [ ] **Step 2：运行测试，确认失败**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/inventory/__tests__/inventoryStatus.test.ts`
Expected: FAIL —— 无法解析 `../inventoryStatus`（模块不存在）。

- [ ] **Step 3：实现纯函数**

`pages/inventory/inventoryStatus.ts`：

```typescript
export interface StatusMeta {
  label: string
  className: string
}

const PENDING_CLASS = 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400'
const PARTIAL_CLASS = 'border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400'
const DONE_CLASS = 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
const MUTED_CLASS = 'border-transparent bg-muted text-muted-foreground'

/** 入库单状态 → 文案 + 色 */
export function receiptStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待确认', className: PENDING_CLASS }
    case 'partial': return { label: '部分登账', className: PARTIAL_CLASS }
    case 'completed': return { label: '已完成', className: DONE_CLASS }
    default: return { label: status || '—', className: MUTED_CLASS }
  }
}

/** 出库单状态 → 文案 + 色 */
export function outboundStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待确认', className: PENDING_CLASS }
    case 'partial': return { label: '部分出库', className: PARTIAL_CLASS }
    case 'completed': return { label: '已完成', className: DONE_CLASS }
    default: return { label: status || '—', className: MUTED_CLASS }
  }
}

/** 明细登账状态 → 文案 + 色 */
export function postStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待登账', className: PENDING_CLASS }
    case 'posted': return { label: '已登账', className: DONE_CLASS }
    default: return { label: status || '—', className: MUTED_CLASS }
  }
}

/** 进度文案 posted/total */
export function progressText(posted?: number, total?: number): string {
  return `${posted ?? 0}/${total ?? 0}`
}

/** 进度百分比 0-100;total<=0 返回 0(不除零) */
export function progressPercent(posted?: number, total?: number): number {
  const t = total ?? 0
  if (t <= 0) return 0
  return Math.round(((posted ?? 0) / t) * 100)
}
```

- [ ] **Step 4：运行测试，确认通过**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/inventory/__tests__/inventoryStatus.test.ts`
Expected: PASS（全部用例绿）。

- [ ] **Step 5：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/inventory/inventoryStatus.ts mes/frontend/apps/mes-new/src/pages/inventory/__tests__/inventoryStatus.test.ts
git commit -m "✅ feat(mes-new): 库存状态/进度纯函数 + 单测"
```

---

## Task 4：计划入库确认页（主从 + 弹窗登账）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/inventory/receipt/ReceiptPostDialog.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/inventory/receipt/ReceiptItemsPanel.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/inventory/receipt/ReceiptList.tsx`
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1：入库登账弹窗（库房→库位级联，普通 useState）**

`pages/inventory/receipt/ReceiptPostDialog.tsx`：

```tsx
import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import { PackageCheck } from 'lucide-react'
import FormDialog from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { warehousePage, warehouseLocations } from '@/api/basedata/warehouse'
import { postReceiptItem } from '@/api/inventory/receipt'
import type { SpWarehouseReceiptItem } from '@/types/inventory'

interface Props {
  item: SpWarehouseReceiptItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FETCH_SIZE = 200

export default function ReceiptPostDialog({ item, open, onOpenChange }: Props) {
  const [warehouseId, setWarehouseId] = useState('')
  const [locationId, setLocationId] = useState('')

  // 弹窗打开才拉库房;客户端过滤零件库
  const { data: whPage } = useQuery$(
    ['basedata', 'warehouse', 'page', { current: 1, size: FETCH_SIZE }],
    () => warehousePage({ current: 1, size: FETCH_SIZE }),
    { enabled: open },
  )
  const warehouses = (whPage?.records ?? []).filter((w) => w.type === '零件库')

  // 选定库房后级联库位
  const { data: locations } = useQuery$(
    ['basedata', 'warehouse', 'locations', warehouseId],
    () => warehouseLocations(warehouseId),
    { enabled: open && !!warehouseId },
  )

  const { mutate, loading } = useMutation$(
    (dto: { itemId: string; warehouseId: string; locationId: string }) => postReceiptItem(dto),
  )

  useEffect(() => {
    if (open) {
      setWarehouseId('')
      setLocationId('')
    }
  }, [open])

  const onSubmit = async () => {
    if (!item) return
    if (!warehouseId) { toast.error('请选择库房'); return }
    if (!locationId) { toast.error('请选择库位'); return }
    try {
      await mutate({ itemId: item.id, warehouseId, locationId })
      toast.success('入库登账成功')
      invalidate('["inventory","receipt"')
      invalidate('["inventory","stock"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast(混放/归属/零件库等业务校验) */
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="入库登账"
      description={item ? `${item.materialCode} · 数量 ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : ''}
      icon={PackageCheck}
      onSubmit={onSubmit}
      submitting={loading}
      submitText="确认登账"
    >
      <FormField label="库房" required help="仅可选择零件库类型库房">
        <Select value={warehouseId || undefined} onValueChange={(v) => { setWarehouseId(v); setLocationId('') }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="请选择库房" /></SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}（{w.code}）</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="库位" required help="一个库位只能存放一种物料">
        <Select value={locationId || undefined} onValueChange={setLocationId} disabled={!warehouseId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={warehouseId ? '请选择库位' : '请先选择库房'} />
          </SelectTrigger>
          <SelectContent>
            {(locations ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.code}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
    </FormDialog>
  )
}
```

- [ ] **Step 2：入库明细面板**

`pages/inventory/receipt/ReceiptItemsPanel.tsx`：

```tsx
import { useState } from 'react'
import {
  Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn,
} from '@workspace/ui'
import { ClipboardList, PackageCheck } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import PermissionGuard from '@/components/PermissionGuard'
import ReceiptPostDialog from './ReceiptPostDialog'
import { useQuery$ } from '@/http/hooks'
import { receiptItems } from '@/api/inventory/receipt'
import { postStatusMeta } from '../inventoryStatus'
import type { SpWarehouseReceipt, SpWarehouseReceiptItem } from '@/types/inventory'

interface Props {
  receipt: SpWarehouseReceipt
}

export default function ReceiptItemsPanel({ receipt }: Props) {
  const [posting, setPosting] = useState<SpWarehouseReceiptItem | null>(null)
  const { data: items } = useQuery$(
    ['inventory', 'receipt', 'items', receipt.id],
    () => receiptItems(receipt.id),
  )
  const list = items ?? []

  return (
    <>
      <RelatedPanel icon={ClipboardList} title={`入库明细 · ${receipt.receiptCode}`} count={list.length}>
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">该入库单暂无明细</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>物料</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>库位</TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((it) => {
                const meta = postStatusMeta(it.postStatus)
                return (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="font-medium">{it.materialCode}</div>
                      <div className="text-xs text-muted-foreground">{it.materialDesc || '—'}</div>
                    </TableCell>
                    <TableCell className="text-right">{it.quantity}{it.unit ? ` ${it.unit}` : ''}</TableCell>
                    <TableCell><Badge className={cn(meta.className)}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {it.postStatus === 'posted' ? `${it.warehouseName ?? ''} / ${it.locationCode ?? ''}` : '—'}
                    </TableCell>
                    <TableCell>
                      {it.postStatus === 'pending' ? (
                        <PermissionGuard perm="inventory:inbound">
                          <Button size="sm" variant="outline" onClick={() => setPosting(it)}>
                            <PackageCheck className="size-4" />登账
                          </Button>
                        </PermissionGuard>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </RelatedPanel>

      <ReceiptPostDialog item={posting} open={!!posting} onOpenChange={(o) => !o && setPosting(null)} />
    </>
  )
}
```

- [ ] **Step 3：入库单主从列表页**

`pages/inventory/receipt/ReceiptList.tsx`：

```tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, DataTable, Input, Label, cn } from '@workspace/ui'
import { ClipboardList, PackageOpen } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import RelatedPanel from '@/components/RelatedPanel'
import ReceiptItemsPanel from './ReceiptItemsPanel'
import { useQuery$ } from '@/http/hooks'
import { pageReceipts } from '@/api/inventory/receipt'
import { receiptStatusMeta, progressText } from '../inventoryStatus'
import type { ReceiptPageParams, SpWarehouseReceipt } from '@/types/inventory'

const PAGE_SIZE = 10

export default function ReceiptList() {
  const [params, setParams] = useState<ReceiptPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [selected, setSelected] = useState<SpWarehouseReceipt | null>(null)

  const { data, loading } = useQuery$(['inventory', 'receipt', 'page', params], () => pageReceipts(params))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, receiptCode: draftCode || undefined })
  const onReset = () => { setDraftCode(''); setParams({ current: 1, size: PAGE_SIZE }) }

  const columns = useMemo<ColumnDef<SpWarehouseReceipt>[]>(() => [
    { accessorKey: 'receiptCode', header: '入库单号' },
    { accessorKey: 'sourceType', header: '来源', cell: ({ row }) => row.original.sourceType || '—' },
    { accessorKey: 'productDesc', header: '产品', cell: ({ row }) => row.original.productDesc || '—' },
    {
      id: 'status', header: '状态',
      cell: ({ row }) => {
        const m = receiptStatusMeta(row.original.receiptStatus)
        return <Badge className={cn(m.className)}>{m.label}</Badge>
      },
    },
    {
      id: 'progress', header: '进度',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{progressText(row.original.postedItems, row.original.totalItems)}</span>
      ),
    },
  ], [])

  return (
    <PageContainer title="计划入库确认" description="对计划入库单逐条登账,分配库房库位并生成库存">
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-rc-code">入库单号</Label>
          <Input id="s-rc-code" className="h-9 w-48" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
      </SearchForm>

      <MasterDetailLayout
        master={
          <DataTable
            columns={columns}
            data={data?.records ?? []}
            loading={loading}
            loadingRowCount={PAGE_SIZE}
            onRowClick={(row) => setSelected(row)}
            rowClassName={(row) => cn(selected?.id === row.id && 'bg-accent')}
            pagination={{
              mode: 'server',
              pageIndex: (data?.current ?? params.current) - 1,
              pageSize: PAGE_SIZE,
              totalPages: data?.pages ?? 1,
              totalRows: data?.total,
              onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
            }}
          />
        }
        detail={
          selected ? (
            <ReceiptItemsPanel receipt={selected} />
          ) : (
            <RelatedPanel icon={ClipboardList} title="入库明细" empty emptyIcon={PackageOpen} emptyText="请选择左侧入库单查看明细" />
          )
        }
      />
    </PageContainer>
  )
}
```

- [ ] **Step 4：注册路由**

修改 `src/router.tsx`：在顶部 import 区加入

```tsx
import ReceiptList from '@/pages/inventory/receipt/ReceiptList'
```

在 `order/gantt` 路由之后、`403` 之前加入

```tsx
          { path: 'inventory/receipt', element: <ReceiptList /> },
```

- [ ] **Step 5：类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 通过。

- [ ] **Step 6：人工浏览验证（后端 :9090 + 前端 :4100）**

启动 `pnpm --filter mes-new dev`，登录后侧边栏 → 库存管理 → 计划入库确认。预期：左表列出入库单（seed `RK...`）；点行右侧出明细；对 `待登账` 行点【登账】→ 选库房（电脑配件库）→ 级联库位 → 确认 → toast 成功，明细状态变`已登账`、进度+1。

- [ ] **Step 7：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/inventory/receipt/ mes/frontend/apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 计划入库确认页(主从明细+库房库位登账弹窗)"
```

---

## Task 5：配套出库确认页（主从 + FIFO 确认登账）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/inventory/outbound/OutboundPostDialog.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/inventory/outbound/OutboundItemsPanel.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/inventory/outbound/OutboundList.tsx`
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1：出库登账确认弹窗（FIFO 自动，AlertDialog）**

`pages/inventory/outbound/OutboundPostDialog.tsx`：

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  toast,
} from '@workspace/ui'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { postOutboundItem } from '@/api/inventory/outbound'
import type { SpOutboundOrderItem } from '@/types/inventory'

interface Props {
  item: SpOutboundOrderItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function OutboundPostDialog({ item, open, onOpenChange }: Props) {
  const { mutate, loading } = useMutation$((itemId: string) => postOutboundItem({ itemId }))

  const onConfirm = async () => {
    if (!item) return
    try {
      await mutate(item.id)
      toast.success('出库登账成功')
      invalidate('["inventory","outbound"')
      invalidate('["inventory","stock"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast(库存不足等) */
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认出库登账</AlertDialogTitle>
          <AlertDialogDescription>
            将对物料「{item?.materialCode}」按数量 {item?.quantity}{item?.unit ? ` ${item.unit}` : ''} 执行
            <strong>先进先出(FIFO)</strong>自动扣减库存,并记录扣减的库位分配。库存不足时无法出库。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction disabled={loading} onClick={(e) => { e.preventDefault(); onConfirm() }}>
            {loading ? '提交中…' : '确认出库'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2：出库明细面板**

`pages/inventory/outbound/OutboundItemsPanel.tsx`：

```tsx
import { useState } from 'react'
import {
  Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn,
} from '@workspace/ui'
import { ClipboardList, PackageMinus } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import PermissionGuard from '@/components/PermissionGuard'
import OutboundPostDialog from './OutboundPostDialog'
import { useQuery$ } from '@/http/hooks'
import { outboundItems } from '@/api/inventory/outbound'
import { postStatusMeta } from '../inventoryStatus'
import type { SpOutboundOrder, SpOutboundOrderItem } from '@/types/inventory'

interface Props {
  order: SpOutboundOrder
}

export default function OutboundItemsPanel({ order }: Props) {
  const [posting, setPosting] = useState<SpOutboundOrderItem | null>(null)
  const { data: items } = useQuery$(
    ['inventory', 'outbound', 'items', order.id],
    () => outboundItems(order.id),
  )
  const list = items ?? []

  return (
    <>
      <RelatedPanel icon={ClipboardList} title={`出库明细 · ${order.outboundCode}`} count={list.length}>
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">该出库单暂无明细</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>物料</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>分配明细</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((it) => {
                const meta = postStatusMeta(it.postStatus)
                return (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="font-medium">{it.materialCode}</div>
                      <div className="text-xs text-muted-foreground">{it.materialDesc || '—'}</div>
                    </TableCell>
                    <TableCell className="text-right">{it.quantity}{it.unit ? ` ${it.unit}` : ''}</TableCell>
                    <TableCell><Badge className={cn(meta.className)}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.allocationDetail || '—'}</TableCell>
                    <TableCell>
                      {it.postStatus === 'pending' ? (
                        <PermissionGuard perm="inventory:outbound">
                          <Button size="sm" variant="outline" onClick={() => setPosting(it)}>
                            <PackageMinus className="size-4" />出库登账
                          </Button>
                        </PermissionGuard>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </RelatedPanel>

      <OutboundPostDialog item={posting} open={!!posting} onOpenChange={(o) => !o && setPosting(null)} />
    </>
  )
}
```

- [ ] **Step 3：出库单主从列表页**

`pages/inventory/outbound/OutboundList.tsx`：

```tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, DataTable, Input, Label, cn } from '@workspace/ui'
import { ClipboardList, PackageOpen } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import RelatedPanel from '@/components/RelatedPanel'
import OutboundItemsPanel from './OutboundItemsPanel'
import { useQuery$ } from '@/http/hooks'
import { pageOutbounds } from '@/api/inventory/outbound'
import { outboundStatusMeta, progressText } from '../inventoryStatus'
import type { OutboundPageParams, SpOutboundOrder } from '@/types/inventory'

const PAGE_SIZE = 10

export default function OutboundList() {
  const [params, setParams] = useState<OutboundPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [selected, setSelected] = useState<SpOutboundOrder | null>(null)

  const { data, loading } = useQuery$(['inventory', 'outbound', 'page', params], () => pageOutbounds(params))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, outboundCode: draftCode || undefined })
  const onReset = () => { setDraftCode(''); setParams({ current: 1, size: PAGE_SIZE }) }

  const columns = useMemo<ColumnDef<SpOutboundOrder>[]>(() => [
    { accessorKey: 'outboundCode', header: '出库单号' },
    { accessorKey: 'orderCode', header: '工单号', cell: ({ row }) => row.original.orderCode || '—' },
    { accessorKey: 'productDesc', header: '产品', cell: ({ row }) => row.original.productDesc || '—' },
    {
      id: 'status', header: '状态',
      cell: ({ row }) => {
        const m = outboundStatusMeta(row.original.outboundStatus)
        return <Badge className={cn(m.className)}>{m.label}</Badge>
      },
    },
    {
      id: 'progress', header: '进度',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{progressText(row.original.postedItems, row.original.totalItems)}</span>
      ),
    },
  ], [])

  return (
    <PageContainer title="配套出库确认" description="对生产配套出库单逐条登账,按 FIFO 自动扣减库存">
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-ob-code">出库单号</Label>
          <Input id="s-ob-code" className="h-9 w-48" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
      </SearchForm>

      <MasterDetailLayout
        master={
          <DataTable
            columns={columns}
            data={data?.records ?? []}
            loading={loading}
            loadingRowCount={PAGE_SIZE}
            onRowClick={(row) => setSelected(row)}
            rowClassName={(row) => cn(selected?.id === row.id && 'bg-accent')}
            pagination={{
              mode: 'server',
              pageIndex: (data?.current ?? params.current) - 1,
              pageSize: PAGE_SIZE,
              totalPages: data?.pages ?? 1,
              totalRows: data?.total,
              onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
            }}
          />
        }
        detail={
          selected ? (
            <OutboundItemsPanel order={selected} />
          ) : (
            <RelatedPanel icon={ClipboardList} title="出库明细" empty emptyIcon={PackageOpen} emptyText="请选择左侧出库单查看明细" />
          )
        }
      />
    </PageContainer>
  )
}
```

- [ ] **Step 4：注册路由**

`src/router.tsx`：import 区加

```tsx
import OutboundList from '@/pages/inventory/outbound/OutboundList'
```

路由区（紧接 `inventory/receipt` 后）加

```tsx
          { path: 'inventory/outbound', element: <OutboundList /> },
```

- [ ] **Step 5：类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 通过。

- [ ] **Step 6：人工浏览验证**

库存管理 → 配套出库确认。左表列出出库单（seed `CK...`）；点行看明细；对 `待登账` 行点【出库登账】→ 确认弹窗 → 确认 → toast 成功，明细变`已登账`且显示分配明细（如 `1-010101×50`），进度+1。库存查询页对应物料数量应减少。

- [ ] **Step 7：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/inventory/outbound/ mes/frontend/apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 配套出库确认页(主从明细+FIFO 确认登账)"
```

---

## Task 6：库存明细查询页（只读）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/inventory/query/InventoryQuery.tsx`
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1：查询页**

`pages/inventory/query/InventoryQuery.tsx`：

```tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, Input, Label } from '@workspace/ui'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import { useQuery$ } from '@/http/hooks'
import { pageInventory } from '@/api/inventory/stock'
import type { InventoryPageParams, SpInventory } from '@/types/inventory'

const PAGE_SIZE = 10

export default function InventoryQuery() {
  const [params, setParams] = useState<InventoryPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')

  const { data, loading } = useQuery$(['inventory', 'stock', 'page', params], () => pageInventory(params))

  const onSearch = () => setParams({
    current: 1, size: PAGE_SIZE,
    materialCode: draftCode || undefined,
    startDate: draftStart || undefined,
    endDate: draftEnd || undefined,
  })
  const onReset = () => {
    setDraftCode(''); setDraftStart(''); setDraftEnd('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const columns = useMemo<ColumnDef<SpInventory>[]>(() => [
    { accessorKey: 'materialCode', header: '物料编码' },
    { accessorKey: 'materialDesc', header: '描述', cell: ({ row }) => row.original.materialDesc || '—' },
    { accessorKey: 'unit', header: '单位', cell: ({ row }) => row.original.unit || '—' },
    { accessorKey: 'warehouseName', header: '库房', cell: ({ row }) => row.original.warehouseName || '—' },
    { accessorKey: 'locationCode', header: '库位', cell: ({ row }) => row.original.locationCode || '—' },
    { accessorKey: 'quantity', header: '数量', cell: ({ row }) => <span className="font-medium">{row.original.quantity}</span> },
    { accessorKey: 'lastInboundTime', header: '最近入库', cell: ({ row }) => row.original.lastInboundTime || '—' },
  ], [])

  return (
    <PageContainer title="库存明细查询" description="按物料编码与入库时间区间查询库位级库存台账">
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-iv-code">物料编码</Label>
          <Input id="s-iv-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-iv-start">入库起</Label>
          <Input id="s-iv-start" type="date" className="h-9 w-40" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-iv-end">入库止</Label>
          <Input id="s-iv-end" type="date" className="h-9 w-40" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
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
    </PageContainer>
  )
}
```

- [ ] **Step 2：注册路由**

`src/router.tsx`：import 区加

```tsx
import InventoryQuery from '@/pages/inventory/query/InventoryQuery'
```

路由区加

```tsx
          { path: 'inventory/query', element: <InventoryQuery /> },
```

- [ ] **Step 3：类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 通过。

- [ ] **Step 4：人工浏览验证**

库存管理 → 库存明细查询。预期：列出 seed 库存（PART-002~008 各 100，分布在 7 个库位）；输入物料编码/日期区间搜索可过滤；分页可翻页。

- [ ] **Step 5：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/inventory/query/ mes/frontend/apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 库存明细查询页(物料/日期过滤+分页只读)"
```

---

## Task 7：手动入库页（表单）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/inventory/manual/ManualInbound.tsx`
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1：手动入库表单页（物料/库房→库位级联，普通 useState）**

`pages/inventory/manual/ManualInbound.tsx`：

```tsx
import { useState } from 'react'
import {
  Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast,
} from '@workspace/ui'
import PageContainer from '@/components/PageContainer'
import FormField from '@/components/FormField'
import { FormSection } from '@/components/FormDialog'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { materilePage } from '@/api/basedata/materile'
import { warehousePage, warehouseLocations } from '@/api/basedata/warehouse'
import { manualInbound } from '@/api/inventory/stock'
import type { ManualInboundDTO } from '@/types/inventory'

const FETCH_SIZE = 200

export default function ManualInbound() {
  const [materialCode, setMaterialCode] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [quantity, setQuantity] = useState('')

  const { data: matPage } = useQuery$(
    ['basedata', 'materile', 'page', { current: 1, size: FETCH_SIZE }],
    () => materilePage({ current: 1, size: FETCH_SIZE }),
  )
  const { data: whPage } = useQuery$(
    ['basedata', 'warehouse', 'page', { current: 1, size: FETCH_SIZE }],
    () => warehousePage({ current: 1, size: FETCH_SIZE }),
  )
  const { data: locations } = useQuery$(
    ['basedata', 'warehouse', 'locations', warehouseId],
    () => warehouseLocations(warehouseId),
    { enabled: !!warehouseId },
  )

  const materials = matPage?.records ?? []
  const warehouses = (whPage?.records ?? []).filter((w) => w.type === '零件库')

  const { mutate, loading } = useMutation$((dto: ManualInboundDTO) => manualInbound(dto))

  const reset = () => { setMaterialCode(''); setWarehouseId(''); setLocationId(''); setQuantity('') }

  const onSubmit = async () => {
    const mat = materials.find((m) => m.materiel === materialCode)
    if (!materialCode || !mat) { toast.error('请选择物料'); return }
    if (!warehouseId) { toast.error('请选择库房'); return }
    if (!locationId) { toast.error('请选择库位'); return }
    const qty = Number(quantity)
    if (!quantity || Number.isNaN(qty) || qty <= 0) { toast.error('入库数量必须大于 0'); return }
    try {
      await mutate({
        materialCode: mat.materiel,
        materialDesc: mat.materielDesc,
        unit: mat.unit,
        warehouseId,
        locationId,
        quantity: qty,
      })
      toast.success('手动入库成功')
      invalidate('["inventory","stock"')
      reset()
    } catch {
      /* 拦截器已 toast(混放/归属/零件库等) */
    }
  }

  return (
    <PageContainer title="手动入库" description="补货/退货等非计划入库,直接生成库存台账">
      <div className="max-w-xl rounded-lg border border-border bg-card p-6">
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
          <FormSection title="入库信息" tag="必填">
            <FormField label="物料" required>
              <Select value={materialCode || undefined} onValueChange={setMaterialCode}>
                <SelectTrigger className="w-full"><SelectValue placeholder="请选择物料" /></SelectTrigger>
                <SelectContent>
                  {materials.map((m) => <SelectItem key={m.id} value={m.materiel}>{m.materiel} · {m.materielDesc}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="库房" required help="仅零件库">
                <Select value={warehouseId || undefined} onValueChange={(v) => { setWarehouseId(v); setLocationId('') }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择库房" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}（{w.code}）</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="库位" required help="一库位一物料">
                <Select value={locationId || undefined} onValueChange={setLocationId} disabled={!warehouseId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={warehouseId ? '请选择库位' : '请先选择库房'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(locations ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <FormField label="数量" htmlFor="mi-qty" required>
              <Input id="mi-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </FormField>
          </FormSection>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={reset}>重置</Button>
            <Button type="submit" disabled={loading}>{loading ? '提交中…' : '确认入库'}</Button>
          </div>
        </form>
      </div>
    </PageContainer>
  )
}
```

- [ ] **Step 2：注册路由**

`src/router.tsx`：import 区加

```tsx
import ManualInbound from '@/pages/inventory/manual/ManualInbound'
```

路由区加

```tsx
          { path: 'inventory/manual-inbound', element: <ManualInbound /> },
```

- [ ] **Step 3：类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 通过。

- [ ] **Step 4：人工浏览验证**

库存管理 → 手动入库。选物料 → 选库房（电脑配件库）→ 级联库位 → 填数量 → 确认入库 → toast 成功 + 表单重置。库存查询页该库位数量应增加（同物料累加；异物料同库位应被后端拒绝并 toast）。

- [ ] **Step 5：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/inventory/manual/ mes/frontend/apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 手动入库表单页(物料/库房库位级联+数量校验)"
```

---

## Task 8（可选）：后端库存守卫 Mockito 单测

> 后端本周期**零生产代码改动**（审查已确认无 bug，见 spec §2.3）。本任务仅追加测试以固化"混放/库存不足/非零件库/数量校验"等守卫行为，沿用甘特周期 `SpGanttServiceImplTest` 的 JUnit4 + Mockito 风格。可跳过。

**Files:**
- Create: `mes/src/test/java/com/wangziyang/mes/inventory/service/SpInventoryServiceImplTest.java`

- [ ] **Step 1：写守卫单测（手动入库为例）**

```java
package com.wangziyang.mes.inventory.service;

import com.wangziyang.mes.basedata.entity.SpWarehouse;
import com.wangziyang.mes.basedata.entity.SpWarehouseLocation;
import com.wangziyang.mes.basedata.service.ISpWarehouseLocationService;
import com.wangziyang.mes.basedata.service.ISpWarehouseService;
import com.wangziyang.mes.inventory.dto.ManualInboundDTO;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.mapper.SpInventoryMapper;
import com.wangziyang.mes.inventory.service.impl.SpInventoryServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.Silent.class)
public class SpInventoryServiceImplTest {

    @Mock
    private SpInventoryMapper inventoryMapper;   // 注入 ServiceImpl.baseMapper

    @Mock
    private ISpWarehouseService spWarehouseService;

    @Mock
    private ISpWarehouseLocationService spWarehouseLocationService;

    @InjectMocks
    private SpInventoryServiceImpl service;

    private ManualInboundDTO dto(BigDecimal qty, String material) {
        ManualInboundDTO d = new ManualInboundDTO();
        d.setMaterialCode(material);
        d.setMaterialDesc("描述");
        d.setUnit("个");
        d.setWarehouseId("wh1");
        d.setLocationId("loc1");
        d.setQuantity(qty);
        return d;
    }

    private SpWarehouse partWarehouse() {
        SpWarehouse w = new SpWarehouse();
        w.setId("wh1");
        w.setName("电脑配件库");
        w.setType("零件库");
        w.setDeleted("0");
        return w;
    }

    private SpWarehouseLocation location() {
        SpWarehouseLocation l = new SpWarehouseLocation();
        l.setId("loc1");
        l.setCode("1-010101");
        l.setWarehouseId("wh1");
        l.setDeleted("0");
        return l;
    }

    @Test(expected = RuntimeException.class)
    public void quantity_zero_throws() {
        service.manualInbound(dto(BigDecimal.ZERO, "PART-001"));
    }

    @Test(expected = RuntimeException.class)
    public void blank_material_throws() {
        service.manualInbound(dto(new BigDecimal("10"), "  "));
    }

    @Test(expected = RuntimeException.class)
    public void non_part_warehouse_throws() {
        SpWarehouse w = partWarehouse();
        w.setType("产品库");
        when(spWarehouseService.getById("wh1")).thenReturn(w);
        service.manualInbound(dto(new BigDecimal("10"), "PART-001"));
    }

    @Test(expected = RuntimeException.class)
    public void mixing_conflict_throws() {
        when(spWarehouseService.getById("wh1")).thenReturn(partWarehouse());
        when(spWarehouseLocationService.getById("loc1")).thenReturn(location());
        SpInventory existing = new SpInventory();
        existing.setLocationId("loc1");
        existing.setMaterialCode("PART-999");
        when(inventoryMapper.selectOne(any())).thenReturn(existing);
        service.manualInbound(dto(new BigDecimal("10"), "PART-001"));
    }

    @Test
    public void new_location_inserts() {
        when(spWarehouseService.getById("wh1")).thenReturn(partWarehouse());
        when(spWarehouseLocationService.getById("loc1")).thenReturn(location());
        when(inventoryMapper.selectOne(any())).thenReturn(null);
        service.manualInbound(dto(new BigDecimal("10"), "PART-001"));
        verify(inventoryMapper).insert(any());
    }
}
```

- [ ] **Step 2：运行单测**

Run（系统 mvn，JDK11+；`./mvnw` 已坏，见 [[backend-build-mvnw-broken]]）：`cd mes && mvn test -Dtest=SpInventoryServiceImplTest`
Expected: BUILD SUCCESS，5 tests run，0 failures。
> 若 `@InjectMocks` 未能注入到 `ServiceImpl.baseMapper`（继承字段），改用 `org.springframework.test.util.ReflectionTestUtils.setField(service, "baseMapper", inventoryMapper)` 在 `@Before` 里手动注入。

- [ ] **Step 3：提交**

```bash
git add mes/src/test/java/com/wangziyang/mes/inventory/service/SpInventoryServiceImplTest.java
git commit -m "✅ test(inventory): 手动入库守卫单测(数量/混放/零件库/新增)"
```

---

## Task 9：整体验证 + 记忆更新

- [ ] **Step 1：类型检查 + Lint + 单测 + 构建（贴实际输出）**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
pnpm --filter mes-new lint
pnpm --filter mes-new test
pnpm --filter mes-new build
```
Expected: 四项全绿；`build` 产出 `dist/`。

- [ ] **Step 2：人工双端全链路走查**

后端 :9090 + 前端 :4100，登录（图形验证码人工）后依次：
1. 计划入库确认：选入库单 → 登账（库房+库位）→ 明细`已登账`、进度+1
2. 库存明细查询：对应物料/库位数量增加
3. 配套出库确认：选出库单 → 出库登账（FIFO）→ 明细`已登账`+分配明细，进度+1
4. 库存明细查询：对应物料数量减少
5. 手动入库：选物料/库房/库位/数量 → 成功 → 查询见增量
6. 异常：对已占用库位登账不同物料 → toast 混放冲突；出库数量超库存 → toast 库存不足

- [ ] **Step 3：多 agent 审查（spec 合规 + 代码质量）**

派发审查 agent 完整读取本周期改动文件，核对：路由匹配菜单 url、端点路径/编码正确（form vs JSON）、invalidate 前缀正确、空态/加载态、无 RHF 字段名 DOM 冲突、TS 严格通过。发现问题 → 修复 → re-review。

- [ ] **Step 4：更新 roadmap 记忆**

在 `memory/mes-rebuild-roadmap.md` 标记"库存管理(周期 2h)已完成"，剩余仅 动态表 Manager / 数字化 / (可选)工艺查询。

---

## Self-Review（计划自检）

- **Spec 覆盖**：4 页（receipt/query/outbound/manual）→ Task 4/6/5/7；类型→Task1；API→Task2；状态纯函数+测试→Task3；后端审查零改动+可选守卫测试→Task8；验证→Task9。菜单路由匹配在 Task4-7 Step"注册路由" + Task9 走查覆盖。✅ 无遗漏。
- **占位符扫描**：无 TBD/TODO；每个 code step 均为完整可编译代码。✅
- **类型一致性**：`SpWarehouseReceipt/Item`、`SpOutboundOrder/Item`、`SpInventory`、`*PageParams`、`*DTO` 在 Task1 定义，Task2/4/5/6/7 引用名一致；`receiptStatusMeta/outboundStatusMeta/postStatusMeta/progressText/progressPercent` 在 Task3 定义并被列表/明细页引用一致；API 函数名 `pageReceipts/receiptItems/postReceiptItem/pageOutbounds/outboundItems/postOutboundItem/pageInventory/manualInbound` 定义与调用一致。✅
- **端点/编码**：3 个 page 端点 form 编码（不带 JSON_HEADERS）、3 个 post/manual 端点带 JSON_HEADERS；查询端点 `/inventory/page` 正确。✅
