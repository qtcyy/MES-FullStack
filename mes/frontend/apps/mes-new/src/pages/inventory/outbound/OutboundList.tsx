import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, DataTable, Input, Label, cn } from '@workspace/ui'
import { ClipboardList, PackageOpen } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import RelatedPanel from '@/components/RelatedPanel'
import OutboundItemsPanel from './OutboundItemsPanel'
import { useQuery$ } from '@/http/hooks'
import { pageOutbounds } from '@/api/inventory/outbound'
import { outboundStatusMeta, progressText } from '../inventoryStatus'
import type { OutboundPageParams, SpOutboundOrder } from '@/types/inventory'

const PAGE_SIZE = 10

export default function OutboundList() {
  const [params, setParams] = useState<OutboundPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [selected, setSelected] = useState<SpOutboundOrder | null>(null)

  const { data, loading } = useQuery$(['inventory', 'outbound', 'page', params], () => pageOutbounds(params))

  const onSearch = () => { setSelected(null); setParams({ current: 1, size: PAGE_SIZE, outboundCode: draftCode || undefined }) }
  const onReset = () => { setSelected(null); setDraftCode(''); setParams({ current: 1, size: PAGE_SIZE }) }

  const columns = useMemo<ColumnDef<SpOutboundOrder>[]>(() => [
    { accessorKey: 'outboundCode', header: '出库单号' },
    { accessorKey: 'orderCode', header: '工单号', cell: ({ row }) => row.original.orderCode || '—' },
    { accessorKey: 'productDesc', header: '产品', cell: ({ row }) => row.original.productDesc || '—' },
    {
      id: 'status', header: '状态',
      cell: ({ row }) => {
        const m = outboundStatusMeta(row.original.outboundStatus)
        return <Badge className={cn(m.className)}>{m.label}</Badge>
      },
    },
    {
      id: 'progress', header: '进度',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{progressText(row.original.postedItems, row.original.totalItems)}</span>
      ),
    },
  ], [])

  return (
    <PageContainer title="配套出库确认" description="对生产配套出库单逐条登账,按 FIFO 自动扣减库存">
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-ob-code">出库单号</Label>
          <Input id="s-ob-code" className="h-9 w-48" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
      </SearchForm>

      <MasterDetailLayout
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
              onPageChange: (idx) => { setSelected(null); setParams((p) => ({ ...p, current: idx + 1 })) },
            }}
          />
        }
        detail={
          selected ? (
            <OutboundItemsPanel order={selected} />
          ) : (
            <RelatedPanel icon={ClipboardList} title="出库明细" empty emptyIcon={PackageOpen} emptyText="请选择左侧出库单查看明细" />
          )
        }
      />
    </PageContainer>
  )
}
