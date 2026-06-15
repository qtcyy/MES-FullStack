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
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
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
                    <TableCell key={colIndex}>
                      <Skeleton className="h-6 w-full" />
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
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row.original)
                  )}
                >
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {(pagination || enableRowSelection) && (
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {isServerPagination ? (
            <span>
              第 {pagination.pageIndex + 1} 页 / 共 {pagination.totalPages} 页
              {pagination.totalRows && ` (${pagination.totalRows} 条记录)`}
            </span>
          ) : (
            <span>
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </span>
          )}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (isServerPagination) {
                pagination.onPageChange(pagination.pageIndex - 1);
              } else {
                table.previousPage();
              }
            }}
            disabled={
              isServerPagination
                ? pagination.pageIndex === 0
                : !table.getCanPreviousPage()
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (isServerPagination) {
                pagination.onPageChange(pagination.pageIndex + 1);
              } else {
                table.nextPage();
              }
            }}
            disabled={
              isServerPagination
                ? pagination.pageIndex >= pagination.totalPages - 1
                : !table.getCanNextPage()
            }
          >
            Next
          </Button>
        </div>
      </div>
      )}
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
