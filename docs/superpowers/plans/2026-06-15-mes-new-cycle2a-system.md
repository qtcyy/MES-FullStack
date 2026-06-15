# MES-New 周期2a 系统管理(角色/菜单/字典/部门)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/mes-new` 实现系统管理的角色、菜单、字典、部门四个页面,沿用周期1 用户管理标杆范式,并为 `@workspace/ui` 增量加入树表能力、为 mes-new 新增可复用 `TreeView`/`ParentSelect` 与纯函数树工具。

**Architecture:** 纯函数(建树/扁平化/勾选级联)抽到 `mes-new/src/utils/tree.ts` 并 TDD;`@workspace/ui` 的 `data-table` 增量接入 TanStack 展开模型(零破坏);`TreeView`(勾选树)与 `ParentSelect`(父级下拉)放 mes-new `components/`;四个页面各自 `api + List + Form + 路由`,数据层复用 `useQuery$/useMutation$/invalidate`。

**Tech Stack:** React 19 + TS + Vite + React Router v7 + @ngify/http(rxjs) + react-hook-form + zod + @tanstack/react-table + @workspace/ui(shadcn/Tailwind v4) + vitest。

---

## 关键事实(来自 mes1 源码 + 后端 Controller + 种子 SQL 核对)

- **请求编码**:四模块 `page` / `add-or-update` / `delete` **全部 form-urlencoded**(Controller 方法签名无 `@RequestBody`)。无 JSON 端点。`http.post(url, obj)` 经 `formEncodingInterceptor` 自动表单化。
- **删除语义**(沿用 mes1 已验证行为):
  - 角色 / 字典:**软删除**,调 `addOrUpdate({ ...record, deleted: '1' })`。
  - 部门:**软删除**,字段名是 `isDeleted`,调 `addOrUpdate({ ...record, isDeleted: '1' })`。
  - 菜单:**硬删除**,调 `delete` 端点 `{ id }`。
- **菜单权限分配**:`GET /admin/sys/role/tree/{roleId}` 返回已授权菜单 id `string[]`;提交时字段名 **`sysMenuIds: string[]`** 随 `add-or-update` 一并发送。`buildFormBody` 对数组用 `params.append(key, v)` 逐项 → `sysMenuIds=a&sysMenuIds=b`,匹配 Spring `String[]` 绑定。**边界**:空数组 → 参数缺失 → 后端 `getSysMenuIds()==null` 不重建(无法清空全部权限,与 mes1 同限,本期不解决)。
- **菜单 type**:数字 `0=目录 / 1=菜单 / 2=按钮`。
- **部门数据**:后端 `page` 返回**扁平分页**,前端 `buildTree` 成树 + 客户端按 name 过滤。为避免分页截断导致树不完整,拉取时用大 `size`(9999)取全量。
- **权限串(种子 SQL 很粗)**:菜单 `permission` 字段多为占位,仅存在 `:add` 粒度:`role:add`、`menu:add`、`dept:add`;**字典无任何 permission 串**。无 update/delete 粒度权限。
  - 策略:**"新建"按钮**用 `<模块>:add` 门禁(admin 有);**编辑/删除按钮不门禁**(始终显示);**字典页全不门禁**。
- **路由映射**:`utils/urlMap.ts` 已含 `role/menu/dict/department → /system/{role,menu,dict,department}`,侧栏导航无需改;但路由 path 必须用 **`system/department`**(非 `dept`)。
- **父级根哨兵**:`ParentSelect` 顶级用 `rootValue='0'`(shadcn `SelectItem` 不允许空串 value)。新建顶级 parentId 提交 `'0'`。**运行时需核对后端顶级菜单/部门的 parentId 约定是否为 `'0'`**(种子里顶级菜单 parentId 多为 `'0'`,见 SQL 第 401/408 行)。

## 对 spec 的偏离(已记录,执行时若有异议请反馈)

1. **`TreeView` 放 mes-new `components/` 而非 `@workspace/ui`**:理由——勾选级联纯函数必须单测,而 ui 包无 vitest 基建;TreeView 消费 app 侧树数据形状。`data-table` 树表扩展仍按 spec 进 ui 包。
2. **菜单权限提交用 `collectGrantedIds`(含半选祖先)** 而非 mes1 的 Ant 默认 checkedKeys(仅全选):保证被授权叶子的祖先菜单 id 一并提交,使角色菜单树可正确渲染。运行时验证授权生效。

## 文件结构

| 文件 | 职责 | 动作 |
|---|---|---|
| `apps/mes-new/src/types/system.ts` | SysRole/SysRoleDTO/SysDict/SysDepartment 类型 | 新建 |
| `apps/mes-new/src/utils/tree.ts` | buildTree / flattenTreeForSelect / 勾选级联纯函数 | 新建 |
| `apps/mes-new/src/utils/__tests__/tree.test.ts` | 上述纯函数单测 | 新建 |
| `packages/ui/src/components/data-table.tsx` | 增量加 getSubRows 展开 + 树缩进/折叠 + 页脚守卫 | 修改 |
| `apps/mes-new/src/components/TreeView.tsx` | 勾选树组件(消费 tree.ts) | 新建 |
| `apps/mes-new/src/components/ParentSelect.tsx` | 父级下拉(消费 flattenTreeForSelect) | 新建 |
| `apps/mes-new/src/api/system/dict.ts` | 字典 API | 新建 |
| `apps/mes-new/src/api/system/dept.ts` | 部门 API | 新建 |
| `apps/mes-new/src/api/system/menu.ts` | 系统菜单 CRUD API | 新建 |
| `apps/mes-new/src/api/system/role.ts` | 角色 API + 角色菜单树 | 新建 |
| `apps/mes-new/src/pages/system/dict/{DictList,DictForm}.tsx` | 字典页 | 新建 |
| `apps/mes-new/src/pages/system/dept/{DeptList,DeptForm}.tsx` | 部门页 | 新建 |
| `apps/mes-new/src/pages/system/menu/{MenuList,MenuForm}.tsx` | 菜单页 | 新建 |
| `apps/mes-new/src/pages/system/role/{RoleList,RoleForm}.tsx` | 角色页 | 新建 |
| `apps/mes-new/src/router.tsx` | 注册 4 条路由 | 修改 |

所有命令在 `mes/frontend` 目录执行。

---

### Task 1: 系统管理类型定义

**Files:**
- Create: `apps/mes-new/src/types/system.ts`

- [ ] **Step 1: 写类型文件**

