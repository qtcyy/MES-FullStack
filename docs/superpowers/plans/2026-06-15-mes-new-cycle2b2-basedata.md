# 周期 2b-2 基础数据(设备组/工艺单元/仓库)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/mes-new` 交付设备组/工艺单元/仓库三页(主表 CRUD + 关联管理),并引入增强弹窗 `FormDialog` 与主从/穿梭积木。

**Architecture:** 先建共享积木(可测纯逻辑 TDD → DataTable 增量增强 → FormDialog/FormSection/MasterDetailLayout/RelatedPanel/DualListTransfer),再并行三页(列表+表单+关联面板),最后集成方统一注册路由 + 全量验证 + 两阶段 review。

**Tech Stack:** React 19 + TS + Vite + `@workspace/ui`(shadcn/Radix)+ react-hook-form + zod + `@ngify/http`(rxjs)+ vitest。

**目标目录:`mes/frontend/apps/mes-new`(严禁改 `apps/mes1`)。所有命令在 `mes/frontend` 下执行;git 在仓库根 `/Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack`。**

---

## 后端契约(已核实,前端照此实现)

| 数据 | endpoint | 方法 | 形态 | 字段 |
|---|---|---|---|---|
| 设备组 | `/basedata/device-group/page` | POST | form | 搜索 `name`/`code` + `current`/`size` |
| 设备组 | `/basedata/device-group/add-or-update` | POST | **JSON** `@RequestBody SpDeviceGroup` | id/code/name/descr |
| 设备组 | `/basedata/device-group/delete` | POST | **JSON** `Map` | `{id}` |
| 设备组 | `/basedata/device-group/items/{groupId}` | GET | — | 返回 `SpDevice[]` |
| 设备组 | `/basedata/device-group/items/add` | POST | **JSON** | `{groupId, deviceIds:[]}` |
| 设备组 | `/basedata/device-group/items/remove` | POST | **JSON** | `{groupId, deviceId}` |
| 设备(候选) | `/basedata/device/page` | POST | form | 搜索 `name`/`code`/`type` |
| 工艺单元 | `/basedata/process-unit/page` | POST | form | 搜索 `name`/`code` |
| 工艺单元 | `/basedata/process-unit/add-or-update` | POST | **JSON** `@RequestBody SpProcessUnit` | id/code/name/type/hasLineWarehouse/descr |
| 工艺单元 | `/basedata/process-unit/delete` | POST | **JSON** `Map` | `{id}` |
| 工艺单元 | `/basedata/process-unit/teams/{unitId}` | GET | — | 返回 `SpTeam[]` |
| 工艺单元 | `/basedata/process-unit/teams/add` | POST | **JSON** | `{unitId, teamId}` |
| 工艺单元 | `/basedata/process-unit/teams/remove` | POST | **JSON** | `{unitId, teamId}` |
| 班组(候选) | `/admin/sys/team/page` | POST | form | 搜索 `name`/`code` |
| 仓库 | `/basedata/warehouse/page` | POST | form | 搜索 `name`/`code` |
| 仓库 | `/basedata/warehouse/add-or-update` | POST | **JSON** `@RequestBody SpWarehouse` | id/code/name/type/groups/rows/layers/columns/descr |
| 仓库 | `/basedata/warehouse/delete` | POST | **JSON** `Map` | `{id}` |
| 仓库 | `/basedata/warehouse/locations/{warehouseId}` | GET | — | 返回 `SpWarehouseLocation[]` |

> 关键:`add-or-update`/`delete`/`items.*`/`teams.*` 全为 JSON,API 函数显式 `headers:{ 'Content-Type':'application/json' }`(绕过 `formEncodingInterceptor`)。`page` 走默认 form。GET 子列表用 `http.get`。搜索字段是 `name`/`code`(**无 Like 后缀**)。

---

## 文件结构

```
apps/mes-new/src/
├── utils/transfer.ts                         # [T1] 纯逻辑(filterTransferItems/excludeSelected)+ TransferItem 类型
├── utils/__tests__/transfer.test.ts          # [T1] 单测
├── types/{device,process-unit,warehouse}.ts  # [T2]
├── api/basedata/{device-group,process-unit,warehouse}.ts  # [T3]
├── api/system/team.ts                         # [T3]
├── components/FormDialog.tsx                  # [T5] 增强弹窗 + FormSection 导出
├── components/MasterDetailLayout.tsx          # [T6]
├── components/RelatedPanel.tsx                # [T7]
├── components/DualListTransfer.tsx            # [T8]
├── pages/basedata/device-group/{DeviceGroupList,DeviceGroupForm,DeviceGroupMembers}.tsx  # [T9]
├── pages/basedata/process-unit/{ProcessUnitList,ProcessUnitForm,ProcessUnitTeams}.tsx    # [T10]
├── pages/basedata/warehouse/{WarehouseList,WarehouseForm,WarehouseLocations}.tsx          # [T11]
└── router.tsx (集成方改)                      # [T12]
packages/ui/src/components/data-table.tsx      # [T4] 增量加 onRowClick + rowClassName
```

**并行策略:** T1–T8 顺序建(后续依赖);T9/T10/T11 三页**并行派发**(文件不重叠,不碰 router.tsx、不 build、不 commit);T12 集成方统一注册路由 + 验证 + review。

---

### Task 1: 穿梭纯逻辑 + 单测(TDD)

**Files:**
- Create: `apps/mes-new/src/utils/transfer.ts`
- Test: `apps/mes-new/src/utils/__tests__/transfer.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// apps/mes-new/src/utils/__tests__/transfer.test.ts
import { describe, it, expect } from 'vitest'
import { filterTransferItems, excludeSelected } from '../transfer'

describe('filterTransferItems', () => {
  const items = [
    { id: '1', primary: 'CNC-01', secondary: '数控机床' },
    { id: '2', primary: 'LASER-02', secondary: '激光切割' },
  ]
  it('空关键字返回全部', () => {
    expect(filterTransferItems(items, '')).toHaveLength(2)
    expect(filterTransferItems(items, '   ')).toHaveLength(2)
  })
  it('匹配 primary(大小写不敏感)', () => {
    expect(filterTransferItems(items, 'cnc')).toEqual([items[0]])
  })
  it('匹配 secondary', () => {
    expect(filterTransferItems(items, '激光')).toEqual([items[1]])
  })
  it('无匹配返回空', () => {
    expect(filterTransferItems(items, 'xyz')).toHaveLength(0)
  })
})

describe('excludeSelected', () => {
  const all = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('排除已选 id', () => {
    expect(excludeSelected(all, ['b'])).toEqual([{ id: 'a' }, { id: 'c' }])
  })
  it('空已选返回全部', () => {
    expect(excludeSelected(all, [])).toHaveLength(3)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter mes-new exec vitest run src/utils/__tests__/transfer.test.ts`
