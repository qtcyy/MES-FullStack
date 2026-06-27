// apps/mes-new/src/pages/basedata/device/DeviceList.tsx
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
import DeviceForm from './DeviceForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { devicePage, deviceDelete, type DevicePageParams } from '@/api/basedata/device'
import { deviceStatusMeta } from '@/utils/deviceStatus'
import type { SpDevice } from '@/types/device'

const PAGE_SIZE = 10

export default function DeviceList() {
  const [params, setParams] = useState<DevicePageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpDevice | null>(null)
  const [deleting, setDeleting] = useState<SpDevice | null>(null)

  const { data, loading } = useQuery$(['basedata', 'device', 'page', params], () => devicePage(params))
  const { mutate: removeDevice } = useMutation$((id: string) => deviceDelete(id))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeDevice(deleting.id)
      toast.success('删除成功')
      invalidate('["basedata","device"')
    } catch {
      /* 拦截器已 toast(含"已关联生产作业"拒删提示) */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpDevice>[]>(
    () => [
      { accessorKey: 'code', header: '设备编码' },
      { accessorKey: 'name', header: '设备名称' },
      { accessorKey: 'type', header: '类型', cell: ({ row }) => row.original.type || '—' },
      { accessorKey: 'location', header: '位置', cell: ({ row }) => row.original.location || '—' },
      {
        id: 'status',
        header: '状态',
        cell: ({ row }) => {
          const meta = deviceStatusMeta(row.original.status)
          return <Badge className={meta.className}>{meta.label}</Badge>
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
      title="设备管理"
      description="维护设备基础数据及其状态"
      actions={
        <PermissionGuard perm="device:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建设备
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-dev-code">设备编码</Label>
          <Input id="s-dev-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-dev-name">设备名称</Label>
          <Input id="s-dev-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
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

      <DeviceForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除设备「{deleting?.name}」吗?</AlertDialogDescription>
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
