import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, Input, Label } from '@workspace/ui'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import { useQuery$ } from '@/http/hooks'
import { pageInventory } from '@/api/inventory/stock'
import type { InventoryPageParams, SpInventory } from '@/types/inventory'

const PAGE_SIZE = 10

export default function InventoryQuery() {
  const [params, setParams] = useState<InventoryPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')

  const { data, loading } = useQuery$(['inventory', 'stock', 'page', params], () => pageInventory(params))

  const onSearch = () => setParams({
    current: 1, size: PAGE_SIZE,
    materialCode: draftCode || undefined,
    startDate: draftStart || undefined,
    endDate: draftEnd || undefined,
  })
  const onReset = () => {
    setDraftCode(''); setDraftStart(''); setDraftEnd('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const columns = useMemo<ColumnDef<SpInventory>[]>(() => [
    { accessorKey: 'materialCode', header: '物料编码' },
    { accessorKey: 'materialDesc', header: '描述', cell: ({ row }) => row.original.materialDesc || '—' },
    { accessorKey: 'unit', header: '单位', cell: ({ row }) => row.original.unit || '—' },
    { accessorKey: 'warehouseName', header: '库房', cell: ({ row }) => row.original.warehouseName || '—' },
    { accessorKey: 'locationCode', header: '库位', cell: ({ row }) => row.original.locationCode || '—' },
    { accessorKey: 'quantity', header: '数量', cell: ({ row }) => <span className="font-medium">{row.original.quantity}</span> },
    { accessorKey: 'lastInboundTime', header: '最近入库', cell: ({ row }) => row.original.lastInboundTime || '—' },
  ], [])

  return (
    <PageContainer title="库存明细查询" description="按物料编码与入库时间区间查询库位级库存台账">
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-iv-code">物料编码</Label>
          <Input id="s-iv-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-iv-start">入库起</Label>
          <Input id="s-iv-start" type="date" className="h-9 w-40" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-iv-end">入库止</Label>
          <Input id="s-iv-end" type="date" className="h-9 w-40" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
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
    </PageContainer>
  )
}
