// apps/mes-new/src/pages/basedata/process-unit/ProcessUnitList.tsx
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
  cn,
  toast,
} from '@workspace/ui'
import { Factory, Pencil, Plus, Trash2, Users } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import RelatedPanel from '@/components/RelatedPanel'
import ProcessUnitForm from './ProcessUnitForm'
import ProcessUnitTeams from './ProcessUnitTeams'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { processUnitPage, processUnitDelete, type ProcessUnitPageParams } from '@/api/basedata/process-unit'
import type { SpProcessUnitDTO } from '@/types/process-unit'

const PAGE_SIZE = 10

export default function ProcessUnitList() {
  const [params, setParams] = useState<ProcessUnitPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpProcessUnitDTO | null>(null)
  const [deleting, setDeleting] = useState<SpProcessUnitDTO | null>(null)
  const [selected, setSelected] = useState<SpProcessUnitDTO | null>(null)

  const { data, loading } = useQuery$(['basedata', 'process-unit', 'page', params], () => processUnitPage(params))
  const { mutate: removeUnit } = useMutation$((id: string) => processUnitDelete(id))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeUnit(deleting.id)
      toast.success('删除成功')
      if (selected?.id === deleting.id) setSelected(null)
      invalidate('["basedata","process-unit"')
    } catch {
      /* toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpProcessUnitDTO>[]>(
    () => [
      { accessorKey: 'code', header: '单元代码' },
      { accessorKey: 'name', header: '单元名称' },
      { accessorKey: 'type', header: '类型', cell: ({ row }) => row.original.type || '—' },
      {
        accessorKey: 'hasLineWarehouse',
        header: '线边库',
        cell: ({ row }) =>
          row.original.hasLineWarehouse === '1' ? <Badge variant="secondary">有</Badge> : <span className="text-muted-foreground">无</span>,
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
      title="工艺单元管理"
      description="维护加工单元及其班组绑定"
      actions={
        <PermissionGuard perm="processUnit:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建工艺单元
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-pu-code">单元代码</Label>
          <Input id="s-pu-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-pu-name">单元名称</Label>
          <Input id="s-pu-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
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
            <ProcessUnitTeams unit={selected} />
          ) : (
            <RelatedPanel icon={Users} title="绑定班组" empty emptyIcon={Factory} emptyText="请选择左侧工艺单元查看班组" />
          )
        }
      />

      <ProcessUnitForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除工艺单元「{deleting?.name}」吗?</AlertDialogDescription>
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
