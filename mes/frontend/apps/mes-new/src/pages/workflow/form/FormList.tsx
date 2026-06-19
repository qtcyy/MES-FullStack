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
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import FormWizardDialog from './FormWizardDialog'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { formPage, formDelete, type FormPageParams } from '@/api/workflow/form'
import type { WorkflowForm } from '@/types/workflow'

const PAGE_SIZE = 10

export default function FormList() {
  const [params, setParams] = useState<FormPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [draftKey, setDraftKey] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WorkflowForm | null>(null)
  const [deleting, setDeleting] = useState<WorkflowForm | null>(null)

  const { data, loading } = useQuery$(['workflow', 'form', 'page', params], () => formPage(params))
  const { mutate: removeForm } = useMutation$((id: string) => formDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, name: draftName || undefined, formKey: draftKey || undefined })
  const onReset = () => {
    setDraftName('')
    setDraftKey('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeForm(deleting.id)
      toast.success('删除成功')
      invalidate('["workflow","form"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<WorkflowForm>[]>(
    () => [
      { accessorKey: 'name', header: '表单名称' },
      { accessorKey: 'formKey', header: '表单key' },
      {
        id: 'formType',
        header: '表单类型',
        cell: ({ row }) => <Badge variant="secondary">{row.original.formType === 'URL' ? 'URL表单' : row.original.formType}</Badge>,
      },
      {
        id: 'skip',
        header: '跳过相同处理人',
        cell: ({ row }) => (row.original.skipSameAssignee ? '是' : '否'),
      },
      {
        id: 'createTime',
        header: '创建时间',
        cell: ({ row }) => row.original.createTime || '-',
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
      title="流程表单管理"
      description="维护流程表单(URL表单/地址脚本),供流程定义关联"
      actions={
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          新增流程表单
        </Button>
      }
    >
      <div className="space-y-3">
        <SearchForm onSearch={onSearch} onReset={onReset}>
          <div className="space-y-1.5">
            <Label htmlFor="wf-s-name">表单名称</Label>
            <Input id="wf-s-name" className="h-9 w-40" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wf-s-key">表单key</Label>
            <Input id="wf-s-key" className="h-9 w-40" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} />
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

      <FormWizardDialog open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除流程表单「{deleting?.name}」吗?</AlertDialogDescription>
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
