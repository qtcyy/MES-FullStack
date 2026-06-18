# 动态表 Manager 配置(Layer 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/mes-new` 新建动态表 Manager 配置页 `/basedata/manager`(表头 + 字段明细二级,列表 + 编辑大弹窗,整体 upsert),并最小修复后端 `add-or-update` 的 4 个真实 bug + 增加服务端搜索。

**Architecture:** 前端纯 `useState` 受控大弹窗(规避 RHF DOM 冲突),纯函数 `validateManagerForm/buildUpsertPayload/moveRow` 做校验/装配/排序并 TDD;对接现有 4 个端点零新增端点。后端把保存逻辑下沉到 `SpTableManagerServiceImpl.saveOrUpdateWithItems` 加 `@Transactional`,controller 仅做空校验 + 委托;`SpTableManagerReq` 加搜索字段 + `pageList` LIKE Wrapper。

**Tech Stack:** React 19 + TS + Vite + @workspace/ui(shadcn/Radix)+ @ngify/http + 自研 useQuery$/useMutation$ + vitest(node);后端 Spring Boot 2.1.7 + MyBatis-Plus + JUnit4/Mockito。

**分支:** 在当前 `feat/frontend-rebuild` 上实施(沿用既往周期)。

**验证命令速查:**
- 前端 check-types:`cd mes/frontend && pnpm --filter mes-new check-types`
- 前端 lint:`cd mes/frontend && pnpm --filter mes-new lint`
- 前端 test:`cd mes/frontend && pnpm --filter mes-new test`
- 前端 build:`cd mes/frontend && pnpm --filter mes-new build`
- 后端单测:`cd mes && mvn -q -Dtest=SpTableManagerServiceImplTest test`(用系统 mvn + JDK11,`./mvnw` 已坏,见 [[backend-build-mvnw-broken]];必要时 `export JAVA_HOME=<jdk11>`)

---

## 文件结构

**前端(新增):**
- `mes/frontend/apps/mes-new/src/types/manager.ts` — 类型(SpTableManager / SpTableManagerItem / 提交体)
- `mes/frontend/apps/mes-new/src/pages/basedata/manager/managerForm.ts` — 纯函数 + 编辑态类型
- `mes/frontend/apps/mes-new/src/pages/basedata/manager/__tests__/managerForm.test.ts` — 纯函数 TDD
- `mes/frontend/apps/mes-new/src/api/basedata/manager.ts` — API 模块
- `mes/frontend/apps/mes-new/src/pages/basedata/manager/ManagerForm.tsx` — 编辑大弹窗(受控)
- `mes/frontend/apps/mes-new/src/pages/basedata/manager/ManagerList.tsx` — 列表页

**前端(修改):**
- `mes/frontend/apps/mes-new/src/router.tsx` — 注册路由(urlMap 已映射,无需改)

**后端(修改):**
- `mes/src/main/java/com/wangziyang/mes/basedata/request/SpTableManagerReq.java` — 加搜索字段
- `mes/src/main/java/com/wangziyang/mes/basedata/service/ISpTableManagerService.java` — 加 2 方法签名
- `mes/src/main/java/com/wangziyang/mes/basedata/service/impl/SpTableManagerServiceImpl.java` — 实现 pageList + saveOrUpdateWithItems
- `mes/src/main/java/com/wangziyang/mes/basedata/controller/SpTableManagerController.java` — page→pageList、add-or-update 委托

**后端(新增):**
- `mes/src/test/java/com/wangziyang/mes/basedata/service/SpTableManagerServiceImplTest.java` — Mockito 守卫单测

---

## Task 1: 前端类型 + 纯函数逻辑(TDD)

**Files:**
- Create: `mes/frontend/apps/mes-new/src/types/manager.ts`
- Create: `mes/frontend/apps/mes-new/src/pages/basedata/manager/managerForm.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/basedata/manager/__tests__/managerForm.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `mes/frontend/apps/mes-new/src/pages/basedata/manager/__tests__/managerForm.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  validateManagerForm,
  buildUpsertPayload,
  moveRow,
  type FieldRow,
  type ManagerHeader,
} from '../managerForm'

const header = (over: Partial<ManagerHeader> = {}): ManagerHeader => ({
  tableName: 'product',
  tableDesc: '产品表',
  permission: '',
  ...over,
})

const row = (field: string, fieldDesc: string, mustFill = false): FieldRow => ({
  key: `${field}-${fieldDesc}`,
  field,
  fieldDesc,
  mustFill,
})

describe('validateManagerForm', () => {
  it('合法:表名 + 至少一字段 + 无重复 → ok', () => {
    const r = validateManagerForm(header(), [row('product_code', '产品代码', true)])
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
  })
  it('表名空白 → 报错', () => {
    const r = validateManagerForm(header({ tableName: '   ' }), [row('a', 'A')])
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('表名不能为空')
  })
  it('无字段行 → 报错', () => {
    const r = validateManagerForm(header(), [])
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('至少需要一个字段')
  })
  it('字段名/显示名空 → 按行报错', () => {
    const r = validateManagerForm(header(), [row('', ''), row('b', '')])
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('第 1 行:字段名不能为空')
    expect(r.errors).toContain('第 1 行:显示名不能为空')
    expect(r.errors).toContain('第 2 行:显示名不能为空')
  })
  it('字段名重复(忽略大小写)→ 报错', () => {
    const r = validateManagerForm(header(), [row('Code', 'A'), row('code', 'B')])
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('重复'))).toBe(true)
  })
})

