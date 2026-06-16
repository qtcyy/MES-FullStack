// apps/mes-new/src/pages/system/role/RoleList.tsx
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
import PermissionGuard from '@/components/PermissionGuard'
import RoleForm from './RoleForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { rolePage, roleAddOrUpdate, type RolePageParams } from '@/api/system/role'
import type { SysRole } from '@/types/system'

const PAGE_SIZE = 10

export default function RoleList() {
  const [params, setParams] = useState<RolePageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SysRole | null>(null)
  const [deleting, setDeleting] = useState<SysRole | null>(null)

  const { data, loading } = useQuery$(['sys', 'role', 'page', params], () => rolePage(params))
  const { mutate: softDelete } = useMutation$((record: SysRole) => roleAddOrUpdate({ ...record, deleted: '1' }))

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
      invalidate('["sys","role"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SysRole>[]>(
    () => [
      { accessorKey: 'name', header: '角色名' },
      { accessorKey: 'code', header: '编码' },
      { accessorKey: 'descr', header: '描述', cell: ({ row }) => row.original.descr || '—' },
      { id: 'isSystem', header: '系统角色', cell: ({ row }) => (row.original.isSystem === '1' ? <Badge variant="secondary">系统</Badge> : '—') },
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
      title="角色管理"
      description="维护角色及其菜单权限"
      actions={
        <PermissionGuard perm="role:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建角色
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-role-name">角色名</Label>
          <Input id="s-role-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
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

      <RoleForm open={formOpen} onOpenChange={setFormOpen} record={editing} onSaved={() => {}} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除角色「{deleting?.name}」吗?</AlertDialogDescription>
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