Expected: FAIL(`transfer.ts` 不存在 / 导出未定义)

- [ ] **Step 3: 写实现**

```ts
// apps/mes-new/src/utils/transfer.ts
export interface TransferItem {
  id: string
  primary: string
  secondary?: string
}

/** 关键字过滤:对 primary + secondary 做大小写不敏感包含匹配 */
export function filterTransferItems(items: TransferItem[], keyword: string): TransferItem[] {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return items
  return items.filter(
    (it) =>
      it.primary.toLowerCase().includes(kw) ||
      (it.secondary?.toLowerCase().includes(kw) ?? false),
  )
}

/** 从全集中排除已选 id,得到候选 */
export function excludeSelected<T extends { id: string }>(all: T[], selectedIds: string[]): T[] {
  const set = new Set(selectedIds)
  return all.filter((it) => !set.has(it.id))
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter mes-new exec vitest run src/utils/__tests__/transfer.test.ts`
Expected: PASS(6 个用例全过)

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/utils/transfer.ts mes/frontend/apps/mes-new/src/utils/__tests__/transfer.test.ts
git commit -m "✨ feat(mes-new): 穿梭纯逻辑 transfer.ts(filter/exclude)+ 单测"
```

---

### Task 2: 类型定义

**Files:**
- Create: `apps/mes-new/src/types/device.ts`
- Create: `apps/mes-new/src/types/process-unit.ts`
- Create: `apps/mes-new/src/types/warehouse.ts`

- [ ] **Step 1: 写 device.ts**

```ts
// apps/mes-new/src/types/device.ts
export interface SpDevice {
  id: string
  code: string
  name: string
  type?: string
  model?: string
  specs?: string
  lineId?: string
  location?: string
  status?: string
  descr?: string
  deleted?: string
  createTime?: string
  updateTime?: string
}

export interface SpDeviceGroup {
  id: string
  code: string
  name: string
  descr?: string
  deleted?: string
  createTime?: string
  updateTime?: string
}

export interface SpDeviceGroupDTO extends SpDeviceGroup {
  deviceCount?: number
  deviceList?: SpDevice[]
  deviceIds?: string[]
}
```

- [ ] **Step 2: 写 process-unit.ts**

```ts
// apps/mes-new/src/types/process-unit.ts
export interface SpTeam {
  id: string
  code: string
  name: string
  descr?: string
  lineId?: string
  workshopId?: string
  startTime?: string
  endTime?: string
  workdays?: string
  deleted?: string
}

export interface SpProcessUnit {
  id: string
  code: string
  name: string
  type?: string
  /** 是否有线边库:'0' 无 / '1' 有 */
  hasLineWarehouse?: string
  descr?: string
  deleted?: string
  createTime?: string
  updateTime?: string
}

export interface SpProcessUnitDTO extends SpProcessUnit {
  teamList?: SpTeam[]
}
```

- [ ] **Step 3: 写 warehouse.ts**

```ts
// apps/mes-new/src/types/warehouse.ts
export interface SpWarehouseLocation {
  id: string
  warehouseId: string
  code: string
  groupNo: number
  rowNo: number
  layerNo: number
  colNo: number
  deleted?: string
}

export interface SpWarehouse {
  id: string
  code: string
  name: string
  type?: string
  groups: number
  rows: number
  layers: number
  columns: number
  descr?: string
  deleted?: string
  createTime?: string
  updateTime?: string
}
```

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/types/device.ts mes/frontend/apps/mes-new/src/types/process-unit.ts mes/frontend/apps/mes-new/src/types/warehouse.ts
git commit -m "🏷️ feat(mes-new): 设备组/工艺单元/仓库类型定义"
```

---

### Task 3: API 层

**Files:**
- Create: `apps/mes-new/src/api/basedata/device-group.ts`
- Create: `apps/mes-new/src/api/basedata/process-unit.ts`
- Create: `apps/mes-new/src/api/basedata/warehouse.ts`
- Create: `apps/mes-new/src/api/system/team.ts`

- [ ] **Step 1: 写 device-group.ts**

```ts
// apps/mes-new/src/api/basedata/device-group.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpDeviceGroupDTO, SpDevice } from '@/types/device'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface DeviceGroupPageParams extends PageParams {
  name?: string
  code?: string
}

export function deviceGroupPage(params: DeviceGroupPageParams) {
  return http.post<PageResult<SpDeviceGroupDTO>>('/basedata/device-group/page', params)
}

/** add-or-update 为 @RequestBody JSON */
export function deviceGroupAddOrUpdate(record: Partial<SpDeviceGroupDTO>) {
  return http.post<string>('/basedata/device-group/add-or-update', record, JSON_HEADERS)
}

/** delete 为 @RequestBody Map{id} */
export function deviceGroupDelete(id: string) {
  return http.post<void>('/basedata/device-group/delete', { id }, JSON_HEADERS)
}

/** 成员设备列表 */
export function deviceGroupItems(groupId: string) {
  return http.get<SpDevice[]>(`/basedata/device-group/items/${groupId}`)
}

/** 批量加入成员设备 */
export function deviceGroupItemsAdd(groupId: string, deviceIds: string[]) {
  return http.post<void>('/basedata/device-group/items/add', { groupId, deviceIds }, JSON_HEADERS)
}

/** 移除单个成员设备 */
export function deviceGroupItemsRemove(groupId: string, deviceId: string) {
  return http.post<void>('/basedata/device-group/items/remove', { groupId, deviceId }, JSON_HEADERS)
}

export interface DevicePageParams extends PageParams {
  name?: string
  code?: string
  type?: string
}

/** 候选设备(全量分页,用于穿梭弹窗) */
export function devicePage(params: DevicePageParams) {
  return http.post<PageResult<SpDevice>>('/basedata/device/page', params)
}
```

- [ ] **Step 2: 写 process-unit.ts**

