import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Button, DataTable, Input, Label, toast } from '@workspace/ui'
import { FileText, Power, Workflow } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import AssociateFormDialog from './AssociateFormDialog'
import EventConfigDialog from './EventConfigDialog'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { definitionPage, definitionSetEnabled, type DefinitionPageParams } from '@/api/workflow/definition'
import type { WorkflowDefinition } from '@/types/workflow'

const PAGE_SIZE = 10

export default function DefinitionList() {
  const [params, setParams] = useState<DefinitionPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [associating, setAssociating] = useState<WorkflowDefinition | null>(null)
  const [eventing, setEventing] = useState<WorkflowDefinition | null>(null)

  const { data, loading } = useQuery$(['workflow', 'definition', 'page', params], () => definitionPage(params))
  const { mutate: toggleEnabled } = useMutation$((arg: { id: string; enabled: boolean }) =>
    definitionSetEnabled(arg.id, arg.enabled),
  )

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, name: draftName || undefined })
  const onReset = () => {
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const onToggle = async (d: WorkflowDefinition) => {
    try {
      await toggleEnabled({ id: d.id, enabled: !d.enabled })
      toast.success(d.enabled ? '已停用' : '已启用')
      invalidate('["workflow","definition"')
    } catch {
      /* 拦截器已 toast */
    }
  }

  const columns = useMemo<ColumnDef<WorkflowDefinition>[]>(
    () => [
      { accessorKey: 'processName', header: '流程名称' },
      { accessorKey: 'processKey', header: 'processKey' },
      { id: 'category', header: '分类', cell: ({ row }) => row.original.categoryName || '-' },
      { id: 'version', header: '版本', cell: ({ row }) => `v${row.original.version}` },
      {
        id: 'enabled',
        header: '状态',
        cell: ({ row }) =>
          row.original.enabled ? <Badge>启用</Badge> : <Badge variant="secondary">停用</Badge>,
      },
      {
        id: 'formKey',
        header: '关联表单',
        cell: ({ row }) =>
          row.original.formKey ? (
            <Badge variant="outline">{row.original.formKey}</Badge>
          ) : (
            <span className="text-muted-foreground">未关联</span>
          ),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onToggle(row.original)}>
              <Power className="size-4" />
              {row.original.enabled ? '停用' : '启用'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAssociating(row.original)}>
              <FileText className="size-4" />
              关联表单
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEventing(row.original)}>
              <Workflow className="size-4" />
              流程事件
            </Button>
          </div>
        ),
      },
    ],
    // 列定义引用 onToggle(每次渲染重建,但内部仅用稳定的 mutate/setState);空依赖即可,显式禁用 exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <PageContainer title="流程定义管理" description="已发布流程定义:启用停用、关联表单、配置流程事件">
      <div className="space-y-3">
        <SearchForm onSearch={onSearch} onReset={onReset}>
          <div className="space-y-1.5">
            <Label htmlFor="wd-s-name">流程名称</Label>
            <Input id="wd-s-name" className="h-9 w-40" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
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

      <AssociateFormDialog open={!!associating} onOpenChange={(o) => !o && setAssociating(null)} definition={associating} />
      <EventConfigDialog open={!!eventing} onOpenChange={(o) => !o && setEventing(null)} definition={eventing} />
    </PageContainer>
  )
}
