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
  toast,
} from '@workspace/ui'
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import PermissionGuard from '@/components/PermissionGuard'
import FlowProcessEditor from './FlowProcessEditor'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { flowPage, flowDelete } from '@/api/technology/flow'
import type { PageParams } from '@/types/api'
import type { SpFlow } from '@/types/technology'

const PAGE_SIZE = 10

export default function FlowList() {
  const [params, setParams] = useState<PageParams>({ current: 1, size: PAGE_SIZE })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpFlow | null>(null)
  const [deleting, setDeleting] = useState<SpFlow | null>(null)

  const { data, loading } = useQuery$(['flow', 'page', params], () => flowPage(params))
  const { mutate: removeFlow } = useMutation$((id: string) => flowDelete(id))

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeFlow(deleting.id)
      toast.success('删除成功')
      invalidate('["flow","page"')
    } catch {
      /* toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpFlow>[]>(
    () => [
      { accessorKey: 'flow', header: '流程代码' },
      { accessorKey: 'flowDesc', header: '流程描述', cell: ({ row }) => row.original.flowDesc || '—' },
      {
        accessorKey: 'process',
        header: '工序链',
        cell: ({ row }) => {
          const p = row.original.process
          if (!p) return <span className="text-muted-foreground">—</span>
          const parts = p.split('->')
          return (
            <div className="flex flex-wrap items-center gap-1">
              {parts.map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  <Badge variant="secondary" className="font-normal">{s}</Badge>
                  {i < parts.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                </span>
              ))}
            </div>
          )
        },
      },
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
      title="工艺路线管理"
      description="编排工序生成工艺路线"
      actions={
        <PermissionGuard perm="flow:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建工艺路线
          </Button>
        </PermissionGuard>
      }
    >
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

      <FlowProcessEditor open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除工艺路线「{deleting?.flow}」吗?将同时删除其工序关系。</AlertDialogDescription>
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
