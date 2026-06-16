"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
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
import { Checkbox } from "@workspace/ui/components/checkbox";
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
  /** 行点击回调(传入原始行数据) */
  onRowClick?: (row: TData) => void;
  /** 返回追加到该行 <TableRow> 的 className(用于选中高亮) */
  rowClassName?: (row: TData) => string;
  /** 行稳定 id(用于跨页/按业务 id 选择)。默认 TanStack 用行下标 */
  getRowId?: (row: TData) => string;
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
  onRowClick,
  rowClassName,
  getRowId,
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

  // enableRowSelection 时自动注入选择列(复选框 + 表头全选);未开启则不改变既有列
  const tableColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!enableRowSelection) return columns;
    const selectionColumn: ColumnDef<TData, TValue> = {
      id: "__select__",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选本页"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="选择此行"
        />
      ),
      enableSorting: false,
    };
    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    getRowId: getRowId,
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
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
                  {tableColumns.map((_, colIndex) => (
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
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={tableColumns.length}
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
                      aria-current={item === pagination.pageIndex + 1 ? "page" : undefined}
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
