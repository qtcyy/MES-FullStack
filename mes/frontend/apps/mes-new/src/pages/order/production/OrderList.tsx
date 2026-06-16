import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Badge, Button, DataTable, Input, Label, toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import OrderForm from './OrderForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { orderPage, orderDelete, type OrderPageParams } from '@/api/order/order'
import type { SpOrder } from '@/types/order'

const PAGE_SIZE = 10
const ORDER_TYPE_LABEL: Record<string, string> = { P: '批量', A: '验证', F: '返工' }
const STATUE_LABEL: Record<number, string> = { 0: '待派工', 1: '已派工', 2: '进行中', 3: '已结束', 4: '已终结' }

export default function OrderList() {
  const [params, setParams] = useState<OrderPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftMat, setDraftMat] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpOrder | null>(null)
  const [deleting, setDeleting] = useState<SpOrder | null>(null)

  const { data, loading } = useQuery$(['order', 'page', params], () => orderPage(params))
  const { mutate: removeOrder } = useMutation$((id: string) => orderDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, orderCodeLike: draftCode || undefined, materielLike: draftMat || undefined })
  const onReset = () => {
    setDraftCode(''); setDraftMat(''); setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeOrder(deleting.id)
      toast.success('删除成功')
      invalidate('["order","page"')
    } catch { /* toast */ } finally { setDeleting(null) }
  }

  const columns = useMemo<ColumnDef<SpOrder>[]>(
    () => [
      { accessorKey: 'orderCode', header: '工单编号' },
      { accessorKey: 'materiel', header: '物料', cell: ({ row }) => row.original.materiel || '—' },
      { accessorKey: 'materielDesc', header: '物料描述', cell: ({ row }) => row.original.materielDesc || '—' },
      { accessorKey: 'qty', header: '数量', cell: ({ row }) => row.original.qty ?? '—' },
      {
        accessorKey: 'orderType', header: '类型',
        cell: ({ row }) => <Badge variant="secondary">{ORDER_TYPE_LABEL[row.original.orderType ?? ''] ?? '—'}</Badge>,
      },
      { accessorKey: 'planStartTime', header: '计划开始', cell: ({ row }) => row.original.planStartTime || '—' },
      { accessorKey: 'planEndTime', header: '计划结束', cell: ({ row }) => row.original.planEndTime || '—' },
      {
        accessorKey: 'statue', header: '状态',
        cell: ({ row }) => {
          const s = row.original.statue ?? 0
          return <Badge variant={s === 0 ? 'default' : 'secondary'}>{STATUE_LABEL[s] ?? s}</Badge>
        },
      },
      {
        id: 'actions', header: '操作',
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
      title="生产订单"
      description="维护生产工单并下达"
      actions={
        <PermissionGuard perm="order:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建订单
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-o-code">工单编号</Label>
          <Input id="s-o-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-o-mat">物料</Label>
          <Input id="s-o-mat" className="h-9 w-44" value={draftMat} onChange={(e) => setDraftMat(e.target.value)} />
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

      <OrderForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除工单「{deleting?.orderCode}」吗?</AlertDialogDescription>
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
