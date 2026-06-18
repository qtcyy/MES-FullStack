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
import CategoryForm from './CategoryForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { categoryPage, categoryDelete, type CategoryPageParams } from '@/api/workflow/category'
import type { WorkflowCategory } from '@/types/workflow'

const PAGE_SIZE = 10

export default function CategoryList() {
  const [params, setParams] = useState<CategoryPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WorkflowCategory | null>(null)
  const [deleting, setDeleting] = useState<WorkflowCategory | null>(null)

  const { data, loading } = useQuery$(['workflow', 'category', 'page', params], () => categoryPage(params))
  const { mutate: removeCategory } = useMutation$((id: string) => categoryDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeCategory(deleting.id)
      toast.success('删除成功')
      invalidate('["workflow","category"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<WorkflowCategory>[]>(
    () => [
      { accessorKey: 'name', header: '分类名称' },
      { accessorKey: 'code', header: '分类编码' },
      {
        id: 'descr',
        header: '备注',
        cell: ({ row }) => row.original.descr || '-',
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditing(row.original)
                setFormOpen(true)
              }}
            >
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
      title="流程分类管理"
      description="维护流程分类,供流程模型发布归类"
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          新增分类
        </Button>
      }
    >
      <div className="space-y-3">
        <SearchForm onSearch={onSearch} onReset={onReset}>
          <div className="space-y-1.5">
            <Label htmlFor="wc-s-code">分类编码</Label>
            <Input
              id="wc-s-code"
              className="h-9 w-40"
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-s-name">分类名称</Label>
            <Input
              id="wc-s-name"
              className="h-9 w-40"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
          </div>
        </SearchForm>
        <DataTable
          columns={columns}
          data={data?.records ?? []}
          loading={loading}
          loadingRowCount={PAGE_SIZE}
          getRowId={(r) => r.id}
          pagination={{
            mode: 'server',
            pageIndex: (data?.current ?? params.current) - 1,
            pageSize: PAGE_SIZE,
            totalPages: data?.pages ?? 1,
            totalRows: data?.total,
            onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
          }}
        />
      </div>

      <CategoryForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除流程分类「{deleting?.name}」吗?
            </AlertDialogDescription>
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
