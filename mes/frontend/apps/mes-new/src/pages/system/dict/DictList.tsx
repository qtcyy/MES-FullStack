// apps/mes-new/src/pages/system/dict/DictList.tsx
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
import DictForm from './DictForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { dictPage, dictAddOrUpdate, type DictPageParams } from '@/api/system/dict'
import type { SysDict } from '@/types/system'

const PAGE_SIZE = 10

export default function DictList() {
  const [params, setParams] = useState<DictPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SysDict | null>(null)
  const [deleting, setDeleting] = useState<SysDict | null>(null)

  const { data, loading } = useQuery$(['sys', 'dict', 'page', params], () => dictPage(params))
  const { mutate: softDelete } = useMutation$((record: SysDict) => dictAddOrUpdate({ ...record, deleted: '1' }))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, nameLike: draftName || undefined })
  const onReset = () => {
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await softDelete(deleting)
      toast.success('删除成功')
      invalidate('["sys","dict"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SysDict>[]>(
    () => [
      { accessorKey: 'name', header: '标签名' },
      { accessorKey: 'value', header: '数据值' },
      { accessorKey: 'type', header: '类型' },
      { accessorKey: 'sortNum', header: '排序' },
      { accessorKey: 'descr', header: '描述', cell: ({ row }) => row.original.descr || '—' },
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
      title="字典管理"
      description="维护系统数据字典"
      actions={
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="size-4" />
          新建字典
        </Button>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-dict-name">标签名</Label>
          <Input id="s-dict-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
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

      <DictForm open={formOpen} onOpenChange={setFormOpen} record={editing} onSaved={() => {}} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除字典「{deleting?.name}」吗?</AlertDialogDescription>
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
