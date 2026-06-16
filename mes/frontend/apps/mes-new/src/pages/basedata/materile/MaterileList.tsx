// apps/mes-new/src/pages/basedata/materile/MaterileList.tsx
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
import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import MaterileForm from './MaterileForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { materilePage, materileAddOrUpdate, type MaterilePageParams } from '@/api/basedata/materile'
import type { Materiel } from '@/types/basedata'

const PAGE_SIZE = 10

export default function MaterileList() {
  const [params, setParams] = useState<MaterilePageParams>({ current: 1, size: PAGE_SIZE })
  const [draftMateriel, setDraftMateriel] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Materiel | null>(null)
  const [deleting, setDeleting] = useState<Materiel | null>(null)

  const { data, loading } = useQuery$(['basedata', 'materile', 'page', params], () => materilePage(params))
  const { mutate: softDelete } = useMutation$((record: Materiel) => materileAddOrUpdate({ ...record, deleted: '1' }))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, materielLike: draftMateriel || undefined, materielDescLike: draftDesc || undefined })
  const onReset = () => {
    setDraftMateriel('')
    setDraftDesc('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await softDelete(deleting)
      toast.success('删除成功')
      invalidate('["basedata","materile"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<Materiel>[]>(
    () => [
      {
        id: 'image',
        header: '图片',
        cell: ({ row }) =>
          row.original.imageUrl ? (
            <img src={row.original.imageUrl} alt="" className="size-10 rounded object-cover" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded bg-muted text-muted-foreground">
              <ImageOff className="size-4" />
            </div>
          ),
      },
      { accessorKey: 'materiel', header: '物料编码' },
      { accessorKey: 'materielDesc', header: '物料描述' },
      { accessorKey: 'matType', header: '类型', cell: ({ row }) => row.original.matType || '—' },
      { accessorKey: 'unit', header: '单位', cell: ({ row }) => row.original.unit || '—' },
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
      title="物料管理"
      description="维护物料主数据与图片"
      actions={
        <PermissionGuard perm="materile:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建物料
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-mat-code">物料编码</Label>
          <Input id="s-mat-code" className="h-9 w-44" value={draftMateriel} onChange={(e) => setDraftMateriel(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-mat-desc">物料描述</Label>
          <Input id="s-mat-desc" className="h-9 w-44" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
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

      <MaterileForm open={formOpen} onOpenChange={setFormOpen} record={editing} onSaved={() => {}} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除物料「{deleting?.materielDesc}」吗?</AlertDialogDescription>
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
