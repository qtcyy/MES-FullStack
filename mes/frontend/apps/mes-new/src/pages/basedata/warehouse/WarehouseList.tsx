// apps/mes-new/src/pages/basedata/warehouse/WarehouseList.tsx
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
  Button,
  DataTable,
  Input,
  Label,
  cn,
  toast,
} from '@workspace/ui'
import { MapPin, Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import RelatedPanel from '@/components/RelatedPanel'
import WarehouseForm from './WarehouseForm'
import WarehouseLocations from './WarehouseLocations'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { warehousePage, warehouseDelete, type WarehousePageParams } from '@/api/basedata/warehouse'
import type { SpWarehouse } from '@/types/warehouse'

const PAGE_SIZE = 10

export default function WarehouseList() {
  const [params, setParams] = useState<WarehousePageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpWarehouse | null>(null)
  const [deleting, setDeleting] = useState<SpWarehouse | null>(null)
  const [selected, setSelected] = useState<SpWarehouse | null>(null)

  const { data, loading } = useQuery$(['basedata', 'warehouse', 'page', params], () => warehousePage(params))
  const { mutate: removeWarehouse } = useMutation$((id: string) => warehouseDelete(id))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeWarehouse(deleting.id)
      toast.success('删除成功')
      if (selected?.id === deleting.id) setSelected(null)
      invalidate('["basedata","warehouse"')
    } catch {
      /* toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpWarehouse>[]>(
    () => [
      { accessorKey: 'code', header: '库房编码' },
      { accessorKey: 'name', header: '库房名称' },
      { accessorKey: 'type', header: '类型', cell: ({ row }) => row.original.type || '—' },
      {
        id: 'spec',
        header: '规格',
        cell: ({ row }) => {
          const w = row.original
          return <span className="text-muted-foreground">{w.groups}×{w.rows}×{w.layers}×{w.columns}</span>
        },
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
      title="仓库管理"
      description="维护库房主数据与库位"
      actions={
        <PermissionGuard perm="warehouse:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建仓库
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-wh-code">库房编码</Label>
          <Input id="s-wh-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-wh-name">库房名称</Label>
          <Input id="s-wh-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
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
              onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
            }}
          />
        }
        detail={
          selected ? (
            <WarehouseLocations warehouse={selected} />
          ) : (
            <RelatedPanel icon={MapPin} title="库位" empty emptyIcon={WarehouseIcon} emptyText="请选择左侧仓库查看库位" />
          )
        }
      />

      <WarehouseForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除仓库「{deleting?.name}」吗?</AlertDialogDescription>
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
