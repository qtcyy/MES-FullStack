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
  toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import SearchForm from '@/components/SearchForm'
import TeamForm from './TeamForm'
import TeamMembers from './TeamMembers'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { teamPage, teamDelete, type TeamPageParams } from '@/api/system/team'
import type { SpTeamDTO } from '@/types/system'
import { workdaysLabel } from './teamUtils'

const PAGE_SIZE = 10

export default function TeamPage() {
  const [params, setParams] = useState<TeamPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [selected, setSelected] = useState<SpTeamDTO | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpTeamDTO | null>(null)
  const [deleting, setDeleting] = useState<SpTeamDTO | null>(null)

  const { data, loading } = useQuery$(['sys', 'team', 'page', params], () => teamPage(params))
  const { mutate: removeTeam } = useMutation$((id: string) => teamDelete(id))

  const onSearch = () =>
    setParams({
      current: 1,
      size: PAGE_SIZE,
      code: draftCode || undefined,
      name: draftName || undefined,
    })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeTeam(deleting.id)
      toast.success('删除成功')
      invalidate('["sys","team"')
      if (selected?.id === deleting.id) setSelected(null)
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpTeamDTO>[]>(
    () => [
      { accessorKey: 'code', header: '班组代码' },
      { accessorKey: 'name', header: '班组名称' },
      {
        id: 'workdays',
        header: '工作日',
        cell: ({ row }) => workdaysLabel(row.original.workdays),
      },
      {
        id: 'userCount',
        header: '成员数',
        cell: ({ row }) => row.original.userCount ?? 0,
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation()
                setEditing(row.original)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation()
                setDeleting(row.original)
              }}
            >
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
      title="班组员工定义"
      description="维护班组及其员工归属"
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          新增班组
        </Button>
      }
    >
      <MasterDetailLayout
        master={
          <div className="space-y-3">
            <SearchForm onSearch={onSearch} onReset={onReset}>
              <div className="space-y-1.5">
                <Label htmlFor="t-s-code">班组代码</Label>
                <Input
                  id="t-s-code"
                  className="h-9 w-40"
                  value={draftCode}
                  onChange={(e) => setDraftCode(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-s-name">班组名称</Label>
                <Input
                  id="t-s-name"
                  className="h-9 w-40"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                />
              </div>
            </SearchForm>
            <DataTable
              columns={columns}
              data={data?.records ?? []}
              loading={loading}
              loadingRowCount={PAGE_SIZE}
              getRowId={(r) => r.id}
              onRowClick={(r) => setSelected(r)}
              rowClassName={(r) => (r.id === selected?.id ? 'bg-accent' : '')}
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
        }
        detail={
          !selected ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">请选择左侧班组以维护其成员</p>
            </div>
          ) : (
            <TeamMembers key={selected.id} team={selected} />
          )
        }
      />

      <TeamForm
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        onSaved={(saved) => {
          if (selected && saved.id && saved.id === selected.id) {
            setSelected({ ...selected, ...saved })
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除班组「{deleting?.name}」吗?删除后该班组不再显示。
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
