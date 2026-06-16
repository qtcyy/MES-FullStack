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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TreeDataTable,
  toast,
} from '@workspace/ui'
import { ChevronLeft, GitBranch, Link2, Link2Off, Lock } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import FlowBindForm from './FlowBindForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import {
  bomFlowProducts,
  bomFlowList,
  bomFlowUnbind,
  bomFlowLock,
} from '@/api/technology/bom-flow'
import { buildBomNodeTree, type BomNodeTree } from '@/utils/productBom'
import type { BomFlowNodeVO, FlowOperItem } from '@/types/technology'

const INVALIDATE_LIST = '["bomFlow","list"'

type BomFlowTreeNode = BomNodeTree<BomFlowNodeVO>

/** 状态徽章:draft → 草稿(secondary)/ locked → 已锁定(destructive) */
function StatusBadge({ status }: { status?: 'draft' | 'locked' }) {
  if (status === 'locked') return <Badge variant="destructive">已锁定</Badge>
  return <Badge variant="secondary">草稿</Badge>
}

/** 层级文案:0 产品 / 1 半成品 / ≥2 组件 */
function levelLabel(level?: number): string {
  const lv = level ?? 0
  if (lv === 0) return '产品'
  if (lv === 1) return '半成品'
  return '组件'
}

export default function BomFlowList() {
  // ===== 浏览态:产品根选择 =====
  const [pickedRootId, setPickedRootId] = useState<string>('')
  // ===== 绑定态选择 =====
  const [editingRootId, setEditingRootId] = useState<string | null>(null)
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null)

  // ===== 对话框开关 =====
  const [bindOpen, setBindOpen] = useState(false)
  const [unbinding, setUnbinding] = useState<{ bomId: string; nodeName: string } | null>(null)
  const [locking, setLocking] = useState(false)

  // ===== 数据 =====
  const { data: products } = useQuery$(['bomFlow', 'products'], () => bomFlowProducts())
  const { data: list, loading: listLoading } = useQuery$(
    ['bomFlow', 'list', editingRootId],
    () => bomFlowList(editingRootId!),
    { enabled: !!editingRootId },
  )

  const flat = useMemo<BomFlowNodeVO[]>(() => list ?? [], [list])
  const treeData = useMemo<BomFlowTreeNode[]>(() => buildBomNodeTree(flat), [flat])

  const rootStatus = useMemo<'draft' | 'locked' | undefined>(
    () => flat.find((x) => x.bomNode.id === editingRootId)?.bomNode.status,
    [flat, editingRootId],
  )
  const rootName = useMemo(
    () => flat.find((x) => x.bomNode.id === editingRootId)?.bomNode.nodeName,
    [flat, editingRootId],
  )

  const selected = useMemo<BomFlowNodeVO | undefined>(
    () => flat.find((x) => x.bomNode.id === selectedBomId),
    [flat, selectedBomId],
  )

  const canWrite =
    rootStatus !== 'locked' &&
    (selected?.bomFlow?.status ?? 'draft') !== 'locked' &&
    selected?.bomNode?.status !== 'locked'

  const bindInitial = useMemo(
    () => ({ flowId: selected?.bomFlow?.flowId, remark: selected?.bomFlow?.remark }),
    [selected?.bomFlow?.flowId, selected?.bomFlow?.remark],
  )

  // ===== mutations =====
  const { mutate: unbind, loading: unbindLoading } = useMutation$((bomId: string) => bomFlowUnbind(bomId))
  const { mutate: lock, loading: lockLoading } = useMutation$(() => bomFlowLock(editingRootId!))

  // ===== 导航 =====
  const enterBind = () => {
    if (!pickedRootId) return
    setEditingRootId(pickedRootId)
    setSelectedBomId(pickedRootId)
  }
  const back = () => {
    setEditingRootId(null)
    setSelectedBomId(null)
  }

  // ===== 写操作 =====
  const onBound = () => {
    invalidate(INVALIDATE_LIST)
    setBindOpen(false)
  }
  const confirmUnbind = async () => {
    if (!unbinding) return
    try {
      await unbind(unbinding.bomId)
      toast.success('已解绑工艺路线')
      invalidate(INVALIDATE_LIST)
    } catch {
      /* toast by interceptor */
    } finally {
      setUnbinding(null)
    }
  }
  const confirmLock = async () => {
    try {
      await lock()
      toast.success('已锁定工艺')
      invalidate(INVALIDATE_LIST)
    } catch {
      /* toast by interceptor */
    } finally {
      setLocking(false)
    }
  }

  // ===== 列定义:左侧 BOM 树 =====
  const treeColumns = useMemo<ColumnDef<BomFlowTreeNode>[]>(
    () => [
      {
        accessorKey: 'nodeName',
        header: '节点名称',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelectedBomId(row.original.bomNode.id)}
            className={
              row.original.bomNode.id === selectedBomId
                ? 'text-left font-medium text-primary'
                : 'text-left hover:text-primary'
            }
          >
            {row.original.bomNode.nodeName}
          </button>
        ),
      },
      {
        id: 'level',
        header: '层级',
        cell: ({ row }) => levelLabel(row.original.bomNode.level),
      },
      {
        id: 'flow',
        header: '已绑工艺',
        cell: ({ row }) =>
          row.original.flow?.flow ? (
            <Badge variant="outline">{row.original.flow.flow}</Badge>
          ) : (
            <span className="text-muted-foreground">未绑定</span>
          ),
      },
      {
        id: 'status',
        header: '状态',
        cell: ({ row }) =>
          row.original.bomFlow ? <StatusBadge status={row.original.bomFlow.status} /> : <span className="text-muted-foreground">—</span>,
      },
    ],
    [selectedBomId],
  )

  // ===== 列定义:工序预览(只读) =====
  const operColumns = useMemo<ColumnDef<FlowOperItem>[]>(
    () => [
      {
        id: 'sortNum',
        header: '序号',
        cell: ({ row }) => row.original.relation?.sortNum ?? '—',
      },
      {
        id: 'oper',
        header: '工序',
        cell: ({ row }) =>
          row.original.oper?.operDesc || row.original.relation?.oper || '—',
      },
      {
        id: 'mark',
        header: '标记',
        cell: ({ row }) => {
          const t = row.original.relation?.operType
          if (t === 'firstOper') return <Badge variant="secondary">首</Badge>
          if (t === 'lastOper') return <Badge variant="secondary">末</Badge>
          return null
        },
      },
    ],
    [],
  )

  // 共用对话框
  const dialogs = (
    <>
      <FlowBindForm
        open={bindOpen}
        onOpenChange={setBindOpen}
        bomId={selected?.bomNode.id ?? ''}
        initial={bindInitial}
        onSaved={onBound}
      />

      <AlertDialog open={!!unbinding} onOpenChange={(o) => !o && setUnbinding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认解绑工艺路线</AlertDialogTitle>
            <AlertDialogDescription>
              确定解绑节点「{unbinding?.nodeName}」的工艺路线吗?解绑后该节点将无工艺流程。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnbind} disabled={unbindLoading}>解绑</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={locking} onOpenChange={(o) => !o && setLocking(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认锁定工艺</AlertDialogTitle>
            <AlertDialogDescription>
              锁定后整个产品的工艺路线绑定将变为只读,且不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLock} disabled={lockLoading}>
              锁定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  // ===== 浏览态 =====
  if (editingRootId === null) {
    return (
      <PermissionGuard perm="process-flow:list">
        <PageContainer
          title="工艺路线绑定"
          description="为产品 BOM 节点绑定工艺路线,并锁定工艺以发布"
        >
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">产品</label>
              <Select value={pickedRootId || undefined} onValueChange={setPickedRootId}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="请选择产品根 BOM" />
                </SelectTrigger>
                <SelectContent>
                  {(products ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nodeName}
                      {p.productCode ? ` (${p.productCode})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!pickedRootId} onClick={enterBind}>
              <GitBranch className="size-4" />
              进入绑定
            </Button>
          </div>
        </PageContainer>
        {dialogs}
      </PermissionGuard>
    )
  }

  // ===== 绑定态 =====
  return (
    <PermissionGuard perm="process-flow:list">
      <PageContainer title="工艺路线绑定">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
          <Button variant="ghost" size="sm" onClick={back}>
            <ChevronLeft className="size-4" />
            返回
          </Button>
          <span className="text-sm font-medium">{rootName ?? '—'}</span>
          <StatusBadge status={rootStatus} />
          <div className="ml-auto flex items-center gap-2">
            {rootStatus !== 'locked' && (
              <span className="text-xs text-muted-foreground">请先在产品BOM中锁定结构</span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={rootStatus !== 'locked'}
              onClick={() => setLocking(true)}
            >
              <Lock className="size-4" />
              锁定工艺
            </Button>
          </div>
        </div>

        <MasterDetailLayout
          master={
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 text-sm font-medium">BOM 结构树</div>
              <TreeDataTable
                columns={treeColumns}
                data={treeData}
                getSubRows={(r) => r.children}
                getRowId={(r) => r.bomNode.id}
                loading={listLoading}
              />
            </div>
          }
          detail={
            <div className="space-y-4">
              {/* 选中节点信息 */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-sm font-medium">节点信息</div>
                {selected ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">节点名称</dt>
                      <dd>{selected.bomNode.nodeName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">层级</dt>
                      <dd>{levelLabel(selected.bomNode.level)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">产品编码</dt>
                      <dd>{selected.bomNode.productCode || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">绑定状态</dt>
                      <dd>
                        {selected.bomFlow ? (
                          <StatusBadge status={selected.bomFlow.status} />
                        ) : (
                          <span className="text-muted-foreground">未绑定</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">请选择左侧节点</p>
                )}
              </div>

              {/* 已绑工艺 + 操作 */}
              {selected && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium">已绑工艺</div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canWrite}
                        onClick={() => setBindOpen(true)}
                      >
                        <Link2 className="size-4" />
                        {selected.bomFlow ? '换绑' : '绑定'}
                      </Button>
                      {selected.bomFlow && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canWrite}
                          onClick={() =>
                            setUnbinding({
                              bomId: selected.bomNode.id,
                              nodeName: selected.bomNode.nodeName,
                            })
                          }
                        >
                          <Link2Off className="size-4 text-destructive" />
                          解绑
                        </Button>
                      )}
                    </div>
                  </div>
                  {selected.flow ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">工艺路线</dt>
                        <dd>{selected.flow.flow}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">描述</dt>
                        <dd>{selected.flow.flowDesc || '—'}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">备注</dt>
                        <dd>{selected.bomFlow?.remark || '—'}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">该节点尚未绑定工艺路线</p>
                  )}
                </div>
              )}

              {/* 工序预览(只读) */}
              {selected?.flow && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 text-sm font-medium">工序预览</div>
                  <DataTable
                    columns={operColumns}
                    data={selected.opers ?? []}
                    getRowId={(r) => r.relation?.id ?? r.relation?.oper ?? ''}
                  />
                </div>
              )}
            </div>
          }
        />
      </PageContainer>
      {dialogs}
    </PermissionGuard>
  )
}
