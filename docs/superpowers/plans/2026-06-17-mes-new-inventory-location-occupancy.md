# 库位选择占用感知 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 入库登账与手动入库的"库位"下拉，选库位前显示每个库位对当前物料的三态（空闲/可累加/已占他物料并禁选），消除盲选撞混放规则的痛点。

**Architecture:** 抽共享组件 `LocationSelect`，复用现有 `warehouseLocations` + `pageInventory`（客户端按 warehouseId 过滤建占用映射），用纯函数算三态。纯前端，后端混放规则仍为唯一权威。两处调用页接入。

**Tech Stack:** React 18 + TS + `@workspace/ui`(Radix Select) + 自研 `useQuery$` + vitest(node)。

参考 spec：`docs/superpowers/specs/2026-06-17-mes-new-inventory-location-occupancy-design.md`

---

## 关键既有约定

- `useQuery$(key, factory, { enabled })`；`pageInventory(params)` 来自 `@/api/inventory/stock`（端点 `/inventory/page`，入参仅 materialCode/startDate/endDate，**无库房过滤**）；`warehouseLocations(id)` 来自 `@/api/basedata/warehouse`。
- `SpInventory` 字段：`locationId`、`materialCode`、`warehouseId`。
- `Select/SelectItem`（`@workspace/ui`，Radix）支持 `disabled`、`className`；`cn` 来自 `@workspace/ui`。
- 命令（在 `mes/frontend/`）：类型检查 `pnpm --filter mes-new check-types`；单测 `pnpm --filter mes-new test`；lint `pnpm --filter mes-new lint`；构建 `pnpm --filter mes-new build`。
- git 用 `git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack ...`。当前分支 `feat/frontend-rebuild`，直接提交。

---

## Task 1：库位可用性纯函数（TDD）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/inventory/inventoryStatus.ts`（追加 2 函数）
- Test: `mes/frontend/apps/mes-new/src/pages/inventory/__tests__/inventoryStatus.test.ts`（追加用例）

- [ ] **Step 1：追加失败测试**

在 `inventoryStatus.test.ts` 顶部 import 增补 `locationAvailability, locationOptionLabel`，使其变为：

```typescript
import { describe, it, expect } from 'vitest'
import {
  receiptStatusMeta,
  outboundStatusMeta,
  postStatusMeta,
  progressText,
  progressPercent,
  locationAvailability,
  locationOptionLabel,
} from '../inventoryStatus'
```

在文件**末尾追加**：

```typescript
describe('locationAvailability', () => {
  it('无占用 → empty', () => { expect(locationAvailability(undefined, 'PART-001')).toBe('empty') })
  it('空串占用 → empty', () => { expect(locationAvailability('', 'PART-001')).toBe('empty') })
  it('同物料 → same', () => { expect(locationAvailability('PART-001', 'PART-001')).toBe('same') })
  it('他物料 → other', () => { expect(locationAvailability('PART-007', 'PART-001')).toBe('other') })
})

describe('locationOptionLabel', () => {
  it('空闲', () => { expect(locationOptionLabel('1-0101', undefined, 'PART-001')).toBe('1-0101 · 空闲') })
  it('可累加', () => { expect(locationOptionLabel('1-0101', 'PART-001', 'PART-001')).toBe('1-0101 · 已存本物料·可累加') })
  it('已占他物料', () => { expect(locationOptionLabel('1-0102', 'PART-007', 'PART-001')).toBe('1-0102 · 已占 PART-007') })
})
```

- [ ] **Step 2：运行测试，确认失败**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/inventory/__tests__/inventoryStatus.test.ts`
Expected: FAIL —— `locationAvailability`/`locationOptionLabel` 不是导出（或未定义）。

- [ ] **Step 3：实现纯函数**

在 `inventoryStatus.ts` **末尾追加**：

```typescript
export type LocationAvailability = 'empty' | 'same' | 'other'

/** 库位对目标物料的可用性:无占用→empty;同物料→same;他物料→other */
export function locationAvailability(occupiedBy: string | undefined, target: string): LocationAvailability {
  if (!occupiedBy) return 'empty'
  return occupiedBy === target ? 'same' : 'other'
}

/** 库位下拉选项文案 */
export function locationOptionLabel(code: string, occupiedBy: string | undefined, target: string): string {
  switch (locationAvailability(occupiedBy, target)) {
    case 'empty': return `${code} · 空闲`
    case 'same': return `${code} · 已存本物料·可累加`
    case 'other': return `${code} · 已占 ${occupiedBy}`
  }
}
```

- [ ] **Step 4：运行测试，确认通过**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/inventory/__tests__/inventoryStatus.test.ts`
Expected: PASS（含新增 7 例，原 17 例仍绿）。