```ts
// apps/mes-new/src/api/basedata/process-unit.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpProcessUnitDTO, SpTeam } from '@/types/process-unit'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface ProcessUnitPageParams extends PageParams {
  name?: string
  code?: string
}

export function processUnitPage(params: ProcessUnitPageParams) {
  return http.post<PageResult<SpProcessUnitDTO>>('/basedata/process-unit/page', params)
}

export function processUnitAddOrUpdate(record: Partial<SpProcessUnitDTO>) {
  return http.post<string>('/basedata/process-unit/add-or-update', record, JSON_HEADERS)
}

export function processUnitDelete(id: string) {
  return http.post<void>('/basedata/process-unit/delete', { id }, JSON_HEADERS)
}

export function processUnitTeams(unitId: string) {
  return http.get<SpTeam[]>(`/basedata/process-unit/teams/${unitId}`)
}

export function processUnitTeamAdd(unitId: string, teamId: string) {
  return http.post<void>('/basedata/process-unit/teams/add', { unitId, teamId }, JSON_HEADERS)
}

export function processUnitTeamRemove(unitId: string, teamId: string) {
  return http.post<void>('/basedata/process-unit/teams/remove', { unitId, teamId }, JSON_HEADERS)
}
```

- [ ] **Step 3: 写 system/team.ts**

```ts
// apps/mes-new/src/api/system/team.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpTeam } from '@/types/process-unit'

export interface TeamPageParams extends PageParams {
  name?: string
  code?: string
}

/** 全量班组(分页),用于工艺单元绑定候选 */
export function teamPage(params: TeamPageParams) {
  return http.post<PageResult<SpTeam>>('/admin/sys/team/page', params)
}
```

- [ ] **Step 4: 写 warehouse.ts**

```ts
// apps/mes-new/src/api/basedata/warehouse.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface WarehousePageParams extends PageParams {
  name?: string
  code?: string
}

export function warehousePage(params: WarehousePageParams) {
  return http.post<PageResult<SpWarehouse>>('/basedata/warehouse/page', params)
}

export function warehouseAddOrUpdate(record: Partial<SpWarehouse>) {
  return http.post<string>('/basedata/warehouse/add-or-update', record, JSON_HEADERS)
}

export function warehouseDelete(id: string) {
  return http.post<void>('/basedata/warehouse/delete', { id }, JSON_HEADERS)
}

export function warehouseLocations(warehouseId: string) {
  return http.get<SpWarehouseLocation[]>(`/basedata/warehouse/locations/${warehouseId}`)
}
```

- [ ] **Step 5: tsc 校验 + 提交**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无报错(打印为空即通过)

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/api/basedata/device-group.ts mes/frontend/apps/mes-new/src/api/basedata/process-unit.ts mes/frontend/apps/mes-new/src/api/basedata/warehouse.ts mes/frontend/apps/mes-new/src/api/system/team.ts
git commit -m "✨ feat(mes-new): 设备组/工艺单元/仓库/班组 API 层"
```

---

### Task 4: DataTable 增量增强(行点击 + 行样式)

**Files:**
- Modify: `packages/ui/src/components/data-table.tsx`

> 增量、零破坏:新增两个可选 prop,既有用法(UserList/MaterileList/ComponentList 等)不传 → 行为不变。

- [ ] **Step 1: 接口加可选 prop**

在 `interface DataTableProps`(约 49-66 行)内 `defaultExpanded?: boolean;` 之后追加:

```tsx
  /** 行点击回调(传入原始行数据) */
  onRowClick?: (row: TData) => void;
  /** 返回追加到该行 <TableRow> 的 className(用于选中高亮) */
  rowClassName?: (row: TData) => string;
```

- [ ] **Step 2: 解构 prop**

在函数签名解构(约 68-84 行)内 `defaultExpanded = true,` 之后追加:

```tsx
  onRowClick,
  rowClassName,
```

- [ ] **Step 3: 应用到 TableRow**

将渲染数据行的 `<TableRow>`(约 202-206 行)替换为:

```tsx
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row.original)
                  )}
                >
```

- [ ] **Step 4: 构建校验(确保零破坏)**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无报错

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/packages/ui/src/components/data-table.tsx
git commit -m "✨ feat(ui): DataTable 增量支持 onRowClick / rowClassName(主从选中)"
```

---

### Task 5: 增强弹窗 FormDialog + FormSection

**Files:**
- Create: `apps/mes-new/src/components/FormDialog.tsx`

> 不改旧 `ModalForm.tsx`,新建独立组件,仅 2b-2 新页面使用。

- [ ] **Step 1: 写 FormDialog.tsx**

```tsx
// apps/mes-new/src/components/FormDialog.tsx
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator,
} from '@workspace/ui'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  icon?: LucideIcon
  onSubmit: () => void
  submitting?: boolean
  submitText?: string
  /** 覆盖弹窗宽度,默认 sm:max-w-lg */
  contentClassName?: string
  children: ReactNode
}

export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  onSubmit,
  submitting,
  submitText = '确定',
  contentClassName = 'sm:max-w-lg',
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`gap-0 overflow-hidden p-0 ${contentClassName}`}>
        <DialogHeader className="space-y-0 bg-gradient-to-r from-primary/5 to-transparent px-6 py-4 text-left">
          <div className="flex items-center gap-3">
            <span className="h-10 w-1 shrink-0 rounded-full bg-primary" />
            {Icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <DialogTitle className="truncate">{title}</DialogTitle>
              {description && <DialogDescription className="truncate">{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <Separator />
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 px-6 py-5">{children}</div>
          </ScrollArea>
          <Separator />
          <DialogFooter className="px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '提交中…' : <><Check className="size-4" />{submitText}</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** 表单分区:小标题 + 细分隔线 */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
        <Separator className="flex-1" />
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: tsc 校验 + 提交**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无报错

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/components/FormDialog.tsx
git commit -m "💄 feat(mes-new): 增强弹窗 FormDialog(渐变 header/图标芯片/分区/scroll)+ FormSection"
```

---

### Task 6: MasterDetailLayout

**Files:**
- Create: `apps/mes-new/src/components/MasterDetailLayout.tsx`

- [ ] **Step 1: 写组件**