```ts
// apps/mes-new/src/types/system.ts

export interface SysRole {
  id: string
  name: string
  code: string
  descr: string
  deleted: string // 0=正常 1=删除 2=禁用
  isSystem?: string // 0=否 1=系统角色
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SysRoleDTO extends SysRole {
  sysMenuIds?: string[]
}

export interface SysDict {
  id: string
  name: string
  value: string
  type: string
  descr: string
  sortNum: number
  parentId: string
  deleted: string // 0=正常 1=删除 2=禁用
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SysDepartment {
  id: string
  parentId: string
  name: string
  sortNum: number
  isDeleted: string // 0=正常 1=删除
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过(无 error)。

- [ ] **Step 3: Commit**

```bash
git add apps/mes-new/src/types/system.ts
git commit -m "🏷️ feat(mes-new): 系统管理类型(SysRole/SysDict/SysDepartment)"
```

---

### Task 2: 纯函数 `buildTree`(TDD)

**Files:**
- Create: `apps/mes-new/src/utils/tree.ts`
- Create: `apps/mes-new/src/utils/__tests__/tree.test.ts`

- [ ] **Step 1: 写 failing test**

```ts
// apps/mes-new/src/utils/__tests__/tree.test.ts
import { describe, it, expect } from 'vitest'
import { buildTree } from '@/utils/tree'

