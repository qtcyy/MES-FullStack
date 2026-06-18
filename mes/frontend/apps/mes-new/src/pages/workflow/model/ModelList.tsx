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
  toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import ModelCreateDialog from './ModelCreateDialog'
import ModelDesignerDialog from './ModelDesignerDialog'
import PublishDialog from './PublishDialog'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { modelPage, modelDelete, type ModelPageParams } from '@/api/workflow/model'
import type { WorkflowModel } from '@/types/workflow'

const PAGE_SIZE = 10

export default function ModelList() {
  const [params, setParams] = useState<ModelPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [draftKey, setDraftKey] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [designId, setDesignId] = useState<string | null>(null)
  const [designerOpen, setDesignerOpen] = useState(false)
  const [publishing, setPublishing] = useState<WorkflowModel | null>(null)
  const [deleting, setDeleting] = useState<WorkflowModel | null>(null)

  const { data, loading } = useQuery$(['workflow', 'model', 'page', params], () => modelPage(params))
  const { mutate: removeModel } = useMutation$((id: string) => modelDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, name: draftName || undefined, modelKey: draftKey || undefined })
  const onReset = () => {
    setDraftName('')
    setDraftKey('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const openDesigner = (id: string) => {
    setDesignId(id)
    setDesignerOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeModel(deleting.id)
      toast.success('删除成功')
      invalidate('["workflow","model"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<WorkflowModel>[]>(
    () => [
      { accessorKey: 'name', header: '模型名称' },
      { accessorKey: 'modelKey', header: '模型 key' },
      {
        id: 'category',
        header: '所属分类',
        cell: ({ row }) => row.original.categoryName || '-',
      },
      {
        id: 'status',
        header: '状态',
        cell: ({ row }) =>
          row.original.status === 'PUBLISHED' ? (
            <Badge>已发布</Badge>
          ) : (
            <Badge variant="secondary">草稿</Badge>
          ),
      },
      { accessorKey: 'updateTime', header: '更新时间' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" title="设计" onClick={() => openDesigner(row.original.id)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="发布" onClick={() => setPublishing(row.original)}>
              <Upload className="size-4 text-primary" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="删除" onClick={() => setDeleting(row.original)}>
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
      title="流程模型设计"
      description="设计 BPMN 流程模型并发布到分类下"
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          创建模型
        </Button>
      }
    >
      <div className="space-y-3">
        <SearchForm onSearch={onSearch} onReset={onReset}>
          <div className="space-y-1.5">
            <Label htmlFor="wm-s-name">模型名称</Label>
            <Input
              id="wm-s-name"
              className="h-9 w-40"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wm-s-key">模型 key</Label>
            <Input
              id="wm-s-key"
              className="h-9 w-40"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
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

      <ModelCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => openDesigner(id)}
      />
      <ModelDesignerDialog open={designerOpen} onOpenChange={setDesignerOpen} modelId={designId} />
      <PublishDialog open={!!publishing} onOpenChange={(o) => !o && setPublishing(null)} model={publishing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除流程模型「{deleting?.name}」吗?</AlertDialogDescription>
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
