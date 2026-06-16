// apps/mes-new/src/pages/basedata/device-group/DeviceGroupList.tsx
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
  cn,
  toast,
} from '@workspace/ui'
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import RelatedPanel from '@/components/RelatedPanel'
import DeviceGroupForm from './DeviceGroupForm'
import DeviceGroupMembers from './DeviceGroupMembers'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { deviceGroupPage, deviceGroupDelete, type DeviceGroupPageParams } from '@/api/basedata/device-group'
import type { SpDeviceGroupDTO } from '@/types/device'

const PAGE_SIZE = 10

export default function DeviceGroupList() {
  const [params, setParams] = useState<DeviceGroupPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpDeviceGroupDTO | null>(null)
  const [deleting, setDeleting] = useState<SpDeviceGroupDTO | null>(null)
  const [selected, setSelected] = useState<SpDeviceGroupDTO | null>(null)

  const { data, loading } = useQuery$(['basedata', 'device-group', 'page', params], () => deviceGroupPage(params))
  const { mutate: removeGroup } = useMutation$((id: string) => deviceGroupDelete(id))

  const onSearch = () => setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeGroup(deleting.id)
      toast.success('删除成功')
      if (selected?.id === deleting.id) setSelected(null)
      invalidate('["basedata","device-group"')
    } catch {
      /* toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpDeviceGroupDTO>[]>(
    () => [
      { accessorKey: 'code', header: '编组代码' },
      { accessorKey: 'name', header: '编组名称' },
      { accessorKey: 'descr', header: '描述', cell: ({ row }) => row.original.descr || '—' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
      title="设备组管理"
      description="维护设备编组及其成员设备"
      actions={
        <PermissionGuard perm="device:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建设备组
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-dg-code">编组代码</Label>
          <Input id="s-dg-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-dg-name">编组名称</Label>
          <Input id="s-dg-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
      </SearchForm>

      <MasterDetailLayout
        master={
          <DataTable
            columns={columns}
            data={data?.records ?? []}
            loading={loading}
            loadingRowCount={PAGE_SIZE}
            onRowClick={(row) => setSelected(row)}
            rowClassName={(row) => cn(selected?.id === row.id && 'bg-accent')}
            pagination={{
              mode: 'server',
              pageIndex: (data?.current ?? params.current) - 1,
              pageSize: PAGE_SIZE,
              totalPages: data?.pages ?? 1,
              totalRows: data?.total,
              onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
            }}
          />
        }
        detail={
          selected ? (
            <DeviceGroupMembers group={selected} />
          ) : (
            <RelatedPanel icon={Boxes} title="成员设备" empty emptyIcon={Boxes} emptyText="请选择左侧设备组查看成员" />
          )
        }
      />

      <DeviceGroupForm open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除设备组「{deleting?.name}」吗?</AlertDialogDescription>
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