describe('buildTree', () => {
  it('扁平含 parentId 列表构建为嵌套树,parentId 不命中者作根', () => {
    const items = [
      { id: '1', parentId: '0', name: 'A' },
      { id: '2', parentId: '1', name: 'A-1' },
      { id: '3', parentId: '1', name: 'A-2' },
      { id: '4', parentId: '', name: 'B' },
    ]
    const tree = buildTree(items)
    expect(tree).toHaveLength(2) // A(parentId '0' 无对应节点→根) + B
    const a = tree.find((n) => n.id === '1')!
    expect(a.children.map((c) => c.id)).toEqual(['2', '3'])
    expect(tree.find((n) => n.id === '4')!.children).toEqual([])
  })

  it('乱序输入也能正确挂接', () => {
    const items = [
      { id: '2', parentId: '1' },
      { id: '1', parentId: '0' },
    ]
    const tree = buildTree(items)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.children[0]!.id).toBe('2')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter mes-new test -- tree`
Expected: FAIL — `Failed to resolve import "@/utils/tree"` 或 `buildTree is not a function`。

- [ ] **Step 3: 实现 buildTree**

```ts
// apps/mes-new/src/utils/tree.ts

export type WithChildren<T> = T & { children: WithChildren<T>[] }

/** 扁平(含 parentId)列表 → 嵌套树;parentId 为空或不命中任何节点者作为根 */
export function buildTree<T extends { id: string; parentId?: string }>(
  items: T[],
): WithChildren<T>[] {
  const map = new Map<string, WithChildren<T>>()
  const roots: WithChildren<T>[] = []
  items.forEach((item) => map.set(item.id, { ...item, children: [] }))
  items.forEach((item) => {
    const node = map.get(item.id)!
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter mes-new test -- tree`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/mes-new/src/utils/tree.ts apps/mes-new/src/utils/__tests__/tree.test.ts
git commit -m "✅ feat(mes-new): tree.buildTree 纯函数 + 单测"
```

---

### Task 3: 纯函数 `flattenTreeForSelect`(TDD)

**Files:**
- Modify: `apps/mes-new/src/utils/tree.ts`
- Modify: `apps/mes-new/src/utils/__tests__/tree.test.ts`

- [ ] **Step 1: 追加 failing test**

在 `tree.test.ts` 顶部 import 改为:

```ts
import { buildTree, flattenTreeForSelect } from '@/utils/tree'
```

在文件末尾追加:

```ts
describe('flattenTreeForSelect', () => {
  const nodes = [
    { id: '1', name: 'A', children: [{ id: '2', name: 'A-1', children: [{ id: '3', name: 'A-1-1' }] }] },
    { id: '4', name: 'B' },
  ]

  it('深度优先扁平化,按层级用全角空格缩进 label', () => {
    const opts = flattenTreeForSelect(nodes)
    expect(opts.map((o) => o.value)).toEqual(['1', '2', '3', '4'])
    expect(opts[0]!.label).toBe('A')
    expect(opts[1]!.label).toBe('　A-1')
    expect(opts[2]!.label).toBe('　　A-1-1')
  })

  it('excludeId 同时排除该节点及其全部子孙(防自环)', () => {
    const opts = flattenTreeForSelect(nodes, { excludeId: '1' })
    expect(opts.map((o) => o.value)).toEqual(['4'])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter mes-new test -- tree`
Expected: FAIL — `flattenTreeForSelect is not a function`。

- [ ] **Step 3: 追加实现**

在 `tree.ts` 末尾追加:

```ts
export interface SelectTreeNode {
  id: string
  name: string
  children?: SelectTreeNode[]
}

export interface SelectOption {
  value: string
  label: string
}

/** 树 → 带缩进 label 的下拉项;excludeId 排除该节点及其子孙 */
export function flattenTreeForSelect(
  nodes: SelectTreeNode[],
  opts: { excludeId?: string } = {},
): SelectOption[] {
  const out: SelectOption[] = []
  const walk = (list: SelectTreeNode[], depth: number) => {
    for (const n of list) {
      if (opts.excludeId && n.id === opts.excludeId) continue
      out.push({ value: n.id, label: `${'　'.repeat(depth)}${n.name}` })
      if (n.children?.length) walk(n.children, depth + 1)
    }
  }
  walk(nodes, 0)
  return out
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter mes-new test -- tree`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/mes-new/src/utils/tree.ts apps/mes-new/src/utils/__tests__/tree.test.ts
git commit -m "✅ feat(mes-new): tree.flattenTreeForSelect 纯函数 + 单测"
```

---

### Task 4: 纯函数 勾选级联(TDD)

**Files:**
- Modify: `apps/mes-new/src/utils/tree.ts`
- Modify: `apps/mes-new/src/utils/__tests__/tree.test.ts`

- [ ] **Step 1: 追加 failing test**

`tree.test.ts` 顶部 import 改为:

```ts
import {
  buildTree,
  flattenTreeForSelect,
  getCheckState,
  toggleNode,
  collectGrantedIds,
  type CheckTreeNode,
} from '@/utils/tree'
```

文件末尾追加:

```ts
describe('勾选级联', () => {
  const tree: CheckTreeNode[] = [
    { id: 'p', children: [{ id: 'c1' }, { id: 'c2' }] },
    { id: 'leaf' },
  ]

  it('getCheckState:全选子→父 checked;部分→indeterminate;全不选→unchecked', () => {
    expect(getCheckState(tree[0]!, new Set(['c1', 'c2']))).toBe('checked')
    expect(getCheckState(tree[0]!, new Set(['c1']))).toBe('indeterminate')
    expect(getCheckState(tree[0]!, new Set())).toBe('unchecked')
    expect(getCheckState(tree[1]!, new Set(['leaf']))).toBe('checked')
  })

  it('toggleNode:勾选父则连带全部子孙;再次切换则全清', () => {
    const after = toggleNode(tree[0]!, new Set())
    expect(after.has('p')).toBe(true)
    expect(after.has('c1')).toBe(true)
    expect(after.has('c2')).toBe(true)
    const cleared = toggleNode(tree[0]!, after)
    expect(cleared.has('p')).toBe(false)
    expect(cleared.has('c1')).toBe(false)
  })

  it('collectGrantedIds:含半选祖先(被授权叶子的祖先一并返回)', () => {
    // 仅勾选 c1 → p 半选;授权集应含 p 与 c1,不含 c2/leaf
    const granted = collectGrantedIds(tree, new Set(['c1']))
    expect(new Set(granted)).toEqual(new Set(['p', 'c1']))
  })

  it('collectGrantedIds:父全选时返回父+全部子孙', () => {
    const granted = collectGrantedIds(tree, new Set(['c1', 'c2']))
    expect(new Set(granted)).toEqual(new Set(['p', 'c1', 'c2']))
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter mes-new test -- tree`
Expected: FAIL — `getCheckState is not a function`。

- [ ] **Step 3: 追加实现**

在 `tree.ts` 末尾追加:

```ts
export interface CheckTreeNode {
  id: string
  children?: CheckTreeNode[]
}

export type CheckState = 'checked' | 'unchecked' | 'indeterminate'

/** 节点自身 + 全部子孙 id */
export function collectSelfAndDescendantIds(node: CheckTreeNode): string[] {
  const ids = [node.id]
  node.children?.forEach((c) => ids.push(...collectSelfAndDescendantIds(c)))
  return ids
}

/** 依据 checked 集合推导节点勾选态:叶子看是否在集合;父由子推导(全选/全不选/半选) */
export function getCheckState(node: CheckTreeNode, checked: Set<string>): CheckState {
  if (!node.children || node.children.length === 0) {
    return checked.has(node.id) ? 'checked' : 'unchecked'
  }
  const states = node.children.map((c) => getCheckState(c, checked))
  if (states.every((s) => s === 'checked')) return 'checked'
  if (states.every((s) => s === 'unchecked')) return 'unchecked'
  return 'indeterminate'
}

/** 切换节点:当前 checked 则清除自身+子孙,否则添加自身+子孙 */
export function toggleNode(node: CheckTreeNode, checked: Set<string>): Set<string> {
  const next = new Set(checked)
  const ids = collectSelfAndDescendantIds(node)
  if (getCheckState(node, checked) === 'checked') {
    ids.forEach((id) => next.delete(id))
  } else {
    ids.forEach((id) => next.add(id))
  }
  return next
}

/** 提交用授权集:所有非 unchecked 的节点 id(含半选祖先),保证菜单树可渲染 */
export function collectGrantedIds(nodes: CheckTreeNode[], checked: Set<string>): string[] {
  const out: string[] = []
  const walk = (list: CheckTreeNode[]) => {
    for (const n of list) {
      if (getCheckState(n, checked) === 'unchecked') continue
      out.push(n.id)
      walk(n.children ?? [])
    }
  }
  walk(nodes)
  return out
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter mes-new test -- tree`
Expected: PASS(全部 tree 用例)。

- [ ] **Step 5: Commit**

```bash
git add apps/mes-new/src/utils/tree.ts apps/mes-new/src/utils/__tests__/tree.test.ts
git commit -m "✅ feat(mes-new): tree 勾选级联纯函数(getCheckState/toggleNode/collectGrantedIds) + 单测"
```

---

### Task 5: `@workspace/ui` data-table 增量支持树表

**Files:**
- Modify: `packages/ui/src/components/data-table.tsx`

零破坏:仅当传入 `getSubRows` 时启用展开与树缩进;不传则与现状完全一致(`UserList` 不受影响)。

- [ ] **Step 1: 扩展 import(TanStack 展开模型 + 图标)**

把顶部 `@tanstack/react-table` 的 import 块改为追加 `ExpandedState`、`getExpandedRowModel`:

```ts
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
```

把 lucide import 块改为追加 `ChevronRightIcon`:

```ts
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
```

- [ ] **Step 2: 扩展 Props 接口**

在 `DataTableProps` 接口内,`onRowSelectionChange?` 行后追加两行:

```ts
  onRowSelectionChange?: (rowSelection: Record<string, boolean>) => void;
  /** 提供则启用树形展开:返回该行子行数组 */
  getSubRows?: (row: TData) => TData[] | undefined;
  /** 树形默认是否全部展开(默认 true) */
  defaultExpanded?: boolean;
```

- [ ] **Step 3: 解构新 props**

在函数参数解构里,`onRowSelectionChange: externalOnRowSelectionChange,` 行后追加:

```ts
  getSubRows,
  defaultExpanded = true,
```

- [ ] **Step 4: 加 expanded 状态 + 接入 table**

在 `const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({});` 之后追加:

```ts
  const [expanded, setExpanded] = React.useState<ExpandedState>(
    getSubRows && defaultExpanded ? true : {}
  );
```

在 `useReactTable({ ... })` 配置对象中,`getCoreRowModel: getCoreRowModel(),` 行后追加:

```ts
    getSubRows: getSubRows as ((row: TData, index: number) => TData[] | undefined) | undefined,
    getExpandedRowModel: getSubRows ? getExpandedRowModel() : undefined,
    onExpandedChange: setExpanded,
```

在 `state: { ... }` 对象中,`rowSelection,` 行后追加:

```ts
      ...(getSubRows && { expanded }),
```

- [ ] **Step 5: 树缩进 + 折叠控件(改 body 单元格渲染)**

把 body 中数据行的单元格渲染:

```tsx
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
```

改为:

```tsx
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <TableCell key={cell.id}>
                      {getSubRows && cellIndex === 0 ? (
                        <div
                          className="flex items-center"
                          style={{ paddingLeft: `${row.depth * 1.25}rem` }}
                        >
                          {row.getCanExpand() ? (
                            <button
                              type="button"
                              onClick={row.getToggleExpandedHandler()}
                              className="mr-1 inline-flex size-5 items-center justify-center rounded hover:bg-muted"
                              aria-label="展开或折叠"
                            >
                              <ChevronRightIcon
                                className={cn(
                                  "size-4 transition-transform",
                                  row.getIsExpanded() && "rotate-90"
                                )}
                              />
                            </button>
                          ) : (
                            <span className="mr-1 inline-block size-5" />
                          )}
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </div>
                      ) : (
                        flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )
                      )}
                    </TableCell>
                  ))}
```

- [ ] **Step 6: 页脚守卫(树表无分页时不显示页脚)**

把页脚整块:

```tsx
      <div className="flex items-center justify-end space-x-2 py-4">
```

改为(包一层条件渲染,仅在有分页或开启行选择时显示):

```tsx
      {(pagination || enableRowSelection) && (
      <div className="flex items-center justify-end space-x-2 py-4">
```

并在该 `</div>` 闭合后补 `)}`。即把页脚最外层 `</div>` 改为:

```tsx
        </div>
      </div>
      )}
```

(对应原文件第 228-266 行的 `<div className="space-x-2">…</div>` 与外层 `</div>`。)

- [ ] **Step 7: 类型检查 + 构建(含验证 UserList 不破)**

Run: `pnpm --filter @workspace/ui check-types`
Expected: 通过。

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

Run: `pnpm --filter mes-new build`
Expected: `✓ built` 成功(UserList 仍编译,未传 getSubRows → 行为不变)。

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/components/data-table.tsx
git commit -m "✨ feat(ui): data-table 增量支持树形展开(getSubRows)与缩进/折叠,零破坏"
```

---

### Task 6: `TreeView` 勾选树组件

**Files:**
- Create: `apps/mes-new/src/components/TreeView.tsx`

- [ ] **Step 1: 写组件**

```tsx
// apps/mes-new/src/components/TreeView.tsx
import { useState } from 'react'
import { Checkbox, cn } from '@workspace/ui'
import { ChevronRight } from 'lucide-react'
import { getCheckState, toggleNode } from '@/utils/tree'

export interface TreeViewNode {
  id: string
  label: string
  children?: TreeViewNode[]
}

interface TreeViewProps {
  nodes: TreeViewNode[]
  checkedIds: string[]
  onCheckedChange: (ids: string[]) => void
  className?: string
}

function collectAllIds(nodes: TreeViewNode[]): Set<string> {
  const set = new Set<string>()
  const walk = (list: TreeViewNode[]) =>
    list.forEach((n) => {
      set.add(n.id)
      if (n.children) walk(n.children)
    })
  walk(nodes)
  return set
}

export default function TreeView({ nodes, checkedIds, onCheckedChange, className }: TreeViewProps) {
  const checked = new Set(checkedIds)
  const [expanded, setExpanded] = useState<Set<string>>(() => collectAllIds(nodes))

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onToggle = (node: TreeViewNode) => onCheckedChange(Array.from(toggleNode(node, checked)))

  const renderNodes = (list: TreeViewNode[], depth: number) =>
    list.map((node) => {
      const state = getCheckState(node, checked)
      const hasChildren = !!node.children?.length
      const isOpen = expanded.has(node.id)
      return (
        <div key={node.id}>
          <div className="flex items-center gap-1.5 py-1" style={{ paddingLeft: `${depth * 1.25}rem` }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="inline-flex size-5 items-center justify-center rounded hover:bg-muted"
                aria-label="展开或折叠"
              >
                <ChevronRight className={cn('size-4 transition-transform', isOpen && 'rotate-90')} />
              </button>
            ) : (
              <span className="inline-block size-5" />
            )}
            <Checkbox
              checked={state === 'indeterminate' ? 'indeterminate' : state === 'checked'}
              onCheckedChange={() => onToggle(node)}
            />
            <span className="text-sm">{node.label}</span>
          </div>
          {hasChildren && isOpen && renderNodes(node.children!, depth + 1)}
        </div>
      )
    })

  return <div className={cn('select-none', className)}>{renderNodes(nodes, 0)}</div>
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

- [ ] **Step 3: Commit**

```bash
git add apps/mes-new/src/components/TreeView.tsx
git commit -m "✨ feat(mes-new): TreeView 勾选树组件(级联/半选,消费 tree 纯函数)"
```

---

### Task 7: `ParentSelect` 父级下拉组件

**Files:**
- Create: `apps/mes-new/src/components/ParentSelect.tsx`

- [ ] **Step 1: 写组件**

```tsx
// apps/mes-new/src/components/ParentSelect.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui'
import { flattenTreeForSelect, type SelectTreeNode } from '@/utils/tree'

interface ParentSelectProps {
  nodes: SelectTreeNode[]
  value?: string
  onChange: (value: string) => void
  excludeId?: string
  rootLabel?: string
  rootValue?: string
  placeholder?: string
}

export default function ParentSelect({
  nodes,
  value,
  onChange,
  excludeId,
  rootLabel = '顶级(无上级)',
  rootValue = '0',
  placeholder = '请选择上级',
}: ParentSelectProps) {
  const options = flattenTreeForSelect(nodes, { excludeId })
  return (
    <Select value={value || rootValue} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={rootValue}>{rootLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

- [ ] **Step 3: Commit**

```bash
git add apps/mes-new/src/components/ParentSelect.tsx
git commit -m "✨ feat(mes-new): ParentSelect 父级下拉(树扁平化+缩进)"
```

---

### Task 8: 字典页(标准 CRUD)

**Files:**
- Create: `apps/mes-new/src/api/system/dict.ts`
- Create: `apps/mes-new/src/pages/system/dict/DictList.tsx`
- Create: `apps/mes-new/src/pages/system/dict/DictForm.tsx`
- Modify: `apps/mes-new/src/router.tsx`

- [ ] **Step 1: 写 API**

```ts
// apps/mes-new/src/api/system/dict.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SysDict } from '@/types/system'

export interface DictPageParams extends PageParams {
  nameLike?: string
}

export function dictPage(params: DictPageParams) {
  return http.post<PageResult<SysDict>>('/admin/sys/dict/page', params)
}

/** 新增/编辑;删除亦走此接口设 deleted='1'(软删除) */
export function dictAddOrUpdate(record: SysDict) {
  return http.post<void>('/admin/sys/dict/add-or-update', record)
}
```

- [ ] **Step 2: 写 DictForm**

```tsx
// apps/mes-new/src/pages/system/dict/DictForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Textarea, toast } from '@workspace/ui'
import ModalForm from '@/components/ModalForm'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { dictAddOrUpdate } from '@/api/system/dict'
import type { SysDict } from '@/types/system'

interface DictFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysDict | null
  onSaved: () => void
}

const schema = z.object({
  name: z.string().min(1, '请输入标签名'),
  value: z.string().min(1, '请输入数据值'),
  type: z.string().min(1, '请输入类型'),
  sortNum: z.coerce.number().int().min(0, '排序需为非负整数'),
  parentId: z.string().optional(),
  descr: z.string().optional(),
})

export default function DictForm({ open, onOpenChange, record, onSaved }: DictFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SysDict) => dictAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', value: '', type: '', sortNum: 0, parentId: '', descr: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: record?.name ?? '',
        value: record?.value ?? '',
        type: record?.type ?? '',
        sortNum: record?.sortNum ?? 0,
        parentId: record?.parentId ?? '',
        descr: record?.descr ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SysDict = {
      ...(record ?? { id: '', name: '', value: '', type: '', descr: '', sortNum: 0, parentId: '', deleted: '0' }),
      name: values.name,
      value: values.value,
      type: values.type,
      sortNum: values.sortNum,
      parentId: values.parentId ?? '',
      descr: values.descr ?? '',
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","dict"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <ModalForm open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑字典' : '新增字典'} onSubmit={onSubmit} submitting={loading}>
      <div className="space-y-1.5">
        <Label htmlFor="d-name">标签名</Label>
        <Input id="d-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-value">数据值</Label>
        <Input id="d-value" {...register('value')} />
        {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-type">类型</Label>
        <Input id="d-type" {...register('type')} />
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-sort">排序</Label>
        <Input id="d-sort" type="number" {...register('sortNum')} />
        {errors.sortNum && <p className="text-xs text-destructive">{errors.sortNum.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-parent">上级 ID(可选)</Label>
        <Input id="d-parent" {...register('parentId')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-descr">描述</Label>
        <Textarea id="d-descr" {...register('descr')} />
      </div>
    </ModalForm>
  )
}
```

- [ ] **Step 3: 写 DictList**

```tsx
// apps/mes-new/src/pages/system/dict/DictList.tsx
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
import DictForm from './DictForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { dictPage, dictAddOrUpdate, type DictPageParams } from '@/api/system/dict'
import type { SysDict } from '@/types/system'

const PAGE_SIZE = 10

export default function DictList() {
  const [params, setParams] = useState<DictPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SysDict | null>(null)
  const [deleting, setDeleting] = useState<SysDict | null>(null)

  const { data, loading } = useQuery$(['sys', 'dict', 'page', params], () => dictPage(params))
  const { mutate: softDelete } = useMutation$((record: SysDict) => dictAddOrUpdate({ ...record, deleted: '1' }))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, nameLike: draftName || undefined })
  const onReset = () => {
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await softDelete(deleting)
      toast.success('删除成功')
      invalidate('["sys","dict"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SysDict>[]>(
    () => [
      { accessorKey: 'name', header: '标签名' },
      { accessorKey: 'value', header: '数据值' },
      { accessorKey: 'type', header: '类型' },
      { accessorKey: 'sortNum', header: '排序' },
      { accessorKey: 'descr', header: '描述', cell: ({ row }) => row.original.descr || '—' },
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
      title="字典管理"
      description="维护系统数据字典"
      actions={
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="size-4" />
          新建字典
        </Button>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-dict-name">标签名</Label>
          <Input id="s-dict-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
      </SearchForm>

      <div className="rounded-lg border border-border bg-card p-2">
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
      </div>

      <DictForm open={formOpen} onOpenChange={setFormOpen} record={editing} onSaved={() => {}} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除字典「{deleting?.name}」吗?</AlertDialogDescription>
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

- [ ] **Step 4: 注册路由**

在 `router.tsx` 顶部 import 区(`import UserList ...` 行后)追加:

```tsx
import DictList from '@/pages/system/dict/DictList'
```

在 children 数组里 `{ path: 'system/user', element: <UserList /> },` 行后追加:

```tsx
          { path: 'system/dict', element: <DictList /> },
```

- [ ] **Step 5: 校验 + 跑测试**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

Run: `pnpm --filter mes-new test`
Expected: 已有 + tree 测试全 PASS。

Run: `pnpm --filter mes-new build`
Expected: `✓ built` 成功。

- [ ] **Step 6: Commit**

```bash
git add apps/mes-new/src/api/system/dict.ts apps/mes-new/src/pages/system/dict apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 字典管理页(标准 CRUD)"
```

---

### Task 9: 部门页(树表)

**Files:**
- Create: `apps/mes-new/src/api/system/dept.ts`
- Create: `apps/mes-new/src/pages/system/dept/DeptList.tsx`
- Create: `apps/mes-new/src/pages/system/dept/DeptForm.tsx`
- Modify: `apps/mes-new/src/router.tsx`

- [ ] **Step 1: 写 API**(拉全量建树,故用大 size)

```ts
// apps/mes-new/src/api/system/dept.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SysDepartment } from '@/types/system'

export interface DeptPageParams extends PageParams {
  nameLike?: string
}

export function deptPage(params: DeptPageParams) {
  return http.post<PageResult<SysDepartment>>('/admin/sys/department/page', params)
}

/** 新增/编辑;删除走此接口设 isDeleted='1'(软删除) */
export function deptAddOrUpdate(record: SysDepartment) {
  return http.post<void>('/admin/sys/department/add-or-update', record)
}
```

- [ ] **Step 2: 写 DeptForm**(父级用 ParentSelect,排除自身防自环)

```tsx
// apps/mes-new/src/pages/system/dept/DeptForm.tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, toast } from '@workspace/ui'
import ModalForm from '@/components/ModalForm'
import ParentSelect from '@/components/ParentSelect'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { deptAddOrUpdate } from '@/api/system/dept'
import type { SysDepartment } from '@/types/system'
import type { SelectTreeNode } from '@/utils/tree'

interface DeptFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysDepartment | null
  treeNodes: SelectTreeNode[]
  onSaved: () => void
}

const schema = z.object({
  name: z.string().min(1, '请输入部门名称'),
  parentId: z.string(),
  sortNum: z.coerce.number().int().min(0, '排序需为非负整数'),
})

export default function DeptForm({ open, onOpenChange, record, treeNodes, onSaved }: DeptFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SysDepartment) => deptAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', parentId: '0', sortNum: 0 },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: record?.name ?? '',
        parentId: record?.parentId || '0',
        sortNum: record?.sortNum ?? 0,
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SysDepartment = {
      ...(record ?? { id: '', parentId: '0', name: '', sortNum: 0, isDeleted: '0' }),
      name: values.name,
      parentId: values.parentId,
      sortNum: values.sortNum,
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","dept"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <ModalForm open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑部门' : '新增部门'} onSubmit={onSubmit} submitting={loading}>
      <div className="space-y-1.5">
        <Label htmlFor="dept-name">部门名称</Label>
        <Input id="dept-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>上级部门</Label>
        <Controller
          control={control}
          name="parentId"
          render={({ field }) => (
            <ParentSelect nodes={treeNodes} value={field.value} onChange={field.onChange} excludeId={record?.id} />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dept-sort">排序</Label>
        <Input id="dept-sort" type="number" {...register('sortNum')} />
        {errors.sortNum && <p className="text-xs text-destructive">{errors.sortNum.message}</p>}
      </div>
    </ModalForm>
  )
}
```

- [ ] **Step 3: 写 DeptList**(拉全量 → buildTree → 客户端搜索 → 树表)

```tsx
// apps/mes-new/src/pages/system/dept/DeptList.tsx
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
import DeptForm from './DeptForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { deptPage, deptAddOrUpdate } from '@/api/system/dept'
import { buildTree, type WithChildren } from '@/utils/tree'
import type { SysDepartment } from '@/types/system'

type DeptNode = WithChildren<SysDepartment>

export default function DeptList() {
  const [draftName, setDraftName] = useState('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SysDepartment | null>(null)
  const [deleting, setDeleting] = useState<SysDepartment | null>(null)

  // 拉全量(大 size),客户端建树
  const { data, loading } = useQuery$(['sys', 'dept', 'all'], () => deptPage({ current: 1, size: 9999 }))
  const { mutate: softDelete } = useMutation$((record: SysDepartment) => deptAddOrUpdate({ ...record, isDeleted: '1' }))

  const records = data?.records ?? []
  const treeData = useMemo<DeptNode[]>(() => {
    const list = search ? records.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())) : records
    return buildTree(list)
  }, [records, search])

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await softDelete(deleting)
      toast.success('删除成功')
      invalidate('["sys","dept"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<DeptNode>[]>(
    () => [
      { accessorKey: 'name', header: '部门名称' },
      { accessorKey: 'sortNum', header: '排序' },
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
      title="部门管理"
      description="维护组织部门层级"
      actions={
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="size-4" />
          新建部门
        </Button>
      }
    >
      <SearchForm onSearch={() => setSearch(draftName)} onReset={() => { setDraftName(''); setSearch('') }}>
        <div className="space-y-1.5">
          <Label htmlFor="s-dept-name">部门名称</Label>
          <Input id="s-dept-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
      </SearchForm>

      <div className="rounded-lg border border-border bg-card p-2">
        <DataTable
          columns={columns}
          data={treeData}
          loading={loading}
          loadingRowCount={6}
          getSubRows={(row) => row.children}
        />
      </div>

      <DeptForm
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        treeNodes={records.map((r) => ({ id: r.id, name: r.name, parentId: r.parentId })) as never}
        onSaved={() => {}}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除部门「{deleting?.name}」吗?其子部门不会被级联删除。</AlertDialogDescription>
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

> 说明:`ParentSelect` 需要的是「树」形 `SelectTreeNode[]`,但其内部对扁平列表也能工作吗?不能——`flattenTreeForSelect` 需嵌套。故下方 DeptForm 的 `treeNodes` 必须传**树**。修正:将 `treeNodes` 改为传 `buildTree(records)`。见 Step 4 修正。

- [ ] **Step 4: 修正 DeptForm 入参为树**

把 Step 3 中 `<DeptForm ... treeNodes={records.map(...) as never} ... />` 替换为传入已建好的树(复用 `treeData` 之外、不受搜索影响的全量树):

在 `DeptList` 的 `treeData` useMemo 后追加一个全量树:

```tsx
  const fullTree = useMemo(() => buildTree(records), [records])
```

并将 `<DeptForm>` 的 `treeNodes` 改为:

```tsx
        treeNodes={fullTree as never}
```

(`WithChildren<SysDepartment>` 含 `id/name/children`,结构兼容 `SelectTreeNode`;用 `as never` 规避结构性多余字段告警。)

- [ ] **Step 5: 注册路由**

`router.tsx` import 区追加:

```tsx
import DeptList from '@/pages/system/dept/DeptList'
```

children 数组 `{ path: 'system/dict', element: <DictList /> },` 行后追加:

```tsx
          { path: 'system/department', element: <DeptList /> },
```

- [ ] **Step 6: 校验**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

Run: `pnpm --filter mes-new build`
Expected: `✓ built` 成功。

- [ ] **Step 7: Commit**

```bash
git add apps/mes-new/src/api/system/dept.ts apps/mes-new/src/pages/system/dept apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 部门管理页(树表/客户端建树+搜索)"
```

---

### Task 10: 菜单页(树表 + 父级/类型选择)

**Files:**
- Create: `apps/mes-new/src/api/system/menu.ts`
- Create: `apps/mes-new/src/pages/system/menu/MenuList.tsx`
- Create: `apps/mes-new/src/pages/system/menu/MenuForm.tsx`
- Modify: `apps/mes-new/src/router.tsx`

- [ ] **Step 1: 写 API**

```ts
// apps/mes-new/src/api/system/menu.ts
import { http } from '@/http/client'
import type { TreeVO, SysMenu } from '@/types/menu'

export function menuTree() {
  return http.get<TreeVO<SysMenu>[]>('/admin/sys/menu/tree')
}

export function menuAddOrUpdate(record: SysMenu) {
  return http.post<void>('/admin/sys/menu/add-or-update', record)
}

/** 菜单为硬删除 */
export function menuDelete(id: string) {
  return http.post<void>('/admin/sys/menu/delete', { id })
}
```

- [ ] **Step 2: 写 MenuForm**(类型用 Select,父级用 ParentSelect)

```tsx
// apps/mes-new/src/pages/system/menu/MenuForm.tsx
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
  toast,
} from '@workspace/ui'
import ModalForm from '@/components/ModalForm'
import ParentSelect from '@/components/ParentSelect'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { menuAddOrUpdate } from '@/api/system/menu'
import type { SysMenu, TreeVO } from '@/types/menu'

interface MenuFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysMenu | null
  treeNodes: TreeVO<SysMenu>[]
  onSaved: () => void
}

const schema = z.object({
  code: z.string().min(1, '请输入编码'),
  name: z.string().min(1, '请输入名称'),
  url: z.string().optional(),
  parentId: z.string(),
  type: z.coerce.number().int().min(0).max(2),
  sortNum: z.coerce.number().int().min(0),
  permission: z.string().optional(),
  icon: z.string().optional(),
  descr: z.string().optional(),
})

export default function MenuForm({ open, onOpenChange, record, treeNodes, onSaved }: MenuFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SysMenu) => menuAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', url: '', parentId: '0', type: 1, sortNum: 0, permission: '', icon: '', descr: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: record?.code ?? '',
        name: record?.name ?? '',
        url: record?.url ?? '',
        parentId: record?.parentId || '0',
        type: record?.type ?? 1,
        sortNum: record?.sortNum ?? 0,
        permission: record?.permission ?? '',
        icon: record?.icon ?? '',
        descr: record?.descr ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SysMenu = {
      ...(record ?? { id: '', code: '', name: '', url: '', parentId: '0', grade: 0, sortNum: 0, type: 1, permission: '', icon: '', descr: '' }),
      code: values.code,
      name: values.name,
      url: values.url ?? '',
      parentId: values.parentId,
      type: values.type,
      sortNum: values.sortNum,
      permission: values.permission ?? '',
      icon: values.icon ?? '',
      descr: values.descr ?? '',
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","menu"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <ModalForm open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑菜单' : '新增菜单'} onSubmit={onSubmit} submitting={loading}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-code">编码</Label>
          <Input id="m-code" {...register('code')} />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-name">名称</Label>
          <Input id="m-name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>上级菜单</Label>
        <Controller
          control={control}
          name="parentId"
          render={({ field }) => (
            <ParentSelect
              nodes={treeNodes.map((n) => toSelectNode(n))}
              value={field.value}
              onChange={field.onChange}
              excludeId={record?.id}
              rootLabel="顶级菜单"
            />
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>类型</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">目录</SelectItem>
                  <SelectItem value="1">菜单</SelectItem>
                  <SelectItem value="2">按钮</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-sort">排序</Label>
          <Input id="m-sort" type="number" {...register('sortNum')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-url">路由 URL</Label>
        <Input id="m-url" {...register('url')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-perm">权限标识</Label>
          <Input id="m-perm" {...register('permission')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-icon">图标(lucide 名)</Label>
          <Input id="m-icon" {...register('icon')} />
        </div>
      </div>
    </ModalForm>
  )
}

// TreeVO → SelectTreeNode(id/name/children)
function toSelectNode(n: TreeVO<SysMenu>): { id: string; name: string; children?: ReturnType<typeof toSelectNode>[] } {
  return { id: n.id, name: n.name, children: n.children?.map(toSelectNode) }
}
```

- [ ] **Step 3: 写 MenuList**(树表,数据来自 menuTree)

```tsx
// apps/mes-new/src/pages/system/menu/MenuList.tsx
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
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import MenuForm from './MenuForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { menuTree, menuDelete } from '@/api/system/menu'
import type { SysMenu, TreeVO } from '@/types/menu'

const TYPE_LABEL: Record<number, string> = { 0: '目录', 1: '菜单', 2: '按钮' }

export default function MenuList() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SysMenu | null>(null)
  const [deleting, setDeleting] = useState<TreeVO<SysMenu> | null>(null)

  const { data, loading } = useQuery$(['sys', 'menu', 'tree'], () => menuTree())
  const { mutate: removeMenu } = useMutation$((id: string) => menuDelete(id))

  const treeData = data ?? []

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeMenu(deleting.id)
      toast.success('删除成功')
      invalidate('["sys","menu"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  // TreeVO → 可编辑 SysMenu(编辑表单需要 SysMenu 字段)
  const toMenu = (n: TreeVO<SysMenu>): SysMenu => ({
    id: n.id,
    code: n.code ?? '',
    name: n.name,
    url: n.url ?? '',
    parentId: n.pid ?? '0',
    grade: 0,
    sortNum: 0,
    type: n.type ?? 1,
    permission: n.permission ?? '',
    icon: n.icon ?? '',
    descr: '',
  })

  const columns = useMemo<ColumnDef<TreeVO<SysMenu>>[]>(
    () => [
      { accessorKey: 'name', header: '名称' },
      { id: 'type', header: '类型', cell: ({ row }) => <Badge variant="secondary">{TYPE_LABEL[row.original.type ?? 1]}</Badge> },
      { accessorKey: 'permission', header: '权限标识', cell: ({ row }) => row.original.permission || '—' },
      { accessorKey: 'url', header: 'URL', cell: ({ row }) => row.original.url || '—' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(toMenu(row.original)); setFormOpen(true) }}>
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
      title="菜单管理"
      description="维护系统菜单与权限标识"
      actions={
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="size-4" />
          新建菜单
        </Button>
      }
    >
      <div className="rounded-lg border border-border bg-card p-2">
        <DataTable
          columns={columns}
          data={treeData}
          loading={loading}
          loadingRowCount={8}
          getSubRows={(row) => row.children}
        />
      </div>

      <MenuForm open={formOpen} onOpenChange={setFormOpen} record={editing} treeNodes={treeData} onSaved={() => {}} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除菜单「{deleting?.name}」吗?此操作不可撤销。</AlertDialogDescription>
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

- [ ] **Step 4: 注册路由**

`router.tsx` import 区追加:

```tsx
import MenuList from '@/pages/system/menu/MenuList'
```

children 数组 `{ path: 'system/department', element: <DeptList /> },` 行后追加:

```tsx
          { path: 'system/menu', element: <MenuList /> },
```

- [ ] **Step 5: 校验**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

Run: `pnpm --filter mes-new build`
Expected: `✓ built` 成功。

- [ ] **Step 6: Commit**

```bash
git add apps/mes-new/src/api/system/menu.ts apps/mes-new/src/pages/system/menu apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 菜单管理页(树表 + 父级/类型选择)"
```

---

### Task 11: 角色页(CRUD + 菜单权限分配)

**Files:**
- Create: `apps/mes-new/src/api/system/role.ts`
- Create: `apps/mes-new/src/pages/system/role/RoleList.tsx`
- Create: `apps/mes-new/src/pages/system/role/RoleForm.tsx`
- Modify: `apps/mes-new/src/router.tsx`

- [ ] **Step 1: 写 API**

```ts
// apps/mes-new/src/api/system/role.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SysRole, SysRoleDTO } from '@/types/system'

export interface RolePageParams extends PageParams {
  nameLike?: string
}

export function rolePage(params: RolePageParams) {
  return http.post<PageResult<SysRole>>('/admin/sys/role/page', params)
}

/** 新增/编辑(含 sysMenuIds 授权);删除走此接口设 deleted='1'(软删除) */
export function roleAddOrUpdate(record: SysRoleDTO) {
  return http.post<void>('/admin/sys/role/add-or-update', record)
}

/** 获取角色已授权菜单 id 列表 */
export function roleMenuTree(roleId: string) {
  return http.get<string[]>(`/admin/sys/role/tree/${roleId}`)
}
```

- [ ] **Step 2: 写 RoleForm**(基本信息 + TreeView 权限分配)

```tsx
// apps/mes-new/src/pages/system/role/RoleForm.tsx
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Textarea, toast } from '@workspace/ui'
import ModalForm from '@/components/ModalForm'
import TreeView, { type TreeViewNode } from '@/components/TreeView'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { roleAddOrUpdate, roleMenuTree } from '@/api/system/role'
import { menuTree } from '@/api/system/menu'
import { collectGrantedIds, type CheckTreeNode } from '@/utils/tree'
import type { SysRole, SysRoleDTO } from '@/types/system'
import type { SysMenu, TreeVO } from '@/types/menu'

interface RoleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysRole | null
  onSaved: () => void
}

const schema = z.object({
  name: z.string().min(1, '请输入角色名'),
  code: z.string().min(1, '请输入角色编码'),
  descr: z.string().optional(),
})

function toTreeViewNodes(nodes: TreeVO<SysMenu>[]): TreeViewNode[] {
  return nodes.map((n) => ({ id: n.id, label: n.name, children: n.children ? toTreeViewNodes(n.children) : undefined }))
}

export default function RoleForm({ open, onOpenChange, record, onSaved }: RoleFormProps) {
  const isEdit = !!record
  const [checkedIds, setCheckedIds] = useState<string[]>([])

  const { data: menuData } = useQuery$(['sys', 'menu', 'tree'], () => menuTree())
  const { data: grantedIds } = useQuery$(
    ['sys', 'role', 'menuIds', record?.id ?? ''],
    () => roleMenuTree(record!.id),
    { enabled: open && isEdit },
  )

  const { mutate, loading } = useMutation$((dto: SysRoleDTO) => roleAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', descr: '' },
  })

  const menuNodes = useMemo<TreeViewNode[]>(() => toTreeViewNodes(menuData ?? []), [menuData])

  useEffect(() => {
    if (open) {
      reset({ name: record?.name ?? '', code: record?.code ?? '', descr: record?.descr ?? '' })
      setCheckedIds(isEdit ? (grantedIds ?? []) : [])
    }
  }, [open, record, isEdit, grantedIds, reset])

  const onSubmit = handleSubmit(async (values) => {
    const sysMenuIds = collectGrantedIds(menuNodes as CheckTreeNode[], new Set(checkedIds))
    const dto: SysRoleDTO = {
      ...(record ?? { id: '', name: '', code: '', descr: '', deleted: '0' }),
      name: values.name,
      code: values.code,
      descr: values.descr ?? '',
      sysMenuIds,
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","role"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <ModalForm open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑角色' : '新增角色'} onSubmit={onSubmit} submitting={loading}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="r-name">角色名</Label>
          <Input id="r-name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-code">角色编码</Label>
          <Input id="r-code" {...register('code')} />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="r-descr">描述</Label>
        <Textarea id="r-descr" {...register('descr')} />
      </div>
      <div className="space-y-1.5">
        <Label>菜单权限</Label>
        <div className="max-h-64 overflow-auto rounded-md border border-border p-2">
          <TreeView nodes={menuNodes} checkedIds={checkedIds} onCheckedChange={setCheckedIds} />
        </div>
      </div>
    </ModalForm>
  )
}
```

> 注:`ModalForm` 默认 `sm:max-w-md` 偏窄;角色表单含权限树,执行时如显局促,可在 `RoleForm` 不改 ModalForm 的前提下接受现状(树区已内置滚动)。如需更宽,后续可给 ModalForm 增加可选 `widthClassName` prop(本期不做,避免改动公共组件签名)。

- [ ] **Step 3: 写 RoleList**

```tsx
// apps/mes-new/src/pages/system/role/RoleList.tsx
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
import RoleForm from './RoleForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { rolePage, roleAddOrUpdate, type RolePageParams } from '@/api/system/role'
import type { SysRole } from '@/types/system'

const PAGE_SIZE = 10

export default function RoleList() {
  const [params, setParams] = useState<RolePageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SysRole | null>(null)
  const [deleting, setDeleting] = useState<SysRole | null>(null)

  const { data, loading } = useQuery$(['sys', 'role', 'page', params], () => rolePage(params))
  const { mutate: softDelete } = useMutation$((record: SysRole) => roleAddOrUpdate({ ...record, deleted: '1' }))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, nameLike: draftName || undefined })
  const onReset = () => {
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await softDelete(deleting)
      toast.success('删除成功')
      invalidate('["sys","role"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SysRole>[]>(
    () => [
      { accessorKey: 'name', header: '角色名' },
      { accessorKey: 'code', header: '编码' },
      { accessorKey: 'descr', header: '描述', cell: ({ row }) => row.original.descr || '—' },
      { id: 'isSystem', header: '系统角色', cell: ({ row }) => (row.original.isSystem === '1' ? <Badge variant="secondary">系统</Badge> : '—') },
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
      title="角色管理"
      description="维护角色及其菜单权限"
      actions={
        <PermissionGuard perm="role:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建角色
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-role-name">角色名</Label>
          <Input id="s-role-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
      </SearchForm>

      <div className="rounded-lg border border-border bg-card p-2">
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
      </div>

      <RoleForm open={formOpen} onOpenChange={setFormOpen} record={editing} onSaved={() => {}} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除角色「{deleting?.name}」吗?</AlertDialogDescription>
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

- [ ] **Step 4: 注册路由**

`router.tsx` import 区追加:

```tsx
import RoleList from '@/pages/system/role/RoleList'
```

children 数组 `{ path: 'system/menu', element: <MenuList /> },` 行后追加:

```tsx
          { path: 'system/role', element: <RoleList /> },
```

- [ ] **Step 5: 校验**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

Run: `pnpm --filter mes-new build`
Expected: `✓ built` 成功。

- [ ] **Step 6: Commit**

```bash
git add apps/mes-new/src/api/system/role.ts apps/mes-new/src/pages/system/role apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 角色管理页(CRUD + 菜单权限树分配)"
```

---

### Task 12: 全量验证 + 运行时验收

**Files:** 无(仅验证)

- [ ] **Step 1: 静态门禁全过**

Run: `pnpm --filter @workspace/ui check-types`
Expected: 通过。

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

Run: `pnpm --filter mes-new lint`
Expected: exit 0(允许 warning,沿用周期1 配置)。

Run: `pnpm --filter mes-new test`
Expected: 全部 PASS(含新增 tree 用例)。贴出 "Test Files / Tests passed" 行。

Run: `pnpm --filter mes-new build`
Expected: `✓ built` 成功。贴出模块数与耗时。

- [ ] **Step 2: 运行时验收(后端 :9090 已起,账号 admin/123)**

启动:`pnpm --filter mes-new dev`,浏览器登录后逐项核对(贴现象/截图说明):

1. 侧栏「系统管理」下可点进 角色/菜单/部门(字典种子可能无菜单项 → 直接访问 `/system/dict` 核对)。
2. **字典**:搜索、新建、编辑、删除(软删)分页正常。
3. **部门**:树展开/折叠正常;客户端按名搜索;新建子部门(选上级)、编辑、删除后树刷新正确;新建顶级 parentId 提交为 `'0'` 且落库正确。
4. **菜单**:树展开正常;类型 Badge 正确;新建/编辑(父级 ParentSelect、类型 Select)、删除(硬删)生效。
5. **角色**:新建角色 → 勾选菜单权限(父子级联/半选正确)→ 保存;重新打开编辑,已授权项正确回填;验证授权后该角色登录可见对应菜单(若有测试角色账号)。
6. **主题**:D/B 一键切换下四页与 TreeView/树表零异常。

- [ ] **Step 3: 验收记录**

将静态门禁输出与运行时逐项结果如实记录(通过/问题)。如有问题 → 用 systematic-debugging 处理后再勾选完成。

---

## 自检(Self-Review)

- **Spec 覆盖**:角色(Task 11)、菜单(Task 10)、字典(Task 8)、部门(Task 9)四页全覆盖;data-table 树表扩展(Task 5)、TreeView(Task 6)、ParentSelect(Task 7)、tree 纯函数(Task 2-4)均落任务;验收(Task 12)对应 spec 第 6 节。
- **占位符**:无 TBD/TODO;每步含完整代码与确切命令/预期。
- **类型一致性**:`buildTree`/`WithChildren`、`SelectTreeNode`/`flattenTreeForSelect`、`CheckTreeNode`/`getCheckState`/`toggleNode`/`collectGrantedIds`、`TreeViewNode`、`SysRole/SysRoleDTO/SysDict/SysDepartment` 在各任务签名一致;`http.post/get` 返回 Observable 经 `useQuery$/useMutation$` 消费,与周期1 一致;`invalidate` 前缀串与 query key 前缀对应(`["sys","dict"`/`["sys","dept"`/`["sys","menu"`/`["sys","role"`)。
- **删除语义**:角色/字典软删(deleted='1')、部门软删(isDeleted='1')、菜单硬删——与核对结论一致。
- **已知风险**:父级根哨兵 `'0'` 需运行时核对;角色清空全部权限受后端 null 判定所限(同 mes1)。已在计划标注。
