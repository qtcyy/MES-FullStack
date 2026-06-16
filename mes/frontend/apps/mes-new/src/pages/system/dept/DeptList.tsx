// apps/mes-new/src/pages/system/dept/DeptList.tsx
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
  TreeDataTable,
  Input,
  Label,
  toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import DeptForm from './DeptForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { deptPage, deptAddOrUpdate } from '@/api/system/dept'
import { buildTree, type WithChildren } from '@/utils/tree'
import type { SysDepartment } from '@/types/system'

type DeptNode = WithChildren<SysDepartment>

export default function DeptList() {
  const [draftName, setDraftName] = useState('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SysDepartment | null>(null)
  const [deleting, setDeleting] = useState<SysDepartment | null>(null)

  // 拉全量(大 size),客户端建树
  const { data, loading } = useQuery$(['sys', 'dept', 'all'], () => deptPage({ current: 1, size: 9999 }))
  const { mutate: softDelete } = useMutation$((record: SysDepartment) => deptAddOrUpdate({ ...record, isDeleted: '1' }))

  const records = data?.records ?? []

  // 受搜索过滤的树(用于 DataTable 展示)
  const treeData = useMemo<DeptNode[]>(() => {
    const list = search ? records.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())) : records
    return buildTree(list)
  }, [records, search])

  // 全量树(不受搜索影响,供 DeptForm ParentSelect 使用)
  const fullTree = useMemo(() => buildTree(records), [records])

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await softDelete(deleting)
      toast.success('删除成功')
      invalidate('["sys","dept"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<DeptNode>[]>(
    () => [
      { accessorKey: 'name', header: '部门名称' },
      { accessorKey: 'sortNum', header: '排序' },
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
      title="部门管理"
      description="维护组织部门层级"
      actions={
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="size-4" />
          新建部门
        </Button>
      }
    >
      <SearchForm onSearch={() => setSearch(draftName)} onReset={() => { setDraftName(''); setSearch('') }}>
        <div className="space-y-1.5">
          <Label htmlFor="s-dept-name">部门名称</Label>
          <Input id="s-dept-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
      </SearchForm>

      <TreeDataTable
        columns={columns}
        data={treeData}
        loading={loading}
        loadingRowCount={6}
        getSubRows={(row) => row.children}
      />

      <DeptForm
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        treeNodes={fullTree as never}
        onSaved={() => {}}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除部门「{deleting?.name}」吗?其子部门不会被级联删除。</AlertDialogDescription>
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
