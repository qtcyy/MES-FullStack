# 列表表格视觉重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把全站列表表格重做成「A 骨架 + B 表头(灰线)」统一皮肤——改动落在共享 `DataTable` 组件,10 个列表页删除多余包裹层,一次性升级,零业务逻辑改动。

**Architecture:** 卡片外观(边框/圆角/阴影)+ 分页条下沉进 `data-table.tsx` 内部;表头实填充 + 2px 灰底线、行舒适 + 柔分隔线 + 整行悬浮、中文数字分页器、空状态 Inbox 图标。各列表页删除 `<div className="rounded-lg border border-border bg-card p-2">` 包裹层,直接渲染 `<DataTable />`。全程用主题令牌(`bg-muted`/`border-border`/`bg-primary` 等),暗色模式自动适配。`table.tsx` 原语不动,靠 className 覆盖。

**Tech Stack:** React 19 + TypeScript + Vite + shadcn/Radix (`@workspace/ui`) + Tailwind 4 + TanStack Table；pnpm workspace；`@workspace/ui` 以源码 `.tsx` 直出被 `mes-new` 消费。

**参考 spec：** `docs/superpowers/specs/2026-06-16-table-redesign-design.md`

**验证命令(统一在 `mes/frontend/` 下执行):**
- UI 包类型检查：`pnpm --filter @workspace/ui exec tsc --noEmit`
- 应用类型检查：`pnpm --filter mes-new exec tsc --noEmit`
- Lint：`pnpm --filter mes-new lint`
- 构建：`pnpm --filter mes-new build`

---

## File Structure

| 文件 | 责任 | 动作 |
| --- | --- | --- |
| `packages/ui/src/components/data-table.tsx` | 卡片容器 + 表头/行样式 + 中文数字分页器 + 空状态 | 改(整文件替换) |
| `apps/mes-new/src/pages/system/user/UserList.tsx` | 用户列表 | 删包裹层 |
| `apps/mes-new/src/pages/system/menu/MenuList.tsx` | 菜单列表(树形,仅外观) | 删包裹层 |
| `apps/mes-new/src/pages/system/role/RoleList.tsx` | 角色列表 | 删包裹层 |
| `apps/mes-new/src/pages/system/dept/DeptList.tsx` | 部门列表(树形,仅外观) | 删包裹层 |
| `apps/mes-new/src/pages/system/dict/DictList.tsx` | 字典列表 | 删包裹层 |
| `apps/mes-new/src/pages/basedata/materile/MaterileList.tsx` | 物料列表 | 删包裹层 |
| `apps/mes-new/src/pages/basedata/component/ComponentList.tsx` | 构件列表 | 删包裹层 |
| `apps/mes-new/src/pages/basedata/process-unit/ProcessUnitList.tsx` | 工艺单元(MasterDetail) | 删包裹层 |
| `apps/mes-new/src/pages/basedata/warehouse/WarehouseList.tsx` | 仓库(MasterDetail) | 删包裹层 |
| `apps/mes-new/src/pages/basedata/device-group/DeviceGroupList.tsx` | 设备组(MasterDetail) | 删包裹层 |

所有路径相对 `mes/frontend/`。

---

## Task 0：提交设计稿 + 计划文档

**Files:** 无代码改动(仅提交文档)

- [ ] **Step 1：提交 spec + plan**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add docs/superpowers/specs/2026-06-16-table-redesign-design.md docs/superpowers/plans/2026-06-16-table-redesign.md
git commit -m "📝 docs(mes-new): 新增列表表格视觉重设计 spec + 实现计划"
```

---

## Task 1：重做共享 DataTable(核心)

**Files:**
- Modify(整文件替换): `packages/ui/src/components/data-table.tsx`

- [ ] **Step 1：用以下内容整体替换 `packages/ui/src/components/data-table.tsx`**

```tsx
"use client";

import * as React from "react";
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
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  InboxIcon,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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

interface ServerPaginationConfig {
  mode: "server";
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  totalRows?: number;
  onPageChange: (pageIndex: number) => void;
}

// 计算页码按钮序列:总页数 <= 7 全平铺;否则首页/末页/当前±1,其间以 "ellipsis" 折叠
function getPageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: Math.max(total, 1) }, (_, i) => i + 1);
  }
  const items: (number | "ellipsis")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) items.push("ellipsis");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < total - 1) items.push("ellipsis");
  items.push(total);
  return items;
}