describe('moveRow', () => {
  const rows = [row('a', 'A'), row('b', 'B'), row('c', 'C')]
  it('上移', () => { expect(moveRow(rows, 1, -1).map((r) => r.field)).toEqual(['b', 'a', 'c']) })
  it('下移', () => { expect(moveRow(rows, 1, 1).map((r) => r.field)).toEqual(['a', 'c', 'b']) })
  it('首行上移越界 → 原引用', () => { expect(moveRow(rows, 0, -1)).toBe(rows) })
  it('末行下移越界 → 原引用', () => { expect(moveRow(rows, 2, 1)).toBe(rows) })
  it('不可变:返回新数组且不改原', () => {
    const out = moveRow(rows, 0, 1)
    expect(out).not.toBe(rows)
    expect(rows.map((r) => r.field)).toEqual(['a', 'b', 'c'])
  })
})

describe('buildUpsertPayload', () => {
  it('新增:无 id, mustFill 转码, sortNum 从 1 递增, isDeleted=0', () => {
    const p = buildUpsertPayload(header(), [
      row('product_code', '产品代码', true),
      row('product_name', '产品名称', false),
    ])
    expect(p.id).toBeUndefined()
    expect(p.isDeleted).toBe('0')
    expect(p.spTableManagerItems).toEqual([
      { field: 'product_code', fieldDesc: '产品代码', mustFill: '1', sortNum: 1 },
      { field: 'product_name', fieldDesc: '产品名称', mustFill: '0', sortNum: 2 },
    ])
  })
  it('编辑:带 id', () => {
    const p = buildUpsertPayload(header(), [row('a', 'A')], 'mgr-1')
    expect(p.id).toBe('mgr-1')
  })
  it('trim 表头与字段', () => {
    const p = buildUpsertPayload(
      header({ tableName: ' product ', tableDesc: ' 产品 ', permission: ' x ' }),
      [row(' f ', ' d ')],
    )
    expect(p.tableName).toBe('product')
    expect(p.tableDesc).toBe('产品')
    expect(p.permission).toBe('x')
    expect(p.spTableManagerItems[0]).toMatchObject({ field: 'f', fieldDesc: 'd' })
  })
  it('sortNum 反映 moveRow 后的顺序', () => {
    const reordered = moveRow([row('a', 'A'), row('b', 'B')], 0, 1)
    const p = buildUpsertPayload(header(), reordered)
    expect(p.spTableManagerItems.map((it) => [it.field, it.sortNum])).toEqual([['b', 1], ['a', 2]])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd mes/frontend && pnpm --filter mes-new test`
Expected: FAIL —— `Failed to resolve import "../managerForm"`(模块不存在)。

- [ ] **Step 3: 写类型文件**

创建 `mes/frontend/apps/mes-new/src/types/manager.ts`:

```ts
/** 动态表表头(sp_table_manager) */
export interface SpTableManager {
  id: string
  tableName: string
  tableDesc?: string
  permission?: string
  isDeleted?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 字段明细(sp_table_manager_item) */
export interface SpTableManagerItem {
  id?: string
  tableNameId?: string
  field: string
  fieldDesc: string
  mustFill: string // "1" | "0"
  sortNum: number
}

/** 字段明细提交体(剥离 id) */
export interface ManagerItemPayload {
  field: string
  fieldDesc: string
  mustFill: string
  sortNum: number
}

/** add-or-update 整体提交体(JSON) */
export interface ManagerUpsertPayload {
  id?: string
  tableName: string
  tableDesc: string
  permission: string
  isDeleted: string
  spTableManagerItems: ManagerItemPayload[]
}
```

- [ ] **Step 4: 写纯函数文件**

创建 `mes/frontend/apps/mes-new/src/pages/basedata/manager/managerForm.ts`:

```ts
import type { ManagerUpsertPayload } from '@/types/manager'

/** 弹窗内字段行编辑态(key 仅前端用于 React list key 与行操作,提交时丢弃) */
export interface FieldRow {
  key: string
  field: string
  fieldDesc: string
  mustFill: boolean
}

/** 表头编辑态 */
export interface ManagerHeader {
  tableName: string
  tableDesc: string
  permission: string
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/** 提交前校验:表名必填、至少 1 字段、每行字段名/显示名非空、字段名不重复(忽略大小写) */
export function validateManagerForm(header: ManagerHeader, rows: FieldRow[]): ValidationResult {
  const errors: string[] = []
  if (!header.tableName.trim()) errors.push('表名不能为空')
  if (rows.length === 0) errors.push('至少需要一个字段')
  rows.forEach((r, i) => {
    if (!r.field.trim()) errors.push(`第 ${i + 1} 行:字段名不能为空`)
    if (!r.fieldDesc.trim()) errors.push(`第 ${i + 1} 行:显示名不能为空`)
  })
  const seen = new Set<string>()
  rows.forEach((r, i) => {
    const k = r.field.trim().toLowerCase()
    if (!k) return
    if (seen.has(k)) errors.push(`第 ${i + 1} 行:字段名「${r.field.trim()}」重复`)
    else seen.add(k)
  })
  return { ok: errors.length === 0, errors }
}

/** 相邻行交换(不可变);越界返回原引用 */
export function moveRow(rows: FieldRow[], index: number, dir: -1 | 1): FieldRow[] {
  const target = index + dir
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return rows
  const next = rows.slice()
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** 装配整体 upsert 提交体:mustFill→"1"/"0"、sortNum 按下标重排、剥离 item id、isDeleted="0" */
export function buildUpsertPayload(
  header: ManagerHeader,
  rows: FieldRow[],
  existingId?: string,
): ManagerUpsertPayload {
  const payload: ManagerUpsertPayload = {
    tableName: header.tableName.trim(),
    tableDesc: header.tableDesc.trim(),
    permission: header.permission.trim(),
    isDeleted: '0',
    spTableManagerItems: rows.map((r, i) => ({
      field: r.field.trim(),
      fieldDesc: r.fieldDesc.trim(),
      mustFill: r.mustFill ? '1' : '0',
      sortNum: i + 1,
    })),
  }
  if (existingId) payload.id = existingId
  return payload
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd mes/frontend && pnpm --filter mes-new test`
Expected: PASS —— managerForm.test.ts 全部用例绿(validate 5 + moveRow 5 + buildUpsertPayload 4),其余既有测试不受影响。

- [ ] **Step 6: check-types**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无输出,退出码 0。

- [ ] **Step 7: 提交**(可用 `/commit`)

```bash
git add mes/frontend/apps/mes-new/src/types/manager.ts \
        mes/frontend/apps/mes-new/src/pages/basedata/manager/managerForm.ts \
        mes/frontend/apps/mes-new/src/pages/basedata/manager/__tests__/managerForm.test.ts
git commit -m "✨ feat(mes-new): 2j 动态表 Manager 类型 + 纯函数(校验/装配/排序 TDD)"
```

---

## Task 2: 前端 API 模块

**Files:**
- Create: `mes/frontend/apps/mes-new/src/api/basedata/manager.ts`

- [ ] **Step 1: 写 API 模块**

创建 `mes/frontend/apps/mes-new/src/api/basedata/manager.ts`:

```ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpTableManager, SpTableManagerItem, ManagerUpsertPayload } from '@/types/manager'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface ManagerPageParams extends PageParams {
  tableName?: string
  tableDesc?: string
}

/** 表头分页(form 编码;后端 SpTableManagerReq 绑定 current/size/tableName/tableDesc) */
export function managerPage(params: ManagerPageParams) {
  return http.post<PageResult<SpTableManager>>('/basedata/manager/page', params)
}

/** 取某表头的字段明细(form 编码;后端 @RequestParam tableNameId) */
export function managerItems(tableNameId: string) {
  return http.post<SpTableManagerItem[]>('/basedata/manager/item/by/tableNameId', { tableNameId })
}

/** 整体新增/更新(JSON;后端 @RequestBody SpTableManagerDto)→ 返回表头 id */
export function managerAddOrUpdate(payload: ManagerUpsertPayload) {
  return http.post<string>('/basedata/manager/add-or-update', payload, JSON_HEADERS)
}

/** 级联删除(form 编码;后端 SpTableManager req 绑定 id) */
export function managerDelete(id: string) {
  return http.post<void>('/basedata/manager/delete/by/tableNameId', { id })
}
```

> 注意:`managerItems` / `managerDelete` 用默认 form 编码(对接 `@RequestParam` / 表单绑定);仅 `managerAddOrUpdate` 带 `JSON_HEADERS`(对接 `@RequestBody`)。

- [ ] **Step 2: check-types**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无输出,退出码 0。

- [ ] **Step 3: 提交**

```bash
git add mes/frontend/apps/mes-new/src/api/basedata/manager.ts
git commit -m "✨ feat(mes-new): 2j 动态表 Manager API 模块(对接现有 4 端点)"
```

---

## Task 3: 编辑大弹窗 ManagerForm(受控)

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/basedata/manager/ManagerForm.tsx`

- [ ] **Step 1: 写组件**

创建 `mes/frontend/apps/mes-new/src/pages/basedata/manager/ManagerForm.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { firstValueFrom } from 'rxjs'
import { Button, Input, Switch, toast } from '@workspace/ui'
import { AlertCircle, ArrowDown, ArrowUp, Database, Plus, Trash2 } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { managerAddOrUpdate, managerItems } from '@/api/basedata/manager'
import {
  buildUpsertPayload,
  moveRow,
  validateManagerForm,
  type FieldRow,
  type ManagerHeader,
} from './managerForm'
import type { ManagerUpsertPayload, SpTableManager } from '@/types/manager'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpTableManager | null
}

export default function ManagerForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const [header, setHeader] = useState<ManagerHeader>({ tableName: '', tableDesc: '', permission: '' })
  const [rows, setRows] = useState<FieldRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const keySeq = useRef(0)
  const newKey = () => {
    keySeq.current += 1
    return `row-${keySeq.current}`
  }

  const { mutate, loading } = useMutation$((payload: ManagerUpsertPayload) => managerAddOrUpdate(payload))

  // 打开时初始化:新建给一个空行;编辑拉明细回填
  useEffect(() => {
    if (!open) return
    setErrors([])
    setHeader({
      tableName: record?.tableName ?? '',
      tableDesc: record?.tableDesc ?? '',
      permission: record?.permission ?? '',
    })
    if (record?.id) {
      setLoadingItems(true)
      firstValueFrom(managerItems(record.id))
        .then((items) => {
          setRows(
            (items ?? []).map((it) => ({
              key: newKey(),
              field: it.field ?? '',
              fieldDesc: it.fieldDesc ?? '',
              mustFill: it.mustFill === '1',
            })),
          )
        })
        .catch(() => {
          /* 拦截器已 toast */
        })
        .finally(() => setLoadingItems(false))
    } else {
      setRows([{ key: newKey(), field: '', fieldDesc: '', mustFill: false }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- newKey/setter 稳定,仅需在 open/record 变化时重置
  }, [open, record])

  const addRow = () => setRows((rs) => [...rs, { key: newKey(), field: '', fieldDesc: '', mustFill: false }])
  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key))
  const updateRow = (key: string, patch: Partial<FieldRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const move = (index: number, dir: -1 | 1) => setRows((rs) => moveRow(rs, index, dir))

  const onSubmit = async () => {
    const result = validateManagerForm(header, rows)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors([])
    try {
      await mutate(buildUpsertPayload(header, rows, record?.id))
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","manager","page"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑动态表' : '新建动态表'}
      description="维护动态表表头与字段明细"
      icon={Database}
      onSubmit={onSubmit}
      submitting={loading}
      contentClassName="sm:max-w-3xl"
    >
      <FormSection title="表头信息" icon={Database}>
        <FormField label="表名" htmlFor="m-table-name" required>
          <Input
            id="m-table-name"
            placeholder="如:product"
            value={header.tableName}
            onChange={(e) => setHeader((h) => ({ ...h, tableName: e.target.value }))}
          />
        </FormField>
        <FormField label="表描述" htmlFor="m-table-desc">
          <Input
            id="m-table-desc"
            placeholder="如:产品表"
            value={header.tableDesc}
            onChange={(e) => setHeader((h) => ({ ...h, tableDesc: e.target.value }))}
          />
        </FormField>
        <FormField label="权限标识" htmlFor="m-permission" help="多个用逗号分隔,如 product:list,product:edit">
          <Input
            id="m-permission"
            placeholder="选填"
            value={header.permission}
            onChange={(e) => setHeader((h) => ({ ...h, permission: e.target.value }))}
          />
        </FormField>
      </FormSection>

      <FormSection title="字段明细" icon={Plus} tag={`${rows.length} 个字段`}>
        {errors.length > 0 && (
          <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="size-3.5" />
              请修正以下问题
            </div>
            <ul className="list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {loadingItems ? (
          <div className="py-6 text-center text-sm text-muted-foreground">加载字段明细…</div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_4rem_5rem] items-center gap-2 px-1 text-[11px] font-medium text-muted-foreground">
              <span>序</span>
              <span>字段名 *</span>
              <span>显示名 *</span>
              <span className="text-center">必填</span>
              <span className="text-right">操作</span>
            </div>
            {rows.map((r, i) => (
              <div key={r.key} className="grid grid-cols-[2rem_1fr_1fr_4rem_5rem] items-center gap-2">
                <span className="text-xs text-muted-foreground">{i + 1}</span>
                <Input
                  className="h-8"
                  placeholder="product_code"
                  value={r.field}
                  onChange={(e) => updateRow(r.key, { field: e.target.value })}
                />
                <Input
                  className="h-8"
                  placeholder="产品代码"
                  value={r.fieldDesc}
                  onChange={(e) => updateRow(r.key, { fieldDesc: e.target.value })}
                />
                <div className="flex justify-center">
                  <Switch checked={r.mustFill} onCheckedChange={(v) => updateRow(r.key, { mustFill: v })} />
                </div>
                <div className="flex justify-end gap-0.5">
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === rows.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeRow(r.key)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={addRow}>
              <Plus className="size-4" />
              添加字段
            </Button>
          </div>
        )}
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2: check-types + lint**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint`
Expected: 均无错误退出。(组件不做渲染测,沿用约定。)

- [ ] **Step 3: 提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/basedata/manager/ManagerForm.tsx
git commit -m "✨ feat(mes-new): 2j 动态表编辑大弹窗(表头+可增删/排序字段明细, 受控)"
```

---

## Task 4: 列表页 ManagerList + 路由注册

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/basedata/manager/ManagerList.tsx`
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1: 写列表页**

创建 `mes/frontend/apps/mes-new/src/pages/basedata/manager/ManagerList.tsx`:

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
import ManagerForm from './ManagerForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { managerPage, managerDelete, type ManagerPageParams } from '@/api/basedata/manager'
import type { SpTableManager } from '@/types/manager'

const PAGE_SIZE = 10

export default function ManagerList() {
  const [params, setParams] = useState<ManagerPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpTableManager | null>(null)
  const [deleting, setDeleting] = useState<SpTableManager | null>(null)

  const { data, loading } = useQuery$(['basedata', 'manager', 'page', params], () => managerPage(params))
  const { mutate: removeManager } = useMutation$((id: string) => managerDelete(id))

  const onSearch = () =>
    setParams({
      current: 1,
      size: PAGE_SIZE,
      tableName: draftName || undefined,
      tableDesc: draftDesc || undefined,
    })
  const onReset = () => {
    setDraftName('')
    setDraftDesc('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeManager(deleting.id)
      toast.success('删除成功')
      invalidate('["basedata","manager","page"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpTableManager>[]>(
    () => [
      { accessorKey: 'tableName', header: '表名', cell: ({ row }) => row.original.tableName || '—' },
      { accessorKey: 'tableDesc', header: '表描述', cell: ({ row }) => row.original.tableDesc || '—' },
      {
        accessorKey: 'permission',
        header: '权限标识',
        cell: ({ row }) =>
          row.original.permission ? (
            <span className="block max-w-[18rem] truncate text-muted-foreground">{row.original.permission}</span>
          ) : (
            <Badge variant="secondary">无</Badge>
          ),
      },
      { accessorKey: 'updateTime', header: '更新时间', cell: ({ row }) => row.original.updateTime || '—' },
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
      title="动态表配置"
      description="定义主数据动态表(表头)及其字段明细"
      actions={
        <PermissionGuard perm="manager:add">
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            新建动态表
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-tbl-name">表名</Label>
          <Input id="s-tbl-name" className="h-9 w-48" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-tbl-desc">表描述</Label>
          <Input id="s-tbl-desc" className="h-9 w-48" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
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

      <ManagerForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除动态表「{deleting?.tableName}」及其全部字段明细吗?此操作不可恢复。
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

- [ ] **Step 2: 注册路由 — 加 import**

修改 `mes/frontend/apps/mes-new/src/router.tsx`,在 `import OperList from '@/pages/basedata/oper/OperList'`(第 17 行)之后新增一行:

```tsx
import ManagerList from '@/pages/basedata/manager/ManagerList'
```

- [ ] **Step 3: 注册路由 — 加 route**

同文件,在 `{ path: 'basedata/oper', element: <OperList /> },`(第 58 行)之后新增一行:

```tsx
          { path: 'basedata/manager', element: <ManagerList /> },
```

> urlMap.ts 第 11 行已有 `'/basedata/manager/list-ui': '/basedata/manager'`,菜单 105 已存在 → 侧边栏点得到,无需改 urlMap 或 SQL。

- [ ] **Step 4: check-types + lint + build**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint && pnpm --filter mes-new build`
Expected: 三步均成功;build 输出包含产物(`dist/`),无 TS/打包错误。

- [ ] **Step 5: 提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/basedata/manager/ManagerList.tsx \
        mes/frontend/apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 2j 动态表配置列表页 + 路由注册(/basedata/manager)"
```

---

## Task 5: 后端 service 修复 + 守卫单测(TDD)

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/request/SpTableManagerReq.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/service/ISpTableManagerService.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/service/impl/SpTableManagerServiceImpl.java`
- Test: `mes/src/test/java/com/wangziyang/mes/basedata/service/SpTableManagerServiceImplTest.java`

- [ ] **Step 1: 给请求对象加搜索字段**

将 `SpTableManagerReq.java` 全文替换为:

```java
package com.wangziyang.mes.basedata.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 通用主数据分页对象
 * @author wangziyang
 * @since 2020/03/15
 */
public class SpTableManagerReq extends BasePageReq {

    /** 表名(模糊查询) */
    private String tableName;

    /** 表描述(模糊查询) */
    private String tableDesc;

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public String getTableDesc() {
        return tableDesc;
    }

    public void setTableDesc(String tableDesc) {
        this.tableDesc = tableDesc;
    }
}
```

- [ ] **Step 2: 给 service 接口加 2 个方法签名**

将 `ISpTableManagerService.java` 全文替换为:

```java
package com.wangziyang.mes.basedata.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.basedata.dto.SpTableManagerDto;
import com.wangziyang.mes.basedata.entity.SpTableManager;
import com.wangziyang.mes.basedata.entity.SpTableManagerItem;
import com.wangziyang.mes.basedata.request.SpTableManagerReq;

import java.util.List;

/**
 * <p>
 * 主数据表头服务类
 * </p>
 *
 * @author WangZiYang
 * @since 2020-03-06
 */
public interface ISpTableManagerService extends IService<SpTableManager> {
    /**
     * 查询表对应的字段
     *
     * @param req 表信息
     * @return 字段信息
     */
    List<SpTableManagerItem> queryTableFieldByName(SpTableManager req) throws Exception;

    /**
     * 表头分页(支持表名/表描述模糊查询,按更新时间倒序)
     *
     * @param req 分页 + 查询条件
     * @return 分页结果
     */
    IPage<SpTableManager> pageList(SpTableManagerReq req);

    /**
     * 整体新增/更新表头 + 字段明细(事务):
     * 更新时先删旧明细;明细统一清 id 并挂表头 id 后批量插入;返回表头 id。
     *
     * @param dto 表头 + 明细集合
     * @return 表头 id
     */
    String saveOrUpdateWithItems(SpTableManagerDto dto);
}
```

- [ ] **Step 3: 写失败的守卫单测**

创建 `mes/src/test/java/com/wangziyang/mes/basedata/service/SpTableManagerServiceImplTest.java`:

```java
package com.wangziyang.mes.basedata.service;

import com.wangziyang.mes.basedata.dto.SpTableManagerDto;
import com.wangziyang.mes.basedata.entity.SpTableManager;
import com.wangziyang.mes.basedata.entity.SpTableManagerItem;
import com.wangziyang.mes.basedata.mapper.SpTableManagerMapper;
import com.wangziyang.mes.basedata.service.impl.SpTableManagerServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@RunWith(MockitoJUnitRunner.Silent.class)
public class SpTableManagerServiceImplTest {

    @Mock
    private SpTableManagerMapper baseMapper; // 注入 ServiceImpl.baseMapper / spTableManagerMapper

    @Mock
    private ISpTableManagerItemService iSpTableManagerItemService; // 注入 impl 的 itemService 字段

    @Spy
    @InjectMocks
    private SpTableManagerServiceImpl service;

    private SpTableManagerItem item(String id, String field) {
        SpTableManagerItem it = new SpTableManagerItem();
        it.setId(id);
        it.setField(field);
        it.setFieldDesc(field + "-desc");
        it.setMustFill("1");
        it.setSortNum(1);
        return it;
    }

    private SpTableManagerDto dto(String headerId, List<SpTableManagerItem> items) {
        SpTableManagerDto d = new SpTableManagerDto();
        d.setId(headerId);
        d.setTableName("product");
        d.setTableDesc("产品表");
        d.setSpTableManagerItems(items);
        return d;
    }

    @Test(expected = IllegalArgumentException.class)
    public void empty_items_throws() {
        service.saveOrUpdateWithItems(dto(null, new ArrayList<SpTableManagerItem>()));
    }

    @Test
    public void create_normalizes_items_returns_generated_id_without_delete() {
        // 模拟保存表头时由持久层生成 id
        doAnswer(inv -> {
            ((SpTableManager) inv.getArgument(0)).setId("gen-1");
            return true;
        }).when(service).saveOrUpdate(any(SpTableManager.class));

        List<SpTableManagerItem> items = new ArrayList<>(Arrays.asList(item("stale-1", "a"), item(null, "b")));
        String id = service.saveOrUpdateWithItems(dto(null, items));

        assertEquals("gen-1", id);
        verify(iSpTableManagerItemService, never()).deleteItemBytableNameId(any());
        verify(iSpTableManagerItemService).saveOrUpdateBatch(anyList());
        for (SpTableManagerItem it : items) {
            assertNull(it.getId());                        // 旧 id 被清空,强制插入
            assertEquals("gen-1", it.getTableNameId());    // 明细挂到表头 id
        }
    }

    @Test
    public void update_deletes_old_items_first_and_returns_id() {
        doAnswer(inv -> {
            ((SpTableManager) inv.getArgument(0)).setId("mgr-9");
            return true;
        }).when(service).saveOrUpdate(any(SpTableManager.class));

        List<SpTableManagerItem> items = new ArrayList<>(Arrays.asList(item(null, "x")));
        String id = service.saveOrUpdateWithItems(dto("mgr-9", items));

        assertEquals("mgr-9", id);
        verify(iSpTableManagerItemService).deleteItemBytableNameId("mgr-9");
        verify(iSpTableManagerItemService).saveOrUpdateBatch(anyList());
        assertEquals("mgr-9", items.get(0).getTableNameId());
    }
}
```

- [ ] **Step 4: 运行测试确认失败(编译红)**

Run: `cd mes && mvn -q -Dtest=SpTableManagerServiceImplTest test`
Expected: 编译失败 —— `找不到符号: 方法 saveOrUpdateWithItems(...)`(impl 尚未实现)。这是 TDD 的 red 态。

- [ ] **Step 5: 实现 service**

将 `SpTableManagerServiceImpl.java` 全文替换为:

```java
package com.wangziyang.mes.basedata.service.impl;

import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.basedata.dto.SpTableManagerDto;
import com.wangziyang.mes.basedata.entity.SpTableManager;
import com.wangziyang.mes.basedata.entity.SpTableManagerItem;
import com.wangziyang.mes.basedata.mapper.SpTableManagerMapper;
import com.wangziyang.mes.basedata.request.SpTableManagerReq;
import com.wangziyang.mes.basedata.service.ISpTableManagerItemService;
import com.wangziyang.mes.basedata.service.ISpTableManagerService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * <p>
 * 主数据表头服务实现类
 * </p>
 *
 * @author WangZiYang
 * @since 2020-03-06
 */
@Service
public class SpTableManagerServiceImpl extends ServiceImpl<SpTableManagerMapper, SpTableManager> implements ISpTableManagerService {
    /**
     * 基础管理表mapper
     */
    @Autowired
    private SpTableManagerMapper spTableManagerMapper;

    /**
     * 表字段明细服务
     */
    @Autowired
    private ISpTableManagerItemService iSpTableManagerItemService;

    /**
     * 查询表对应的字段
     *
     * @param req 表信息
     * @return 字段信息
     */
    @Override
    public List<SpTableManagerItem> queryTableFieldByName(SpTableManager req) throws Exception {
        List<SpTableManagerItem> spTableManagerItems = spTableManagerMapper.queryTableFieldByName(req);
        if (CollectionUtil.isEmpty(spTableManagerItems)) {
            throw new Exception("表不存在数据库中。请核对");
        }
        return spTableManagerItems;
    }

    /**
     * 表头分页(支持表名/表描述模糊查询,按更新时间倒序)
     */
    @Override
    public IPage<SpTableManager> pageList(SpTableManagerReq req) {
        LambdaQueryWrapper<SpTableManager> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.isNotBlank(req.getTableName())) {
            wrapper.like(SpTableManager::getTableName, req.getTableName());
        }
        if (StringUtils.isNotBlank(req.getTableDesc())) {
            wrapper.like(SpTableManager::getTableDesc, req.getTableDesc());
        }
        wrapper.orderByDesc(SpTableManager::getUpdateTime);
        return this.page(req, wrapper);
    }

    /**
     * 整体新增/更新表头 + 字段明细(事务)。修复原 controller 4 个缺陷:
     * 空明细抛异常(原缺 return 假成功)、加事务、更新先删旧明细、
     * 明细统一清 id + 挂表头 id(原更新分支不挂致丢失)、返回生成的表头 id(原返回 null)。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public String saveOrUpdateWithItems(SpTableManagerDto dto) {
        List<SpTableManagerItem> items = dto.getSpTableManagerItems();
        if (CollectionUtil.isEmpty(items)) {
            throw new IllegalArgumentException("显示的，详细的字段不可以为空");
        }
        SpTableManager header = new SpTableManager();
        BeanUtils.copyProperties(dto, header);
        this.saveOrUpdate(header);
        // 更新场景:先删旧明细
        if (StringUtils.isNotEmpty(dto.getId())) {
            iSpTableManagerItemService.deleteItemBytableNameId(dto.getId());
        }
        // 明细统一清 id(强制插入) + 挂到表头 id(新增/更新一致)
        for (SpTableManagerItem item : items) {
            item.setId(null);
            item.setTableNameId(header.getId());
        }
        iSpTableManagerItemService.saveOrUpdateBatch(items);
        return header.getId();
    }
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `cd mes && mvn -q -Dtest=SpTableManagerServiceImplTest test`
Expected: BUILD SUCCESS,`Tests run: 3, Failures: 0, Errors: 0, Skipped: 0`。

- [ ] **Step 7: 提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/basedata/request/SpTableManagerReq.java \
        mes/src/main/java/com/wangziyang/mes/basedata/service/ISpTableManagerService.java \
        mes/src/main/java/com/wangziyang/mes/basedata/service/impl/SpTableManagerServiceImpl.java \
        mes/src/test/java/com/wangziyang/mes/basedata/service/SpTableManagerServiceImplTest.java
git commit -m "🐛 fix(mes): 2j 修复动态表 add-or-update 4 个 bug(下沉 service+事务) + 服务端搜索 + Mockito 守卫单测"
```

---

## Task 6: 后端 controller 接线

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/controller/SpTableManagerController.java`

- [ ] **Step 1: 改 page 端点用 pageList**

在 `SpTableManagerController.java` 中,把 `page` 方法体(原第 102-105 行)从:

```java
    public Result page(SpTableManagerReq req) {
        IPage result = iSpTableManagerService.page(req);
        return Result.success(result);
    }
```

改为:

```java
    public Result page(SpTableManagerReq req) {
        IPage result = iSpTableManagerService.pageList(req);
        return Result.success(result);
    }
```

- [ ] **Step 2: 改 add-or-update 委托 service**

同文件,把 `addOrUpdate` 方法(原第 131-151 行)整体替换为:

```java
    @ApiOperation("主数据表头修改")
    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(@RequestBody SpTableManagerDto record) {
        if (CollectionUtil.isEmpty(record.getSpTableManagerItems())) {
            return Result.failure("显示的，详细的字段不可以为空");
        }
        return Result.success(iSpTableManagerService.saveOrUpdateWithItems(record));
    }
```

- [ ] **Step 3: 清理失效 import**

同文件,删除不再使用的 import 行:

```java
import org.springframework.beans.BeanUtils;
```

(`StringUtils`、`CollectionUtil`、`SpTableManager`、`SpTableManagerItem`、`SpTableManagerDto`、`IPage` 仍在使用,保留。)

- [ ] **Step 4: 编译 + 全量后端单测(确保接线不破坏)**

Run: `cd mes && mvn -q -Dtest=SpTableManagerServiceImplTest test`
Expected: BUILD SUCCESS,`Tests run: 3`。(此命令会先编译整个模块,controller 改动若有编译错会在此暴露。)

- [ ] **Step 5: 提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/basedata/controller/SpTableManagerController.java
git commit -m "♻️ refactor(mes): 2j controller 委托 service(page→pageList, add-or-update 薄化)"
```

---

## Task 7: 全量验证 + 收尾

**Files:** 无新增(仅运行验证 + 更新记忆)

- [ ] **Step 1: 前端全量门禁**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint && pnpm --filter mes-new test && pnpm --filter mes-new build`
Expected: 四步全过;test 中 `managerForm.test.ts` 与既有测试全绿;build 成功产出。

- [ ] **Step 2: 后端单测复跑**

Run: `cd mes && mvn -q -Dtest=SpTableManagerServiceImplTest test`
Expected: `Tests run: 3, Failures: 0, Errors: 0`。

- [ ] **Step 3: 更新路线图记忆**

更新 `~/.claude/projects/-Users-chengyiyang-Desktop-Projects-class-work-MES-FullStack/memory/mes-rebuild-roadmap.md`:把「动态表 Manager(基础数据收尾)」标为周期 2j Layer 1 已完成,并记录 Layer 2(动态数据维护 `/basedata/manager-item`,菜单 106)仍为下一周期候选(2j-2,含后端 `/basedata/common/*` 裸 SQL 注入加固)。同步 `MEMORY.md` 一行指针(如有变化)。

- [ ] **Step 4: 人工联调待办登记**

在路线图记忆中记录:后端登录需图形验证码无法脚本化(见 [[backend-build-mvnw-broken]]),`/basedata/manager` 的增删改查 + 编辑回填 + 搜索的运行期双端联调留作人工逐项确认。

---

## Self-Review(对照 spec)

**Spec 覆盖核对:**
- §1 范围(仅 Layer 1,不碰物理表)→ 前端纯元数据 CRUD,无 `/basedata/common/*` 调用 ✓
- §2 后端 4 bug 修复 → Task 5(空明细抛异常 / `@Transactional` / 返回 `header.getId()` / 明细清 id+挂 tableNameId)+ Task 6(controller 空校验保留友好文案)✓
- §2.2 服务端搜索 → Task 5 `SpTableManagerReq` + `pageList` LIKE Wrapper,Task 6 controller 调用 ✓
- §2.3 Mockito 守卫 → Task 5 三个用例(空抛异常 / 新增归一+返回 id+不删 / 更新先删)✓
- §3 接口契约(4 端点,编码区分)→ Task 2 api 模块,`add-or-update` 带 JSON_HEADERS,其余 form ✓
- §3 mustFill "1"/"0" + isDeleted "0" + 剥离 item id → Task 1 `buildUpsertPayload` + Task 5 后端 `setId(null)` 双保险 ✓
- §4 文件结构 → Task 1-4 全部产出 ✓
- §5 受控编辑器 + 行操作 + 校验 → Task 1(纯函数)+ Task 3(组件)✓
- §6 决策(省字段数列 / 服务端搜索 / 全 useState / mustFill 编码)→ ManagerList 列定义无字段数列;搜索服务端;ManagerForm 全 useState;编码 "1"/"0" ✓
- §7 测试与验收门 → Task 7 ✓
- §1.2 零菜单改动 → Task 4 仅注册路由,urlMap 已映射 ✓

**占位符扫描:** 无 TBD/TODO;每个代码步骤均含完整代码。✓

**类型一致性核对:**
- `FieldRow`/`ManagerHeader` 在 Task1 定义,Task3 导入使用,字段名一致(key/field/fieldDesc/mustFill;tableName/tableDesc/permission)✓
- `ManagerUpsertPayload` 在 types/manager.ts 定义,`buildUpsertPayload` 返回它,Task2 api + Task3 mutate 形参一致 ✓
- `managerPage/managerItems/managerAddOrUpdate/managerDelete` 在 Task2 定义,Task3/Task4 导入名一致 ✓
- 后端 `pageList`/`saveOrUpdateWithItems` 接口(Task5 Step2)↔ impl(Task5 Step5)↔ controller 调用(Task6)↔ 测试(Task5 Step3)签名一致 ✓
- `iSpTableManagerItemService` 字段名在 impl 与测试 @Mock 名一致(Mockito 按类型注入,名称非必须但保持一致)✓
