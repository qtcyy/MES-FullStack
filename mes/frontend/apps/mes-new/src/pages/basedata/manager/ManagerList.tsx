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