- [ ] **Step 5：提交**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/pages/inventory/inventoryStatus.ts mes/frontend/apps/mes-new/src/pages/inventory/__tests__/inventoryStatus.test.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✅ feat(mes-new): 库位可用性/文案纯函数 + 单测"
```

---

## Task 2：共享组件 LocationSelect

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/inventory/LocationSelect.tsx`

- [ ] **Step 1：创建组件**

```tsx
import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@workspace/ui'
import { useQuery$ } from '@/http/hooks'
import { warehouseLocations } from '@/api/basedata/warehouse'
import { pageInventory } from '@/api/inventory/stock'
import { locationAvailability, locationOptionLabel } from './inventoryStatus'

interface LocationSelectProps {
  warehouseId: string
  materialCode: string
  value: string
  onChange: (locationId: string) => void
  disabled?: boolean
}

/** 拉取库存上限(端点无库房入参,前端按 warehouseId 过滤建占用映射) */
const OCCUPANCY_FETCH_SIZE = 1000

/** 排序权重:可选(空闲/可累加)在前,已占在后 */
const RANK: Record<string, number> = { empty: 0, same: 1, other: 2 }

/** 库位选择器:显示每个库位对当前物料的三态,已占他物料的禁选 */
export default function LocationSelect({ warehouseId, materialCode, value, onChange, disabled }: LocationSelectProps) {
  const { data: locations } = useQuery$(
    ['basedata', 'warehouse', 'locations', warehouseId],
    () => warehouseLocations(warehouseId),
    { enabled: !!warehouseId },
  )
  const { data: invPage } = useQuery$(
    ['inventory', 'stock', 'page', { current: 1, size: OCCUPANCY_FETCH_SIZE }],
    () => pageInventory({ current: 1, size: OCCUPANCY_FETCH_SIZE }),
    { enabled: !!warehouseId },
  )

  // locationId → 该库位当前所存物料编码(仅本库房)
  const occupancy = useMemo(() => {
    const map = new Map<string, string>()
    for (const inv of invPage?.records ?? []) {
      if (inv.warehouseId === warehouseId && inv.locationId) {
        map.set(inv.locationId, inv.materialCode)
      }
    }
    return map
  }, [invPage, warehouseId])

  const options = useMemo(() => {
    const list = (locations ?? []).map((l) => {
      const occupiedBy = occupancy.get(l.id)
      const avail = locationAvailability(occupiedBy, materialCode)
      return {
        id: l.id,
        code: l.code,
        label: locationOptionLabel(l.code, occupiedBy, materialCode),
        disabled: avail === 'other',
        rank: RANK[avail],
      }
    })
    return list.sort((a, b) => a.rank - b.rank || a.code.localeCompare(b.code))
  }, [locations, occupancy, materialCode])

  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={warehouseId ? '请选择库位' : '请先选择库房'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id} disabled={o.disabled} className={cn(o.disabled && 'text-muted-foreground')}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 2：类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 通过（依赖 Task 1 的两个纯函数已存在）。

- [ ] **Step 3：提交**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/pages/inventory/LocationSelect.tsx
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): 占用感知的共享库位选择器 LocationSelect"
```

---

## Task 3：接入入库登账与手动入库两页

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/inventory/receipt/ReceiptPostDialog.tsx`
- Modify: `mes/frontend/apps/mes-new/src/pages/inventory/manual/ManualInbound.tsx`

### ReceiptPostDialog

- [ ] **Step 1：改 import（移除 warehouseLocations，新增 LocationSelect）**

将
```tsx
import { warehousePage, warehouseLocations } from '@/api/basedata/warehouse'
import { postReceiptItem } from '@/api/inventory/receipt'
```
改为
```tsx
import { warehousePage } from '@/api/basedata/warehouse'
import { postReceiptItem } from '@/api/inventory/receipt'
import LocationSelect from '../LocationSelect'
```

- [ ] **Step 2：删除级联库位查询块**

删除
```tsx
  // 选定库房后级联库位
  const { data: locations } = useQuery$(
    ['basedata', 'warehouse', 'locations', warehouseId],
    () => warehouseLocations(warehouseId),
    { enabled: open && !!warehouseId },
  )

