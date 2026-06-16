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
import OperForm from './OperForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { operPage, operDelete, type OperPageParams } from '@/api/basedata/oper'
import type { SpOper } from '@/types/technology'

const PAGE_SIZE = 10

export default function OperList() {
  const [params, setParams] = useState<OperPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftDesc, setDraftDesc] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpOper | null>(null)
  const [deleting, setDeleting] = useState<SpOper | null>(null)

  const { data, loading } = useQuery$(['oper', 'page', params], () => operPage(params))
  const { mutate: removeOper } = useMutation$((id: string) => operDelete(id))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, operDescLike: draftDesc || undefined })
  const onReset = () => {
    setDraftDesc('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeOper(deleting.id)
      toast.success('删除成功')
      invalidate('["oper","page"')
    } catch {
      /* toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpOper>[]>(
    () => [
      { accessorKey: 'operCode', header: '工序编号', cell: ({ row }) => row.original.operCode || '—' },
      { accessorKey: 'operDesc', header: '工序描述' },
      { accessorKey: 'laborHours', header: '工时(分钟)', cell: ({ row }) => row.original.laborHours ?? '—' },
      { accessorKey: 'manufacturingCycle', header: '制造周期(分钟)', cell: ({ row }) => row.original.manufacturingCycle ?? '—' },
      {
        accessorKey: 'generatePlan',
        header: '生成计划',
        cell: ({ row }) =>
          row.original.generatePlan === '1' ? <Badge>是</Badge> : <Badge variant="secondary">否</Badge>,
      },
      {
        accessorKey: 'remark',
        header: '备注',
        cell: ({ row }) => <span className="block max-w-[16rem] truncate text-muted-foreground">{row.original.remark || '—'}</span>,
      },
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
      title="工序管理"
      description="维护工序基础数据及工时 / 制造周期"
      actions={
        <PermissionGuard perm="oper:list">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建工序
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-oper-desc">工序描述</Label>
          <Input id="s-oper-desc" className="h-9 w-56" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
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

      <OperForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除工序「{deleting?.operDesc}」吗?</AlertDialogDescription>
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
