import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, DataTable, Input, Label, cn } from '@workspace/ui'
import { ClipboardList, PackageOpen } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import RelatedPanel from '@/components/RelatedPanel'
import ReceiptItemsPanel from './ReceiptItemsPanel'
import { useQuery$ } from '@/http/hooks'
import { pageReceipts } from '@/api/inventory/receipt'
import { receiptStatusMeta, progressText } from '../inventoryStatus'
import type { ReceiptPageParams, SpWarehouseReceipt } from '@/types/inventory'

const PAGE_SIZE = 10

export default function ReceiptList() {
  const [params, setParams] = useState<ReceiptPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [selected, setSelected] = useState<SpWarehouseReceipt | null>(null)

  const { data, loading } = useQuery$(['inventory', 'receipt', 'page', params], () => pageReceipts(params))

  const onSearch = () => { setSelected(null); setParams({ current: 1, size: PAGE_SIZE, receiptCode: draftCode || undefined }) }
  const onReset = () => { setDraftCode(''); setSelected(null); setParams({ current: 1, size: PAGE_SIZE }) }

  const columns = useMemo<ColumnDef<SpWarehouseReceipt>[]>(() => [
    { accessorKey: 'receiptCode', header: '入库单号' },
    { accessorKey: 'sourceType', header: '来源', cell: ({ row }) => row.original.sourceType || '—' },
    { accessorKey: 'productDesc', header: '产品', cell: ({ row }) => row.original.productDesc || '—' },
    {
      id: 'status', header: '状态',
      cell: ({ row }) => {
        const m = receiptStatusMeta(row.original.receiptStatus)
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
    <PageContainer title="计划入库确认" description="对计划入库单逐条登账,分配库房库位并生成库存">
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-rc-code">入库单号</Label>
          <Input id="s-rc-code" className="h-9 w-48" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
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
            <ReceiptItemsPanel receipt={selected} />
          ) : (
            <RelatedPanel icon={ClipboardList} title="入库明细" empty emptyIcon={PackageOpen} emptyText="请选择左侧入库单查看明细" />
          )
        }
      />
    </PageContainer>
  )
}