interface DataTableProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  loadingRowCount?: number;
  pageSize?: number;
  pagination?: ServerPaginationConfig;
  enableRowSelection?: boolean;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (rowSelection: Record<string, boolean>) => void;
  /** 提供则启用树形展开:返回该行子行数组 */
  getSubRows?: (row: TData) => TData[] | undefined;
  /** 树形默认是否全部展开(默认 true) */
  defaultExpanded?: boolean;
  /** 行点击回调(传入原始行数据) */
  onRowClick?: (row: TData) => void;
  /** 返回追加到该行 <TableRow> 的 className(用于选中高亮) */
  rowClassName?: (row: TData) => string;
}

function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Filter...",
  loading = false,
  loadingRowCount = 5,
  pageSize = 10,
  pagination,
  enableRowSelection = false,
  rowSelection: externalRowSelection,
  onRowSelectionChange: externalOnRowSelectionChange,
  getSubRows,
  defaultExpanded = true,
  onRowClick,
  rowClassName,
  className,
  ...props
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] =
    React.useState<RowSelectionState>({});
  const [expanded, setExpanded] = React.useState<ExpandedState>(
    getSubRows && defaultExpanded ? true : {}
  );

  // 使用外部控制的 rowSelection 或内部状态
  const rowSelection = externalRowSelection ?? internalRowSelection;
  // 将 TanStack 的 Updater(值或 (old)=>new)解析为具体值后再分发,
  // 保持对外 onRowSelectionChange 仅暴露普通对象的公开 API
  const setRowSelection: OnChangeFn<RowSelectionState> = (updaterOrValue) => {
    const next =
      typeof updaterOrValue === "function"
        ? updaterOrValue(rowSelection)
        : updaterOrValue;
    if (externalOnRowSelectionChange) {
      externalOnRowSelectionChange(next);
    } else {
      setInternalRowSelection(next);
    }
  };

  const isServerPagination = pagination?.mode === "server";

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSubRows: getSubRows as ((row: TData, index: number) => TData[] | undefined) | undefined,
    getExpandedRowModel: getSubRows ? getExpandedRowModel() : undefined,
    onExpandedChange: setExpanded,
    getPaginationRowModel: isServerPagination
      ? undefined
      : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableRowSelection,
    manualPagination: isServerPagination,
    pageCount: isServerPagination ? pagination.totalPages : undefined,
    initialState: {
      pagination: {
        pageSize: isServerPagination ? pagination.pageSize : pageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(getSubRows && { expanded }),
      ...(isServerPagination && {
        pagination: {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        },
      }),
    },
  });

  return (
    <div className={cn("w-full", className)} {...props}>
      {searchKey && (
        <div className="flex items-center py-4">
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
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
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    "border-border/60",
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row.original)
                  )}
                >
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
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
                    <InboxIcon className="size-8 opacity-60" />
                    <span className="text-sm">暂无数据</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {(pagination || enableRowSelection) && (
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <div className="text-sm text-muted-foreground">
              {isServerPagination ? (
                pagination.totalRows != null ? (
                  <span>
                    共 {pagination.totalRows} 条 · 每页 {pagination.pageSize} 条
                  </span>
                ) : (
                  <span>
                    第 {pagination.pageIndex + 1} / {pagination.totalPages} 页
                  </span>
                )
              ) : (
                <span>
                  已选 {table.getFilteredSelectedRowModel().rows.length} /{" "}
                  {table.getFilteredRowModel().rows.length} 行
                </span>
              )}
            </div>

            {isServerPagination ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="上一页"
                  disabled={pagination.pageIndex === 0}
                  onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
                {getPageItems(
                  pagination.pageIndex + 1,
                  pagination.totalPages
                ).map((item, i) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="px-1.5 text-sm text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => pagination.onPageChange(item - 1)}
                      className={cn(
                        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors",
                        item === pagination.pageIndex + 1
                          ? "bg-primary font-medium text-primary-foreground"
                          : "border border-border bg-card text-foreground hover:bg-muted"
                      )}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  type="button"
                  aria-label="下一页"
                  disabled={pagination.pageIndex >= pagination.totalPages - 1}
                  onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  下一页
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: import("@tanstack/react-table").Column<TData, TValue>;
  title: string;
}

function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>{title}</span>
        {column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : (
          <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export { DataTable, DataTableColumnHeader };
export type { DataTableProps, ServerPaginationConfig };
```

**变更摘要(相对原文件):**
1. 新增导入 `ChevronLeftIcon`、`InboxIcon`;新增 `getPageItems()` 页码序列辅助函数。
2. 容器 `rounded-md border` → `overflow-hidden rounded-xl border border-border bg-card shadow-sm`。
3. 表头 `TableHead` 加 `border-b-2 border-border bg-muted px-4 py-3 text-xs font-medium text-muted-foreground`。
4. 数据行单元格加 `px-4 py-3`;数据行加 `border-border/60` 柔分隔线;骨架行单元格加 `px-4 py-3`、`Skeleton` 高度 `h-6`→`h-5`。
5. 空状态 `No results.` → 居中 `InboxIcon` + 「暂无数据」(行加 `hover:bg-transparent`)。
6. 分页条移入卡片内,加 `border-t border-border px-4 py-3`;文案全中文(`共 N 条 · 每页 M 条` / `第 X / Y 页` / `已选 n / m 行`);server 模式用数字页码器(`‹` `›` + 页码 + `…`,当前页 `bg-primary text-primary-foreground`,首末页禁用);非 server 模式 `Previous/Next` → `上一页/下一页`。
7. 树形展开按钮、排序逻辑、TanStack 配置**完全不动**。

- [ ] **Step 2：UI 包类型检查**

Run: `cd mes/frontend && pnpm --filter @workspace/ui exec tsc --noEmit`
Expected: PASS(无错误输出)

- [ ] **Step 3：提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/packages/ui/src/components/data-table.tsx
git commit -m "💄 style(ui): DataTable 重做表头/行/分页皮肤(卡片下沉+中文数字分页器+空状态)"
```

---

## Task 2：系统管理 5 页去包裹层

**Files(均 Modify):**
- `apps/mes-new/src/pages/system/user/UserList.tsx`
- `apps/mes-new/src/pages/system/role/RoleList.tsx`
- `apps/mes-new/src/pages/system/dict/DictList.tsx`
- `apps/mes-new/src/pages/system/menu/MenuList.tsx`
- `apps/mes-new/src/pages/system/dept/DeptList.tsx`

> 统一手法:删除 `<div className="rounded-lg border border-border bg-card p-2">` 与其匹配 `</div>`,把内部 `<DataTable .../>` 向左 dedent 2 空格。

- [ ] **Step 1：UserList / RoleList / DictList(三者 DataTable 块完全相同)**

把(以 `UserList.tsx` 为例,RoleList、DictList 同样)这段:

```tsx
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
```

替换为:

```tsx
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
```

- [ ] **Step 2：MenuList(树形)**

把这段:

```tsx
      <div className="rounded-lg border border-border bg-card p-2">
        <DataTable
          columns={columns}
          data={treeData}
          loading={loading}
          loadingRowCount={8}
          getSubRows={(row) => row.children}
        />
      </div>
```

替换为:

```tsx
      <DataTable
        columns={columns}
        data={treeData}
        loading={loading}
        loadingRowCount={8}
        getSubRows={(row) => row.children}
      />
```

- [ ] **Step 3：DeptList(树形)**

把这段:

```tsx
      <div className="rounded-lg border border-border bg-card p-2">
        <DataTable
          columns={columns}
          data={treeData}
          loading={loading}
          loadingRowCount={6}
          getSubRows={(row) => row.children}
        />
      </div>
```

替换为:

```tsx
      <DataTable
        columns={columns}
        data={treeData}
        loading={loading}
        loadingRowCount={6}
        getSubRows={(row) => row.children}
      />
```

- [ ] **Step 4：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 5：提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/system/user/UserList.tsx \
        mes/frontend/apps/mes-new/src/pages/system/role/RoleList.tsx \
        mes/frontend/apps/mes-new/src/pages/system/dict/DictList.tsx \
        mes/frontend/apps/mes-new/src/pages/system/menu/MenuList.tsx \
        mes/frontend/apps/mes-new/src/pages/system/dept/DeptList.tsx
git commit -m "💄 style(mes-new): 系统管理5页列表去多余包裹层(交由 DataTable 统一卡片)"
```

---

## Task 3：主数据简单 2 页去包裹层

**Files(均 Modify):**
- `apps/mes-new/src/pages/basedata/materile/MaterileList.tsx`
- `apps/mes-new/src/pages/basedata/component/ComponentList.tsx`

- [ ] **Step 1：MaterileList / ComponentList(两者 DataTable 块相同)**

把(以 `MaterileList.tsx` 为例,ComponentList 同样)这段:

```tsx
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
```

替换为:

```tsx
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
```

- [ ] **Step 2：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3：提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/basedata/materile/MaterileList.tsx \
        mes/frontend/apps/mes-new/src/pages/basedata/component/ComponentList.tsx
git commit -m "💄 style(mes-new): 物料/构件列表去多余包裹层"
```

---

## Task 4：主数据 MasterDetail 3 页去包裹层

**Files(均 Modify):**
- `apps/mes-new/src/pages/basedata/process-unit/ProcessUnitList.tsx`
- `apps/mes-new/src/pages/basedata/warehouse/WarehouseList.tsx`
- `apps/mes-new/src/pages/basedata/device-group/DeviceGroupList.tsx`

> 这三页 DataTable 在 `master={...}` 槽内,带 `onRowClick` + `rowClassName`(选中行 `bg-accent`)。删包裹层后 DataTable dedent 2 空格,直接作为 `master` 的子节点。三者 DataTable 块完全相同。

- [ ] **Step 1：三页(以 `ProcessUnitList.tsx` 为例,Warehouse、DeviceGroup 同样)**

把这段:

```tsx
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
```

替换为:

```tsx
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
```

- [ ] **Step 2：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3：提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/basedata/process-unit/ProcessUnitList.tsx \
        mes/frontend/apps/mes-new/src/pages/basedata/warehouse/WarehouseList.tsx \
        mes/frontend/apps/mes-new/src/pages/basedata/device-group/DeviceGroupList.tsx
git commit -m "💄 style(mes-new): 工艺单元/仓库/设备组列表去多余包裹层(MasterDetail)"
```

---

## Task 5：全量验证 + 人工核对

**Files:** 无(仅验证)

- [ ] **Step 1：UI 包类型检查** — Run: `cd mes/frontend && pnpm --filter @workspace/ui exec tsc --noEmit` → Expected: PASS
- [ ] **Step 2：应用类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 3：Lint** — Run: `cd mes/frontend && pnpm --filter mes-new lint` → Expected: PASS(无未使用变量等报错)
- [ ] **Step 4：构建** — Run: `cd mes/frontend && pnpm --filter mes-new build` → Expected: 构建成功(`tsc -b && vite build` 通过,产出 dist)
- [ ] **Step 5：dev 人工核对**(`cd mes/frontend && pnpm --filter mes-new dev`,浏览器 http://localhost:4100)

逐页核对清单:
- [ ] 单层圆角边框卡片,**无双层边框**
- [ ] 表头实填充底色 + 2px 灰加粗底边线,层次清晰
- [ ] 行距舒适、横向细分隔线、整行悬浮变浅
- [ ] 分页:左「共 N 条 · 每页 M 条」、右数字页码器(当前页主色高亮、‹ › 箭头、… 省略、首末页禁用),全中文
- [ ] 空数据页:居中 Inbox 图标 + 「暂无数据」
- [ ] 菜单管理:套上新外观,且树形展开/折叠/缩进**行为不变**
- [ ] 工艺单元/仓库/设备组(MasterDetail):表格仍正确居于左栏,点击选中行高亮(bg-accent)正常
- [ ] 明/暗主题切换,表格/表头/分页/空状态均正常
- [ ] 加载骨架屏正常

- [ ] **Step 6:(若 Step 3/4 触发额外修复)** 按文件 `git add` + `git commit -m "🐛 fix(mes-new): 修复表格重构遗留的 <具体问题>"`。

---

## Self-Review(计划自检)

- **Spec coverage**:spec §3 架构(卡片下沉 + 去包裹)→ Task 1 + Task 2/3/4;§4 视觉规格(容器/表头/行/分页/空状态/选中/加载)→ Task 1 全覆盖;§5 文件清单 11 文件 → Task 1(1)+ Task 2(5)+ Task 3(2)+ Task 4(3)= 11,一一对应;§6 范围(菜单仅外观)→ Task 2 Step 2 仅去包裹、不动 `getSubRows`;§7 验证 → Task 5。无遗漏。
- **Placeholder scan**:无 TBD/TODO;Task 1 给出完整文件;Task 2/3/4 给出确切 before/after;命令与预期明确。
- **Type consistency**:`getPageItems(current, total)` 在 Task 1 定义并在同文件分页器调用;`ServerPaginationConfig` 字段(`pageIndex/pageSize/totalPages/totalRows/onPageChange`)与各页传参一致;新增导入 `ChevronLeftIcon/InboxIcon` 均来自 lucide-react;`DataTableProps`/导出签名保持不变,10 个调用页无需改 props,仅去包裹。
