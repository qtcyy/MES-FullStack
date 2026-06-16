# 树形表格专项优化 实现计划（TreeDataTable + 展开/收缩动画）

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:subagent-driven-development 执行。各步用 checkbox（`- [ ]`）跟踪。

**Goal:** 新建专用 `TreeDataTable` 组件，为菜单/部门树形表格加上平滑展开收缩动画 + 缩进引导线 + 展开/折叠全部，并从 `DataTable` 移除树形死代码。

**Architecture:** 纯 CSS `grid-template-rows: 0fr↔1fr` 高度过渡 + 内容透明度淡入 + chevron 旋转。保留真实 `<table>`；TanStack `state.expanded=true` 恒真使全树常驻，可见性由组件自管 `collapsedIds`（以节点真实 id 为键）驱动，支持收起退出动画。

**Tech Stack:** React 19 + TanStack react-table v8.21 + Tailwind v4（无 framer-motion）+ shadcn `@workspace/ui`。

设计稿：`docs/superpowers/specs/2026-06-16-tree-table-redesign-design.md`

---

## Task 1: 新建 `TreeDataTable` 组件

**Files:**
- Create: `mes/frontend/packages/ui/src/components/tree-data-table.tsx`

- [ ] **Step 1: 写入完整组件代码**

```tsx
"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  InboxIcon,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

interface TreeDataTableProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** 返回该行子行数组(树形必填) */
  getSubRows: (row: TData) => TData[] | undefined;
  /** 行稳定 id(折叠状态键)。默认取 row.id */
  getRowId?: (row: TData) => string;
  loading?: boolean;
  loadingRowCount?: number;
  /** 初始是否全部折叠(默认 false = 全部展开) */
  defaultCollapsed?: boolean;
  /** 是否显示"展开全部/折叠全部"工具条(默认 true,仅在存在可展开行时渲染) */
  showExpandAll?: boolean;
}

const EXPANDED_ALL: ExpandedState = true;

function defaultGetRowId<TData>(row: TData): string {
  return String((row as { id?: string | number }).id);
}

function TreeDataTable<TData, TValue>({
  columns,
  data,
  getSubRows,
  getRowId = defaultGetRowId,
  loading = false,
  loadingRowCount = 6,
  defaultCollapsed = false,
  showExpandAll = true,
  className,
  ...props
}: TreeDataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getSubRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: () => {},
    state: { expanded: EXPANDED_ALL },
  });

  const rows = table.getRowModel().rows;

  // 可展开行 id(用于"折叠全部"与是否渲染工具条)
  const expandableIds = React.useMemo(
    () => rows.filter((r) => r.getCanExpand()).map((r) => r.id),
    [rows]
  );

  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(() =>
    defaultCollapsed ? new Set(expandableIds) : new Set()
  );

  const toggle = React.useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = React.useCallback(() => setCollapsedIds(new Set()), []);
  const collapseAll = React.useCallback(
    () => setCollapsedIds(new Set(expandableIds)),
    [expandableIds]
  );

  const colCount = columns.length;
  const showToolbar = showExpandAll && !loading && expandableIds.length > 0;

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {showToolbar && (
          <div className="flex items-center justify-end gap-1 border-b border-border px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="h-7 gap-1 text-xs text-muted-foreground"
            >
              <ChevronsUpDownIcon className="size-3.5" />
              展开全部
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="h-7 gap-1 text-xs text-muted-foreground"
            >
              <ChevronsDownUpIcon className="size-3.5" />
              折叠全部
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className="border-b-2 border-border bg-muted px-4 py-3 text-xs font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {Array.from({ length: colCount }).map((_, colIndex) => (
                    <TableCell key={colIndex} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => {
                const isOpen = !collapsedIds.has(row.id);
                const visible = row
                  .getParentRows()
                  .every((p) => !collapsedIds.has(p.id));
                return (
                  <tr
                    key={row.id}
                    aria-hidden={!visible || undefined}
                    className={cn(
                      "transition-colors",
                      visible ? "hover:bg-muted/50" : "pointer-events-none"
                    )}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <TableCell
                        key={cell.id}
                        className="border-0 p-0 align-middle"
                      >
                        {/* 高度动画层 */}
                        <div
                          className={cn(
                            "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                            visible ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          )}
                        >
                          <div className="overflow-hidden">
                            {cellIndex === 0 ? (
                              // 树形单元:缩进引导线 + chevron + 内容(分隔线/内边距在此层,随高度收起)
                              <div
                                className={cn(
                                  "flex items-stretch border-b border-border/60 pl-4 transition-opacity duration-200 motion-reduce:transition-none",
                                  visible ? "opacity-100" : "opacity-0"
                                )}
                              >
                                {Array.from({ length: row.depth }).map((_, i) => (
                                  <span
                                    key={i}
                                    aria-hidden
                                    className="w-5 shrink-0 self-stretch border-l border-border/40"
                                  />
                                ))}
                                {row.getCanExpand() ? (
                                  <button
                                    type="button"
                                    aria-label={isOpen ? "折叠" : "展开"}
                                    aria-expanded={isOpen}
                                    onClick={() => toggle(row.id)}
                                    className="mr-1 inline-flex size-5 shrink-0 items-center justify-center self-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  >
                                    <ChevronRightIcon
                                      className={cn(
                                        "size-4 transition-transform duration-200",
                                        isOpen && "rotate-90"
                                      )}
                                    />
                                  </button>
                                ) : (
                                  <span className="mr-1 inline-block size-5 shrink-0 self-center" />
                                )}
                                <div className="flex min-w-0 flex-1 items-center py-3 pr-4">
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "border-b border-border/60 px-4 py-3 transition-opacity duration-200 motion-reduce:transition-none",
                                  visible ? "opacity-100" : "opacity-0"
                                )}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    ))}
                  </tr>
                );
              })
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
                    <InboxIcon className="size-8 opacity-60" />
                    <span className="text-sm">暂无数据</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export { TreeDataTable };
export type { TreeDataTableProps };
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/frontend && pnpm --filter @workspace/ui check-types`
Expected: 无错误退出（EXIT 0）。若 `getRowId`/`getSubRows` 出现形参数量相关的类型告警，按需加 `as` 断言对齐 TanStack 选项签名（`getRowId as (row: TData, index: number, parent?: import("@tanstack/react-table").Row<TData>) => string`、`getSubRows as (row: TData, index: number) => TData[] | undefined`）。

