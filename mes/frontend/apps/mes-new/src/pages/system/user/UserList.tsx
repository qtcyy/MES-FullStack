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
import UserForm from './UserForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { userPage, userDelete, type UserPageParams } from '@/api/system/user'
import type { SysUser } from '@/types/user'

const PAGE_SIZE = 10

function statusBadge(deleted: string) {
  if (deleted === '0') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">正常</Badge>
  if (deleted === '2') return <Badge variant="secondary">禁用</Badge>
  return <Badge variant="destructive">已删除</Badge>
}

export default function UserList() {
  const [params, setParams] = useState<UserPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [draftUsername, setDraftUsername] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SysUser | null>(null)
  const [deleting, setDeleting] = useState<SysUser | null>(null)

  const { data, loading } = useQuery$(['sys', 'user', 'page', params], () => userPage(params))
  const { mutate: removeUser } = useMutation$((id: string) => userDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, nameLike: draftName || undefined, usernameLike: draftUsername || undefined })
  const onReset = () => {
    setDraftName('')
    setDraftUsername('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeUser(deleting.id)
      toast.success('删除成功')
      invalidate('["sys","user"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SysUser>[]>(
    () => [
      { accessorKey: 'username', header: '登录名' },
      { accessorKey: 'name', header: '姓名' },
      { accessorKey: 'deleted', header: '状态', cell: ({ row }) => statusBadge(row.original.deleted) },
      { accessorKey: 'createTime', header: '创建时间', cell: ({ row }) => row.original.createTime ?? '—' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <PermissionGuard perm="user:update">
              <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
                <Pencil className="size-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard perm="user:delete">
              <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </PermissionGuard>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer
      title="用户管理"
      description="管理系统登录账号与状态"
      actions={
        <PermissionGuard perm="user:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建用户
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-username">登录名</Label>
          <Input id="s-username" className="h-9 w-44" value={draftUsername} onChange={(e) => setDraftUsername(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-name">姓名</Label>
          <Input id="s-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
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

      <UserForm open={formOpen} onOpenChange={setFormOpen} record={editing} onSaved={() => { /* 由 invalidate 触发刷新 */ }} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除用户「{deleting?.name}」吗?此操作不可撤销。
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