```tsx
// apps/mes-new/src/components/MasterDetailLayout.tsx
import type { ReactNode } from 'react'

interface MasterDetailLayoutProps {
  /** 左:主表区 */
  master: ReactNode
  /** 右:关联面板区(未选中由调用方传入空态) */
  detail: ReactNode
}

/** 主从两栏布局:大屏左 3 / 右 2,小屏堆叠 */
export default function MasterDetailLayout({ master, detail }: MasterDetailLayoutProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0">{master}</div>
      <div className="min-w-0">{detail}</div>
    </div>
  )
}
```

- [ ] **Step 2: tsc 校验 + 提交**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无报错

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/components/MasterDetailLayout.tsx
git commit -m "💄 feat(mes-new): MasterDetailLayout 主从两栏布局"
```

---

### Task 7: RelatedPanel(关联面板卡片)

**Files:**
- Create: `apps/mes-new/src/components/RelatedPanel.tsx`

- [ ] **Step 1: 写组件**

```tsx
// apps/mes-new/src/components/RelatedPanel.tsx
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@workspace/ui'

interface RelatedPanelProps {
  icon: LucideIcon
  title: string
  /** 计数 Badge;不传则不显示 */
  count?: number
  /** 头部右侧操作区(如"管理成员"按钮) */
  actions?: ReactNode
  /** 空态 */
  empty?: boolean
  emptyIcon?: LucideIcon
  emptyText?: string
  children?: ReactNode
}

