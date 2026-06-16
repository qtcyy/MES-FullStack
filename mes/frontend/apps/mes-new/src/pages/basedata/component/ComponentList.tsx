// apps/mes-new/src/pages/basedata/component/ComponentList.tsx
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
  toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import ComponentForm from './ComponentForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { componentPage, componentDelete, type ComponentPageParams } from '@/api/basedata/component'
import type { SpComponent } from '@/types/basedata'

const PAGE_SIZE = 10

export default function ComponentList() {
  const [params, setParams] = useState<ComponentPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpComponent | null>(null)
  const [deleting, setDeleting] = useState<SpComponent | null>(null)

  const { data, loading } = useQuery$(['basedata', 'component', 'page', params], () => componentPage(params))
  const { mutate: removeComponent } = useMutation$((id: string) => componentDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeComponent(deleting.id)
      toast.success('删除成功')
      invalidate('["basedata","component"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpComponent>[]>(
    () => [
      { accessorKey: 'code', header: '组件编码' },
      { accessorKey: 'name', header: '组件名称' },
      { accessorKey: 'descr', header: '描述', cell: ({ row }) => row.original.descr || '—' },
      { accessorKey: 'createTime', header: '创建时间', cell: ({ row }) => row.original.createTime ?? '—' },
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
      title="元器件管理"
      description="维护元器件主数据"
      actions={
        <PermissionGuard perm="component:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建元器件
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-comp-code">组件编码</Label>
          <Input id="s-comp-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-comp-name">组件名称</Label>
          <Input id="s-comp-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
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

      <ComponentForm open={formOpen} onOpenChange={setFormOpen} record={editing} onSaved={() => {}} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除元器件「{deleting?.name}」吗?此操作不可撤销。</AlertDialogDescription>
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