---

## Task 2: barrel 导出 `TreeDataTable`

**Files:**
- Modify: `mes/frontend/packages/ui/src/index.ts`

- [ ] **Step 1: 在 DataTable 导出块之后追加导出**

紧接现有：
```ts
export {
  DataTable,
  DataTableColumnHeader,
  type DataTableProps,
} from "./components/data-table";
```
之后新增：
```ts
export {
  TreeDataTable,
  type TreeDataTableProps,
} from "./components/tree-data-table";
```

---

## Task 3: 从 `DataTable` 移除树形死代码

**Files:**
- Modify: `mes/frontend/packages/ui/src/components/data-table.tsx`

- [ ] **Step 1: 删除 import 中的树形类型/模型**

去掉 `type ExpandedState,`（第 6 行附近）与 `getExpandedRowModel,`（import 列表中）。其余 import 不动（`ChevronRightIcon` 仍被分页"下一页"用到，保留）。

- [ ] **Step 2: 删除树形 props（接口 + 解构）**

接口 `DataTableProps` 删除：
```ts
  /** 提供则启用树形展开:返回该行子行数组 */
  getSubRows?: (row: TData) => TData[] | undefined;
  /** 树形默认是否全部展开(默认 true) */
  defaultExpanded?: boolean;
```
函数解构参数删除 `getSubRows,` 与 `defaultExpanded = true,`。

- [ ] **Step 3: 删除 expanded 状态**

删除：
```ts
  const [expanded, setExpanded] = React.useState<ExpandedState>(
    getSubRows && defaultExpanded ? true : {}
  );
```