/** 关联面板:卡片 + 图标标题 + 计数 Badge + 空态 */
export default function RelatedPanel({
  icon: Icon,
  title,
  count,
  actions,
  empty,
  emptyIcon: EmptyIcon,
  emptyText = '请选择左侧条目',
  children,
}: RelatedPanelProps) {
  return (
    <div className="flex h-full min-h-72 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-medium">{title}</span>
          {typeof count === 'number' && <Badge variant="secondary">{count}</Badge>}
        </div>
        {actions}
      </div>
      <div className="flex-1 p-3">
        {empty ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            {EmptyIcon && <EmptyIcon className="size-8 opacity-60" />}
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: tsc 校验 + 提交**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无报错

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/components/RelatedPanel.tsx
git commit -m "💄 feat(mes-new): RelatedPanel 关联面板卡片(图标/计数/空态)"
```

---

### Task 8: DualListTransfer(穿梭弹窗)

**Files:**
- Create: `apps/mes-new/src/components/DualListTransfer.tsx`

- [ ] **Step 1: 写组件**

```tsx
// apps/mes-new/src/components/DualListTransfer.tsx
import { useState } from 'react'
import { ArrowRight, Search, X } from 'lucide-react'
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
} from '@workspace/ui'
import { filterTransferItems, type TransferItem } from '@/utils/transfer'

interface DualListTransferProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** 候选(已排除已选) */
  candidates: TransferItem[]
  /** 已选/已绑定 */
  selected: TransferItem[]
  onAdd: (ids: string[]) => void | Promise<void>
  onRemove: (id: string) => void | Promise<void>
}

export default function DualListTransfer({
  open,
  onOpenChange,
  title,
  description,
  candidates,
  selected,
  onAdd,
  onRemove,
}: DualListTransferProps) {
  const [leftKw, setLeftKw] = useState('')
  const [rightKw, setRightKw] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const leftItems = filterTransferItems(candidates, leftKw)
  const rightItems = filterTransferItems(selected, rightKw)
  const checkedIds = Object.keys(checked).filter((id) => checked[id])

  const handleAdd = async () => {
    if (checkedIds.length === 0) return
    await onAdd(checkedIds)
    setChecked({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
          {/* 候选 */}
          <div className="flex flex-col rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">候选</span>
              <Badge variant="secondary">{leftItems.length}</Badge>
            </div>
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-8 pl-8" placeholder="搜索" value={leftKw} onChange={(e) => setLeftKw(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="h-72">
              <ul className="px-2 pb-2">
                {leftItems.map((it) => (
                  <li key={it.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                      <Checkbox
                        checked={!!checked[it.id]}
                        onCheckedChange={(v) => setChecked((c) => ({ ...c, [it.id]: !!v }))}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{it.primary}</span>
                        {it.secondary && <span className="block truncate text-xs text-muted-foreground">{it.secondary}</span>}
                      </span>
                    </label>
                  </li>
                ))}
                {leftItems.length === 0 && (
                  <li className="px-2 py-6 text-center text-sm text-muted-foreground">无候选</li>
                )}
              </ul>
            </ScrollArea>
          </div>

          {/* 中间方向按钮 */}
          <div className="flex items-center">
            <Button type="button" size="sm" onClick={handleAdd} disabled={checkedIds.length === 0}>
              <ArrowRight className="size-4" />
              加入{checkedIds.length > 0 ? ` (${checkedIds.length})` : ''}
            </Button>
          </div>

          {/* 已选 */}
          <div className="flex flex-col rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">已选</span>
              <Badge variant="secondary">{rightItems.length}</Badge>
            </div>
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-8 pl-8" placeholder="搜索" value={rightKw} onChange={(e) => setRightKw(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="h-72">
              <ul className="px-2 pb-2">
                {rightItems.map((it) => (
                  <li key={it.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{it.primary}</span>
                      {it.secondary && <span className="block truncate text-xs text-muted-foreground">{it.secondary}</span>}
                    </span>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => onRemove(it.id)}>
                      <X className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
                {rightItems.length === 0 && (
                  <li className="px-2 py-6 text-center text-sm text-muted-foreground">暂无</li>
                )}
              </ul>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: tsc 校验 + 提交**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无报错

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/components/DualListTransfer.tsx
git commit -m "💄 feat(mes-new): DualListTransfer 穿梭弹窗(双卡/搜索/计数/方向按钮)"
```

---

### Task 9: 设备组页(可并行)

**Files:**
- Create: `apps/mes-new/src/pages/basedata/device-group/DeviceGroupForm.tsx`
- Create: `apps/mes-new/src/pages/basedata/device-group/DeviceGroupMembers.tsx`
- Create: `apps/mes-new/src/pages/basedata/device-group/DeviceGroupList.tsx`

> 依赖 Task 1–8 已完成。**不要改 router.tsx,不要 build,不要 commit**(集成方统一处理)。

- [ ] **Step 1: 写 DeviceGroupForm.tsx**

```tsx
// apps/mes-new/src/pages/basedata/device-group/DeviceGroupForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Textarea, toast } from '@workspace/ui'
import { Boxes } from 'lucide-react'
import FormDialog from '@/components/FormDialog'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { deviceGroupAddOrUpdate } from '@/api/basedata/device-group'
import type { SpDeviceGroup } from '@/types/device'

const schema = z.object({
  code: z.string().min(1, '请输入编组代码'),
  name: z.string().min(1, '请输入编组名称'),
  descr: z.string().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpDeviceGroup | null
}

export default function DeviceGroupForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<SpDeviceGroup>) => deviceGroupAddOrUpdate(dto))
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', descr: '' },
  })

  useEffect(() => {
    if (open) reset({ code: record?.code ?? '', name: record?.name ?? '', descr: record?.descr ?? '' })
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({ ...(record ?? {}), ...values })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","device-group"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑设备组' : '新增设备组'}
      description="维护设备编组主数据"
      icon={Boxes}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <div className="space-y-1.5">
        <Label htmlFor="dg-code">编组代码</Label>
        <Input id="dg-code" {...register('code')} />
        {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dg-name">编组名称</Label>
        <Input id="dg-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dg-descr">描述</Label>
        <Textarea id="dg-descr" {...register('descr')} />
      </div>
    </FormDialog>
  )
}
```

- [ ] **Step 2: 写 DeviceGroupMembers.tsx**

```tsx
// apps/mes-new/src/pages/basedata/device-group/DeviceGroupMembers.tsx
import { useState } from 'react'
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@workspace/ui'
import { Cpu, Settings2, Trash2 } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import DualListTransfer from '@/components/DualListTransfer'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import {
  deviceGroupItems,
  deviceGroupItemsAdd,
  deviceGroupItemsRemove,
  devicePage,
} from '@/api/basedata/device-group'
import { excludeSelected, type TransferItem } from '@/utils/transfer'
import type { SpDevice, SpDeviceGroup } from '@/types/device'

interface Props {
  group: SpDeviceGroup
}

/** 候选设备拉取上限(穿梭弹窗内可再搜索过滤) */
const CANDIDATE_SIZE = 200

export default function DeviceGroupMembers({ group }: Props) {
  const [transferOpen, setTransferOpen] = useState(false)
  const membersKey = ['basedata', 'device-group', 'items', group.id]
  const { data: members } = useQuery$(membersKey, () => deviceGroupItems(group.id))
  const { data: allDevices } = useQuery$(
    ['basedata', 'device', 'page', { current: 1, size: CANDIDATE_SIZE }],
    () => devicePage({ current: 1, size: CANDIDATE_SIZE }),
    { enabled: transferOpen },
  )
  const { mutate: addItems } = useMutation$((deviceIds: string[]) => deviceGroupItemsAdd(group.id, deviceIds))
  const { mutate: removeItem } = useMutation$((deviceId: string) => deviceGroupItemsRemove(group.id, deviceId))

  const memberList = members ?? []
  const refresh = () => invalidate(JSON.stringify(membersKey))

  const toItem = (d: SpDevice): TransferItem => ({ id: d.id, primary: d.name, secondary: d.code })
  const selectedItems = memberList.map(toItem)
  const candidates = excludeSelected(allDevices?.records ?? [], memberList.map((d) => d.id)).map(toItem)

  const handleAdd = async (ids: string[]) => {
    try {
      await addItems(ids)
      toast.success('已加入')
      refresh()
    } catch {
      /* toast */
    }
  }
  const handleRemove = async (id: string) => {
    try {
      await removeItem(id)
      toast.success('已移除')
      refresh()
    } catch {
      /* toast */
    }
  }

  return (
    <>
      <RelatedPanel
        icon={Cpu}
        title="成员设备"
        count={memberList.length}
        actions={
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
            <Settings2 className="size-4" />
            管理成员
          </Button>
        }
      >
        {memberList.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">暂无成员设备</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>设备编码</TableHead>
                <TableHead>设备名称</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberList.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.code}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(d.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </RelatedPanel>

      <DualListTransfer
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title={`管理「${group.name}」的成员设备`}
        description="勾选候选设备加入,或移除已加入设备"
        candidates={candidates}
        selected={selectedItems}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    </>
  )
}
```

- [ ] **Step 3: 写 DeviceGroupList.tsx**

```tsx
// apps/mes-new/src/pages/basedata/device-group/DeviceGroupList.tsx
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
  cn,
  toast,
} from '@workspace/ui'
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import RelatedPanel from '@/components/RelatedPanel'
import DeviceGroupForm from './DeviceGroupForm'
import DeviceGroupMembers from './DeviceGroupMembers'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { deviceGroupPage, deviceGroupDelete, type DeviceGroupPageParams } from '@/api/basedata/device-group'
import type { SpDeviceGroupDTO } from '@/types/device'

const PAGE_SIZE = 10

export default function DeviceGroupList() {
  const [params, setParams] = useState<DeviceGroupPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpDeviceGroupDTO | null>(null)
  const [deleting, setDeleting] = useState<SpDeviceGroupDTO | null>(null)
  const [selected, setSelected] = useState<SpDeviceGroupDTO | null>(null)

  const { data, loading } = useQuery$(['basedata', 'device-group', 'page', params], () => deviceGroupPage(params))
  const { mutate: removeGroup } = useMutation$((id: string) => deviceGroupDelete(id))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeGroup(deleting.id)
      toast.success('删除成功')
      if (selected?.id === deleting.id) setSelected(null)
      invalidate('["basedata","device-group"')
    } catch {
      /* toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpDeviceGroupDTO>[]>(
    () => [
      { accessorKey: 'code', header: '编组代码' },
      { accessorKey: 'name', header: '编组名称' },
      { accessorKey: 'descr', header: '描述', cell: ({ row }) => row.original.descr || '—' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
      title="设备组管理"
      description="维护设备编组及其成员设备"
      actions={
        <PermissionGuard perm="device:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建设备组
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-dg-code">编组代码</Label>
          <Input id="s-dg-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-dg-name">编组名称</Label>
          <Input id="s-dg-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
      </SearchForm>

      <MasterDetailLayout
        master={
          <div className="rounded-lg border border-border bg-card p-2">
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
          </div>
        }
        detail={
          selected ? (
            <DeviceGroupMembers group={selected} />
          ) : (
            <RelatedPanel icon={Boxes} title="成员设备" empty emptyIcon={Boxes} emptyText="请选择左侧设备组查看成员" />
          )
        }
      />

      <DeviceGroupForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除设备组「{deleting?.name}」吗?</AlertDialogDescription>
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

- [ ] **Step 4: 局部 tsc 校验(集成前自检)**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无报错(若并行 agent 间路由未注册不影响 tsc)

---

### Task 10: 工艺单元页(可并行)

**Files:**
- Create: `apps/mes-new/src/pages/basedata/process-unit/ProcessUnitForm.tsx`
- Create: `apps/mes-new/src/pages/basedata/process-unit/ProcessUnitTeams.tsx`
- Create: `apps/mes-new/src/pages/basedata/process-unit/ProcessUnitList.tsx`

> **不要改 router.tsx,不要 build,不要 commit。**

- [ ] **Step 1: 写 ProcessUnitForm.tsx**

```tsx
// apps/mes-new/src/pages/basedata/process-unit/ProcessUnitForm.tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Switch, Textarea, toast } from '@workspace/ui'
import { Factory } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { processUnitAddOrUpdate } from '@/api/basedata/process-unit'
import type { SpProcessUnit } from '@/types/process-unit'

const schema = z.object({
  code: z.string().min(1, '请输入单元代码'),
  name: z.string().min(1, '请输入单元名称'),
  type: z.string().optional(),
  hasLineWarehouse: z.boolean(),
  descr: z.string().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpProcessUnit | null
}

export default function ProcessUnitForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<SpProcessUnit>) => processUnitAddOrUpdate(dto))
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', type: '', hasLineWarehouse: false, descr: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: record?.code ?? '',
        name: record?.name ?? '',
        type: record?.type ?? '',
        hasLineWarehouse: record?.hasLineWarehouse === '1',
        descr: record?.descr ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        ...(record ?? {}),
        code: values.code,
        name: values.name,
        type: values.type ?? '',
        hasLineWarehouse: values.hasLineWarehouse ? '1' : '0',
        descr: values.descr ?? '',
      })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","process-unit"')
      onOpenChange(false)
    } catch {
      /* toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑工艺单元' : '新增工艺单元'}
      description="维护加工单元主数据"
      icon={Factory}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pu-code">单元代码</Label>
            <Input id="pu-code" {...register('code')} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pu-name">单元名称</Label>
            <Input id="pu-name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pu-type">单元类型</Label>
          <Input id="pu-type" placeholder="如:人员作业单元 / 设备作业单元" {...register('type')} />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label htmlFor="pu-lw">是否有线边库</Label>
          <Controller
            control={control}
            name="hasLineWarehouse"
            render={({ field }) => <Switch id="pu-lw" checked={field.value} onCheckedChange={field.onChange} />}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pu-descr">描述</Label>
          <Textarea id="pu-descr" {...register('descr')} />
        </div>
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2: 写 ProcessUnitTeams.tsx**

```tsx
// apps/mes-new/src/pages/basedata/process-unit/ProcessUnitTeams.tsx
import { useState } from 'react'
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@workspace/ui'
import { Link2, Trash2, Users } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import DualListTransfer from '@/components/DualListTransfer'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { processUnitTeams, processUnitTeamAdd, processUnitTeamRemove } from '@/api/basedata/process-unit'
import { teamPage } from '@/api/system/team'
import { excludeSelected, type TransferItem } from '@/utils/transfer'
import type { SpProcessUnit, SpTeam } from '@/types/process-unit'

interface Props {
  unit: SpProcessUnit
}

const CANDIDATE_SIZE = 200

export default function ProcessUnitTeams({ unit }: Props) {
  const [transferOpen, setTransferOpen] = useState(false)
  const teamsKey = ['basedata', 'process-unit', 'teams', unit.id]
  const { data: bound } = useQuery$(teamsKey, () => processUnitTeams(unit.id))
  const { data: allTeams } = useQuery$(
    ['admin', 'team', 'page', { current: 1, size: CANDIDATE_SIZE }],
    () => teamPage({ current: 1, size: CANDIDATE_SIZE }),
    { enabled: transferOpen },
  )
  const { mutate: addTeam } = useMutation$((teamId: string) => processUnitTeamAdd(unit.id, teamId))
  const { mutate: removeTeam } = useMutation$((teamId: string) => processUnitTeamRemove(unit.id, teamId))

  const boundList = bound ?? []
  const refresh = () => invalidate(JSON.stringify(teamsKey))

  const toItem = (t: SpTeam): TransferItem => ({ id: t.id, primary: t.name, secondary: t.code })
  const selectedItems = boundList.map(toItem)
  const candidates = excludeSelected(allTeams?.records ?? [], boundList.map((t) => t.id)).map(toItem)

  const handleAdd = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => addTeam(id)))
      toast.success('已绑定')
      refresh()
    } catch {
      /* toast */
    }
  }
  const handleRemove = async (id: string) => {
    try {
      await removeTeam(id)
      toast.success('已解绑')
      refresh()
    } catch {
      /* toast */
    }
  }

  return (
    <>
      <RelatedPanel
        icon={Users}
        title="绑定班组"
        count={boundList.length}
        actions={
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
            <Link2 className="size-4" />
            绑定班组
          </Button>
        }
      >
        {boundList.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">暂无绑定班组</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>班组编码</TableHead>
                <TableHead>班组名称</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boundList.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.code}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(t.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </RelatedPanel>

      <DualListTransfer
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title={`绑定「${unit.name}」的班组`}
        description="勾选候选班组绑定,或解绑已绑定班组"
        candidates={candidates}
        selected={selectedItems}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    </>
  )
}
```

- [ ] **Step 3: 写 ProcessUnitList.tsx**

```tsx
// apps/mes-new/src/pages/basedata/process-unit/ProcessUnitList.tsx
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
  cn,
  toast,
} from '@workspace/ui'
import { Factory, Pencil, Plus, Trash2, Users } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import RelatedPanel from '@/components/RelatedPanel'
import ProcessUnitForm from './ProcessUnitForm'
import ProcessUnitTeams from './ProcessUnitTeams'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { processUnitPage, processUnitDelete, type ProcessUnitPageParams } from '@/api/basedata/process-unit'
import type { SpProcessUnitDTO } from '@/types/process-unit'

const PAGE_SIZE = 10

export default function ProcessUnitList() {
  const [params, setParams] = useState<ProcessUnitPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpProcessUnitDTO | null>(null)
  const [deleting, setDeleting] = useState<SpProcessUnitDTO | null>(null)
  const [selected, setSelected] = useState<SpProcessUnitDTO | null>(null)

  const { data, loading } = useQuery$(['basedata', 'process-unit', 'page', params], () => processUnitPage(params))
  const { mutate: removeUnit } = useMutation$((id: string) => processUnitDelete(id))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeUnit(deleting.id)
      toast.success('删除成功')
      if (selected?.id === deleting.id) setSelected(null)
      invalidate('["basedata","process-unit"')
    } catch {
      /* toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpProcessUnitDTO>[]>(
    () => [
      { accessorKey: 'code', header: '单元代码' },
      { accessorKey: 'name', header: '单元名称' },
      { accessorKey: 'type', header: '类型', cell: ({ row }) => row.original.type || '—' },
      {
        accessorKey: 'hasLineWarehouse',
        header: '线边库',
        cell: ({ row }) =>
          row.original.hasLineWarehouse === '1' ? <Badge variant="secondary">有</Badge> : <span className="text-muted-foreground">无</span>,
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
      title="工艺单元管理"
      description="维护加工单元及其班组绑定"
      actions={
        <PermissionGuard perm="processUnit:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建工艺单元
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-pu-code">单元代码</Label>
          <Input id="s-pu-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-pu-name">单元名称</Label>
          <Input id="s-pu-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
      </SearchForm>

      <MasterDetailLayout
        master={
          <div className="rounded-lg border border-border bg-card p-2">
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
          </div>
        }
        detail={
          selected ? (
            <ProcessUnitTeams unit={selected} />
          ) : (
            <RelatedPanel icon={Users} title="绑定班组" empty emptyIcon={Factory} emptyText="请选择左侧工艺单元查看班组" />
          )
        }
      />

      <ProcessUnitForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除工艺单元「{deleting?.name}」吗?</AlertDialogDescription>
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

- [ ] **Step 4: 局部 tsc 校验**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无报错

---

### Task 11: 仓库页(可并行)

**Files:**
- Create: `apps/mes-new/src/pages/basedata/warehouse/WarehouseForm.tsx`
- Create: `apps/mes-new/src/pages/basedata/warehouse/WarehouseLocations.tsx`
- Create: `apps/mes-new/src/pages/basedata/warehouse/WarehouseList.tsx`

> **不要改 router.tsx,不要 build,不要 commit。**

- [ ] **Step 1: 写 WarehouseForm.tsx**

```tsx
// apps/mes-new/src/pages/basedata/warehouse/WarehouseForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Textarea, toast } from '@workspace/ui'
import { Warehouse as WarehouseIcon } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { warehouseAddOrUpdate } from '@/api/basedata/warehouse'
import type { SpWarehouse } from '@/types/warehouse'

const schema = z.object({
  code: z.string().min(1, '请输入库房编码'),
  name: z.string().min(1, '请输入库房名称'),
  type: z.string().optional(),
  groups: z.coerce.number().int().min(1, '至少 1 组'),
  rows: z.coerce.number().int().min(1, '至少 1 排'),
  layers: z.coerce.number().int().min(1, '至少 1 层'),
  columns: z.coerce.number().int().min(1, '至少 1 列'),
  descr: z.string().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpWarehouse | null
}

export default function WarehouseForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<SpWarehouse>) => warehouseAddOrUpdate(dto))
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', type: '', groups: 1, rows: 1, layers: 1, columns: 1, descr: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: record?.code ?? '',
        name: record?.name ?? '',
        type: record?.type ?? '',
        groups: record?.groups ?? 1,
        rows: record?.rows ?? 1,
        layers: record?.layers ?? 1,
        columns: record?.columns ?? 1,
        descr: record?.descr ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({ ...(record ?? {}), ...values })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","warehouse"')
      onOpenChange(false)
    } catch {
      /* toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑仓库' : '新增仓库'}
      description="维护库房主数据;库位将按规格自动生成"
      icon={WarehouseIcon}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wh-code">库房编码</Label>
            <Input id="wh-code" {...register('code')} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-name">库房名称</Label>
            <Input id="wh-name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wh-type">库房类型</Label>
          <Input id="wh-type" placeholder="如:零件库 / 产品库" {...register('type')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wh-descr">描述</Label>
          <Textarea id="wh-descr" {...register('descr')} />
        </div>
      </FormSection>

      <FormSection title="库位规格">
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wh-groups">组</Label>
            <Input id="wh-groups" type="number" min={1} {...register('groups')} />
            {errors.groups && <p className="text-xs text-destructive">{errors.groups.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-rows">排</Label>
            <Input id="wh-rows" type="number" min={1} {...register('rows')} />
            {errors.rows && <p className="text-xs text-destructive">{errors.rows.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-layers">层</Label>
            <Input id="wh-layers" type="number" min={1} {...register('layers')} />
            {errors.layers && <p className="text-xs text-destructive">{errors.layers.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-columns">列</Label>
            <Input id="wh-columns" type="number" min={1} {...register('columns')} />
            {errors.columns && <p className="text-xs text-destructive">{errors.columns.message}</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">保存后后端按「组 × 排 × 层 × 列」自动生成库位。</p>
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2: 写 WarehouseLocations.tsx**

```tsx
// apps/mes-new/src/pages/basedata/warehouse/WarehouseLocations.tsx
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui'
import { MapPin } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import { useQuery$ } from '@/http/hooks'
import { warehouseLocations } from '@/api/basedata/warehouse'
import type { SpWarehouse } from '@/types/warehouse'

interface Props {
  warehouse: SpWarehouse
}

export default function WarehouseLocations({ warehouse }: Props) {
  const { data: locations } = useQuery$(
    ['basedata', 'warehouse', 'locations', warehouse.id],
    () => warehouseLocations(warehouse.id),
  )
  const list = locations ?? []
  const total = warehouse.groups * warehouse.rows * warehouse.layers * warehouse.columns

  return (
    <RelatedPanel
      icon={MapPin}
      title="库位"
      count={list.length}
      actions={
        <Badge variant="outline">
          {warehouse.groups}组 × {warehouse.rows}排 × {warehouse.layers}层 × {warehouse.columns}列 = {total}
        </Badge>
      }
    >
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">暂无库位(保存仓库后自动生成)</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>库位编码</TableHead>
              <TableHead>组</TableHead>
              <TableHead>排</TableHead>
              <TableHead>层</TableHead>
              <TableHead>列</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell>{loc.code}</TableCell>
                <TableCell>{loc.groupNo}</TableCell>
                <TableCell>{loc.rowNo}</TableCell>
                <TableCell>{loc.layerNo}</TableCell>
                <TableCell>{loc.colNo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </RelatedPanel>
  )
}
```

- [ ] **Step 3: 写 WarehouseList.tsx**

```tsx
// apps/mes-new/src/pages/basedata/warehouse/WarehouseList.tsx
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
  cn,
  toast,
} from '@workspace/ui'
import { MapPin, Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import RelatedPanel from '@/components/RelatedPanel'
import WarehouseForm from './WarehouseForm'
import WarehouseLocations from './WarehouseLocations'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { warehousePage, warehouseDelete, type WarehousePageParams } from '@/api/basedata/warehouse'
import type { SpWarehouse } from '@/types/warehouse'

const PAGE_SIZE = 10

export default function WarehouseList() {
  const [params, setParams] = useState<WarehousePageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpWarehouse | null>(null)
  const [deleting, setDeleting] = useState<SpWarehouse | null>(null)
  const [selected, setSelected] = useState<SpWarehouse | null>(null)

  const { data, loading } = useQuery$(['basedata', 'warehouse', 'page', params], () => warehousePage(params))
  const { mutate: removeWarehouse } = useMutation$((id: string) => warehouseDelete(id))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeWarehouse(deleting.id)
      toast.success('删除成功')
      if (selected?.id === deleting.id) setSelected(null)
      invalidate('["basedata","warehouse"')
    } catch {
      /* toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpWarehouse>[]>(
    () => [
      { accessorKey: 'code', header: '库房编码' },
      { accessorKey: 'name', header: '库房名称' },
      { accessorKey: 'type', header: '类型', cell: ({ row }) => row.original.type || '—' },
      {
        id: 'spec',
        header: '规格',
        cell: ({ row }) => {
          const w = row.original
          return <span className="text-muted-foreground">{w.groups}×{w.rows}×{w.layers}×{w.columns}</span>
        },
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
      title="仓库管理"
      description="维护库房主数据与库位"
      actions={
        <PermissionGuard perm="warehouse:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建仓库
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-wh-code">库房编码</Label>
          <Input id="s-wh-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-wh-name">库房名称</Label>
          <Input id="s-wh-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
      </SearchForm>

      <MasterDetailLayout
        master={
          <div className="rounded-lg border border-border bg-card p-2">
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
          </div>
        }
        detail={
          selected ? (
            <WarehouseLocations warehouse={selected} />
          ) : (
            <RelatedPanel icon={MapPin} title="库位" empty emptyIcon={WarehouseIcon} emptyText="请选择左侧仓库查看库位" />
          )
        }
      />

      <WarehouseForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除仓库「{deleting?.name}」吗?</AlertDialogDescription>
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

- [ ] **Step 4: 局部 tsc 校验**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无报错

---

### Task 12: 集成 — 注册路由 + 全量验证(集成方专属)

**Files:**
- Modify: `apps/mes-new/src/router.tsx`

- [ ] **Step 1: 加导入**

在 router.tsx 现有 basedata 页面导入(`MaterileList`/`ComponentList`)附近,追加:

```tsx
import DeviceGroupList from '@/pages/basedata/device-group/DeviceGroupList'
import ProcessUnitList from '@/pages/basedata/process-unit/ProcessUnitList'
import WarehouseList from '@/pages/basedata/warehouse/WarehouseList'
```

- [ ] **Step 2: 加路由**

在 `basedata/component`、`basedata/materile` 路由项之后,追加三条同级路由:

```tsx
      { path: 'basedata/device-group', element: <DeviceGroupList /> },
      { path: 'basedata/process-unit', element: <ProcessUnitList /> },
      { path: 'basedata/warehouse', element: <WarehouseList /> },
```

> 注:具体写法以 router.tsx 现有路由项结构为准(children 数组项形态)。

- [ ] **Step 3: tsc**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无报错

- [ ] **Step 4: lint**

Run: `cd mes/frontend && pnpm lint`
Expected: 0 error(允许既有 advisory warning,不得新增 error)

- [ ] **Step 5: 测试**

Run: `pnpm --filter mes-new exec vitest run`
Expected: 全部通过(含新增 transfer 6 例)

- [ ] **Step 6: build**

Run: `pnpm --filter mes-new build`
Expected: `✓ built`

- [ ] **Step 7: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/basedata/device-group mes/frontend/apps/mes-new/src/pages/basedata/process-unit mes/frontend/apps/mes-new/src/pages/basedata/warehouse mes/frontend/apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 设备组/工艺单元/仓库三页(主从+穿梭+关联管理)并注册路由"
```

---

## 验证清单(集成后)

- [ ] `pnpm --filter mes-new exec tsc --noEmit` 绿
- [ ] `pnpm lint` 0 error
- [ ] `pnpm --filter mes-new exec vitest run` 全过
- [ ] `pnpm --filter mes-new build` 成功
- [ ] 两阶段 review:spec 合规 + 代码质量(完整读取所有改动文件)
- [ ] 人工浏览器验收(admin/123,backend :9090):
  - 三页主表 CRUD(新建/编辑/删除/搜索/分页)
  - 设备组:点行选中 → 右面板成员 → 管理成员穿梭(加/移)
  - 工艺单元:类型/线边库开关;选中 → 班组绑定/解绑
  - 仓库:规格四数字校验;选中 → 库位规格 Badge + 库位列表
  - 新 `FormDialog` 观感(渐变 header/图标芯片/分区/scroll);D/B 主题切换正常

## 已知简化(no silent caps)

- 穿梭候选设备/班组一次性拉取上限 `CANDIDATE_SIZE = 200`,弹窗内可再用关键字过滤;超过 200 的超大基础数据不在本周期处理(后续可加服务端搜索分页)。
- 关联面板内列表(成员/班组/库位)用原子 `Table` 一次性渲染,不分页(基础数据量级可控)。
```