```
（即让 `warehouses` 那行与 `const { mutate, loading } = useMutation$(` 之间只留一个空行）

- [ ] **Step 3：库位 FormField 换成 LocationSelect**

将
```tsx
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
```
改为
```tsx
      <FormField label="库位" required help="一库位一物料;已占其他物料的库位不可选">
        <LocationSelect
          warehouseId={warehouseId}
          materialCode={item?.materialCode ?? ''}
          value={locationId}
          onChange={setLocationId}
          disabled={!warehouseId}
        />
      </FormField>
```
（库房那段 `Select` 保留不动，故 `Select/SelectContent/SelectItem/SelectTrigger/SelectValue` 的 import 仍被使用，不要删。）

### ManualInbound

- [ ] **Step 4：改 import**

将
```tsx
import { warehousePage, warehouseLocations } from '@/api/basedata/warehouse'
import { manualInbound } from '@/api/inventory/stock'
```
改为
```tsx
import { warehousePage } from '@/api/basedata/warehouse'
import { manualInbound } from '@/api/inventory/stock'
import LocationSelect from '../LocationSelect'
```

- [ ] **Step 5：删除级联库位查询块**

删除
```tsx
  const { data: locations } = useQuery$(
    ['basedata', 'warehouse', 'locations', warehouseId],
    () => warehouseLocations(warehouseId),
    { enabled: !!warehouseId },
  )

```
（让 `whPage` 查询块与 `const materials = matPage?.records ?? []` 之间只留一个空行）

- [ ] **Step 6：切换物料时重置库位**

将
```tsx
              <Select value={materialCode || undefined} onValueChange={setMaterialCode}>
```
改为
```tsx
              <Select value={materialCode || undefined} onValueChange={(v) => { setMaterialCode(v); setLocationId('') }}>
```

- [ ] **Step 7：库位 FormField 换成 LocationSelect**

将
```tsx
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
```
改为
```tsx
              <FormField label="库位" required help="已占其他物料的库位不可选">
                <LocationSelect
                  warehouseId={warehouseId}
                  materialCode={materialCode}
                  value={locationId}
                  onChange={setLocationId}
                  disabled={!warehouseId}
                />
              </FormField>
```
（物料、库房两段 `Select` 保留，`Select*` import 仍被使用，不要删。）

- [ ] **Step 8：类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 通过（无未使用 import 报错——`Select*` 仍被库房/物料用；`warehouseLocations` 已移除）。

- [ ] **Step 9：提交**

```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/pages/inventory/receipt/ReceiptPostDialog.tsx mes/frontend/apps/mes-new/src/pages/inventory/manual/ManualInbound.tsx
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): 入库登账/手动入库接入占用感知库位选择器"
```

---

## Task 4：整体验证

- [ ] **Step 1：全套门禁（贴真实输出）**

```bash
cd mes/frontend
pnpm --filter mes-new check-types
pnpm --filter mes-new test
pnpm --filter mes-new lint
pnpm --filter mes-new build
```
Expected: check-types 干净；test 全绿（库存纯函数文件含新增 7 例）；lint 0 errors；build SUCCESS。

- [ ] **Step 2：人工浏览验证（需后端+登录，留人工）**

入库登账：选库房后，库位下拉应：空闲/可累加在前、已占他物料项灰且不可点。对一个已被他物料占用的库位无法选中 → 不再盲选撞错。登账成功后下拉占用即时刷新。手动入库：换物料后库位重置、三态随之变化。

- [ ] **Step 3（如有改动）：提交剩余修复**

若验证或审查发现问题，修复后提交。

---

## Self-Review

- **Spec 覆盖**：LocationSelect 组件→Task2；两纯函数+测试→Task1；两页接入（含切物料重置）→Task3；缓存复用 stock 前缀（无需额外代码，组件查询键已落 `["inventory","stock"`）✓；规模权衡（size 1000 前端过滤）已在组件常量 + spec 标注 ✓；验证→Task4。无遗漏。
- **占位符**：无 TBD/TODO，每步给出完整代码或精确 Edit 前后文。
- **类型一致性**：`locationAvailability(occupiedBy, target)`、`locationOptionLabel(code, occupiedBy, target)` 在 Task1 定义、Task2 调用签名一致；`LocationSelectProps{warehouseId,materialCode,value,onChange,disabled}` 在 Task2 定义、Task3 两处调用 props 一致；`pageInventory`/`warehouseLocations`/`SpInventory.{locationId,materialCode,warehouseId}` 均与既有导出/类型吻合。
- **import 卫生**：Task3 移除 `warehouseLocations`，但两页的库房/物料 `Select` 仍用 `Select*`，不会产生未使用 import；ReceiptPostDialog 删除 locations 查询后 `useQuery$` 仍被 whPage 使用、ManualInbound 仍被 matPage/whPage 使用。
