"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
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
  className,
  ...props
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] = React.useState({});

  // 使用外部控制的 rowSelection 或内部状态
  const rowSelection = externalRowSelection ?? internalRowSelection;
  const setRowSelection =
    externalOnRowSelectionChange ?? setInternalRowSelection;

  const isServerPagination = pagination?.mode === "server";

  const table = useReactTable({
    data,
    columns,
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
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
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
