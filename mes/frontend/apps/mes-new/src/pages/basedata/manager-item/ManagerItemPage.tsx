import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import PageContainer from '@/components/PageContainer'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import SearchForm from '@/components/SearchForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { managerPage, managerItems, type ManagerPageParams } from '@/api/basedata/manager'
import { commonPage, commonDelete, type DynamicRow } from '@/api/basedata/managerItem'
import type { SpTableManager } from '@/types/manager'
import { buildColumnMetas } from './managerItemUtils'
import ManagerItemForm from './ManagerItemForm'

const TABLE_PAGE_SIZE = 10
const DATA_PAGE_SIZE = 10

export default function ManagerItemPage() {
  // 左:表列表
  const [tableParams, setTableParams] = useState<ManagerPageParams>({ current: 1, size: TABLE_PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  // 选中表 + 右侧数据分页
  const [selected, setSelected] = useState<SpTableManager | null>(null)
  const [dataParams, setDataParams] = useState({ current: 1, size: DATA_PAGE_SIZE })
  // 表单 / 删除
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DynamicRow | null>(null)
  const [deleting, setDeleting] = useState<DynamicRow | null>(null)

  const { data: tableList, loading: tableLoading } = useQuery$(
    ['basedata', 'manager', 'page', tableParams],
    () => managerPage(tableParams),
  )
  const { data: itemsData, loading: metaLoading } = useQuery$(
    ['basedata', 'common', 'items', selected?.id],
    () => managerItems(selected!.id),
    { enabled: !!selected },
  )
  const columnMetas = useMemo(() => buildColumnMetas(itemsData ?? []), [itemsData])
  const { data: pageData, loading: dataLoading } = useQuery$(
    ['basedata', 'common', 'page', selected?.id, dataParams],
    () => commonPage({ tableName: selected!.tableName, tableNameId: selected!.id, ...dataParams }),
    { enabled: !!selected },
  )
  const { mutate: removeRow } = useMutation$(
    (p: { tableName: string; tableNameId: string; id: string }) => commonDelete(p),
  )

  const onSearch = () =>
    setTableParams({
      current: 1,
      size: TABLE_PAGE_SIZE,
      tableName: draftName || undefined,
      tableDesc: draftDesc || undefined,
    })
  const onReset = () => {
    setDraftName('')
    setDraftDesc('')
    setTableParams({ current: 1, size: TABLE_PAGE_SIZE })
  }

  const selectTable = (row: SpTableManager) => {
    setSelected(row)
    setDataParams({ current: 1, size: DATA_PAGE_SIZE })
    // 切表即清瞬态表单态,避免遗留上一张表的编辑上下文
    setFormOpen(false)
    setEditing(null)
    setDeleting(null)
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting || !selected) return
    try {
      await removeRow({ tableName: selected.tableName, tableNameId: selected.id, id: deleting.id })
      toast.success('删除成功')
      invalidate('["basedata","common","page"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const tableColumns = useMemo<ColumnDef<SpTableManager>[]>(
    () => [
      { accessorKey: 'tableName', header: '表名' },
      { accessorKey: 'tableDesc', header: '表描述' },
    ],
    [],
  )

  const dataColumns = useMemo<ColumnDef<DynamicRow>[]>(() => {
    const metaCols: ColumnDef<DynamicRow>[] = columnMetas.map((c) => ({
      accessorKey: c.field,
      header: c.fieldDesc,
    }))
    return [
      ...metaCols,
      {
        id: '__actions__',
        header: '操作',
        cell: ({ row }) => (
          <PermissionGuard perm="manager:add">
            <div className="flex gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  setEditing(row.original)
                  setFormOpen(true)
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setDeleting(row.original)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </PermissionGuard>
        ),
      },
    ]
  }, [columnMetas])

  return (
    <PermissionGuard perm="manager:add">
      <PageContainer title="基础数据维护" description="选择左侧动态表,维护其数据行">
        <MasterDetailLayout
          master={
            <div className="space-y-3">
              <SearchForm onSearch={onSearch} onReset={onReset}>
                <div className="space-y-1.5">
                  <Label htmlFor="mi-s-name">表名</Label>
                  <Input
                    id="mi-s-name"
                    className="h-9 w-44"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mi-s-desc">表描述</Label>
                  <Input
                    id="mi-s-desc"
                    className="h-9 w-44"
                    value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                  />
                </div>
              </SearchForm>
              <DataTable
                columns={tableColumns}
                data={tableList?.records ?? []}
                loading={tableLoading}
                loadingRowCount={TABLE_PAGE_SIZE}
                getRowId={(r) => r.id}
                onRowClick={(r) => selectTable(r)}
                rowClassName={(r) => (r.id === selected?.id ? 'bg-accent' : '')}
                pagination={{
                  mode: 'server',
                  pageIndex: (tableList?.current ?? tableParams.current) - 1,
                  pageSize: TABLE_PAGE_SIZE,
                  totalPages: tableList?.pages ?? 1,
                  totalRows: tableList?.total,
                  onPageChange: (idx) => setTableParams((p) => ({ ...p, current: idx + 1 })),
                }}
              />
            </div>
          }
          detail={
            !selected ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">请选择左侧的动态表以维护其数据</p>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {selected.tableDesc || selected.tableName} 数据
                  </div>
                  <PermissionGuard perm="manager:add">
                    <Button
                      size="sm"
                      onClick={openCreate}
                      disabled={metaLoading || columnMetas.length === 0}
                    >
                      <Plus className="size-4" />
                      新增
                    </Button>
                  </PermissionGuard>
                </div>
                <DataTable
                  columns={dataColumns}
                  data={pageData?.records ?? []}
                  loading={dataLoading}
                  loadingRowCount={DATA_PAGE_SIZE}
                  getRowId={(r) => r.id}
                  pagination={{
                    mode: 'server',
                    pageIndex: (pageData?.current ?? dataParams.current) - 1,
                    pageSize: DATA_PAGE_SIZE,
                    totalPages: pageData?.pages ?? 1,
                    totalRows: pageData?.total,
                    onPageChange: (idx) => setDataParams((p) => ({ ...p, current: idx + 1 })),
                  }}
                />
              </div>
            )
          }
        />

        {selected && (
          <ManagerItemForm
            open={formOpen}
            onOpenChange={setFormOpen}
            tableName={selected.tableName}
            tableNameId={selected.id}
            items={itemsData ?? []}
            record={editing}
          />
        )}

        <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定删除
                {deleting && columnMetas[0]
                  ? `「${deleting[columnMetas[0].field] ?? ''}」`
                  : '这条数据'}
                吗?此操作为物理删除,不可恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </PermissionGuard>
  )
}
