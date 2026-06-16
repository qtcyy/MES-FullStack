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
