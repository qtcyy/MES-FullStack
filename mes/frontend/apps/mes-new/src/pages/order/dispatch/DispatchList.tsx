import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Button, DataTable, Input, Label } from '@workspace/ui'
import { Send } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import DispatchDialog from './DispatchDialog'
import { useQuery$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { dispatchPage, type DispatchPageParams } from '@/api/order/dispatch'
import type { DispatchableOrder } from '@/types/order'

const PAGE_SIZE = 10
const ORDER_TYPE_LABEL: Record<string, string> = { P: '批量', A: '验证', F: '返工' }

export default function DispatchList() {
  const [params, setParams] = useState<DispatchPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, loading } = useQuery$(['dispatch', 'page', params], () => dispatchPage(params))

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k])

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, orderCode: draftCode || undefined })
  const onReset = () => { setDraftCode(''); setParams({ current: 1, size: PAGE_SIZE }) }

  const onAssigned = () => {
    setRowSelection({})
    invalidate('["dispatch","page"')
  }

  const columns = useMemo<ColumnDef<DispatchableOrder>[]>(
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
    ],
    [],
  )

  return (
    <PageContainer
      title="作业派工"
      description="选择待派工工单,批量分配班组与作业员"
      actions={
        <PermissionGuard perm="order:dispatch">
          <Button disabled={selectedIds.length === 0} onClick={() => setDialogOpen(true)}>
            <Send className="size-4" />
            批量派工{selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-d-code">工单编号</Label>
          <Input id="s-d-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
      </SearchForm>

      <DataTable
        columns={columns}
        data={data?.records ?? []}
        loading={loading}
        loadingRowCount={PAGE_SIZE}
        enableRowSelection
        getRowId={(row) => row.id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        pagination={{
          mode: 'server',
          pageIndex: (data?.current ?? params.current) - 1,
          pageSize: PAGE_SIZE,
          totalPages: data?.pages ?? 1,
          totalRows: data?.total,
          onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
        }}
      />

      <DispatchDialog open={dialogOpen} onOpenChange={setDialogOpen} orderIds={selectedIds} onAssigned={onAssigned} />
    </PageContainer>
  )
}
