// apps/mes-new/src/pages/system/menu/MenuList.tsx
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
  TreeDataTable,
  toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import MenuForm from './MenuForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { menuTree, menuDelete } from '@/api/system/menu'
import type { SysMenu, TreeVO } from '@/types/menu'

const TYPE_LABEL: Record<number, string> = { 0: '目录', 1: '菜单', 2: '按钮' }

export default function MenuList() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SysMenu | null>(null)
  const [deleting, setDeleting] = useState<TreeVO<SysMenu> | null>(null)

  const { data, loading } = useQuery$(['sys', 'menu', 'tree'], () => menuTree())
  const { mutate: removeMenu } = useMutation$((id: string) => menuDelete(id))

  const treeData = data ?? []

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeMenu(deleting.id)
      toast.success('删除成功')
      invalidate('["sys","menu"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  // TreeVO → 可编辑 SysMenu(编辑表单需要 SysMenu 字段)
  const toMenu = (n: TreeVO<SysMenu>): SysMenu => ({
    id: n.id,
    code: n.code ?? '',
    name: n.name,
    url: n.url ?? '',
    parentId: n.pid ?? '0',
    grade: 0,
    sortNum: 0,
    type: n.type ?? 1,
    permission: n.permission ?? '',
    icon: n.icon ?? '',
    descr: '',
  })

  const columns = useMemo<ColumnDef<TreeVO<SysMenu>>[]>(
    () => [
      { accessorKey: 'name', header: '名称' },
      { id: 'type', header: '类型', cell: ({ row }) => <Badge variant="secondary">{TYPE_LABEL[row.original.type ?? 1]}</Badge> },
      { accessorKey: 'permission', header: '权限标识', cell: ({ row }) => row.original.permission || '—' },
      { accessorKey: 'url', header: 'URL', cell: ({ row }) => row.original.url || '—' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(toMenu(row.original)); setFormOpen(true) }}>
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
      title="菜单管理"
      description="维护系统菜单与权限标识"
      actions={
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="size-4" />
          新建菜单
        </Button>
      }
    >
      <TreeDataTable
        columns={columns}
        data={treeData}
        loading={loading}
        loadingRowCount={8}
        getSubRows={(row) => row.children}
      />

      <MenuForm open={formOpen} onOpenChange={setFormOpen} record={editing} treeNodes={treeData} onSaved={() => {}} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除菜单「{deleting?.name}」吗?此操作不可撤销。</AlertDialogDescription>
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