- [ ] **Step 4: 清理 useReactTable 配置**

删除这三行：
```ts
    getSubRows: getSubRows as ((row: TData, index: number) => TData[] | undefined) | undefined,
    getExpandedRowModel: getSubRows ? getExpandedRowModel() : undefined,
    onExpandedChange: setExpanded,
```
删除 state 中的：
```ts
      ...(getSubRows && { expanded }),
```

- [ ] **Step 5: body 单元格回退为纯 flexRender**

将现有：
```tsx
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <TableCell key={cell.id} className="px-4 py-3">
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
替换为：
```tsx
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
```

- [ ] **Step 6: 类型检查**

Run: `cd mes/frontend && pnpm --filter @workspace/ui check-types`
Expected: EXIT 0（无 `ExpandedState`/`getExpandedRowModel`/`getSubRows`/`expanded` 残留引用报错）。

---

## Task 4: 迁移 `MenuList` 到 `TreeDataTable`

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/system/menu/MenuList.tsx`

- [ ] **Step 1: 改 import**

将 `@workspace/ui` 导入里的 `DataTable,` 改为 `TreeDataTable,`。

- [ ] **Step 2: 改 JSX 标签**

将：
```tsx
      <DataTable
        columns={columns}
        data={treeData}
        loading={loading}
        loadingRowCount={8}
        getSubRows={(row) => row.children}
      />
```
改为：
```tsx
      <TreeDataTable
        columns={columns}
        data={treeData}
        loading={loading}
        loadingRowCount={8}
        getSubRows={(row) => row.children}
      />
```

---

## Task 5: 迁移 `DeptList` 到 `TreeDataTable`

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/system/dept/DeptList.tsx`

- [ ] **Step 1: 改 import**

将 `@workspace/ui` 导入里的 `DataTable,` 改为 `TreeDataTable,`。

- [ ] **Step 2: 改 JSX 标签**

将：
```tsx
      <DataTable
        columns={columns}
        data={treeData}
        loading={loading}
        loadingRowCount={6}
        getSubRows={(row) => row.children}
      />
```
改为：
```tsx
      <TreeDataTable
        columns={columns}
        data={treeData}
        loading={loading}
        loadingRowCount={6}
        getSubRows={(row) => row.children}
      />
```

---

## Task 6: 整体验证

- [ ] **Step 1: ui 类型检查**

Run: `cd mes/frontend && pnpm --filter @workspace/ui check-types`
Expected: EXIT 0

- [ ] **Step 2: mes-new 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit`
Expected: EXIT 0

- [ ] **Step 3: lint**

Run: `cd mes/frontend && pnpm --filter mes-new lint`
Expected: 0 errors（允许既有 9 个 warning，不得新增 error）

- [ ] **Step 4: build**

Run: `cd mes/frontend && pnpm --filter mes-new build`
Expected: EXIT 0，`✓ built`，dist 产物生成

- [ ] **Step 5: 提交**

按逻辑分组提交（emoji + 中文）：
- `✨ feat(ui): 新增 TreeDataTable 树形表格组件(展开/收缩动画 + 缩进引导线 + 展开折叠全部)`
- `♻️ refactor(ui): DataTable 移除树形死代码(树形渲染迁出至 TreeDataTable)`
- `💄 style(mes-new): 菜单/部门列表改用 TreeDataTable`

---

## Self-Review（计划自检）

- **Spec 覆盖**：§3 组件设计→Task1；barrel→Task2；§4 DataTable 瘦身→Task3；Menu/Dept 迁移→Task4/5；§6 验证→Task6。全覆盖。
- **占位符扫描**：无 TBD/TODO，组件为完整可运行代码。
- **类型一致**：`TreeDataTableProps` 与组件签名一致；`getSubRows=(row)=>row.children` 在两页与组件 prop 类型一致（节点均有 `children`/`id`）。
- **行为保留**：默认全展开（`collapsedIds` 空集）；列定义/删除逻辑/数据流不动；`DataTable` 仅删树形、保留分页/搜索/选择/MasterDetail。
