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
  TreeDataTable,
  toast,
} from '@workspace/ui'
import {
  ChevronLeft,
  GitBranch,
  List,
  Lock,
  Network,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import SearchForm from '@/components/SearchForm'
import { Input } from '@workspace/ui'
import BomNodeForm, { type BomNodeMode } from './BomNodeForm'
import BomItemForm from './BomItemForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import {
  productBomPage,
  productBomTree,
  productBomDelete,
  productBomLock,
  productBomNewVersion,
  productBomItems,
  productBomItemDelete,
} from '@/api/technology/product-bom'
import { pickRootSubtree } from '@/utils/productBom'
import type {
  SpProductBom,
  BomTreeNode,
  SpProductBomItem,
} from '@/types/technology'

const PAGE_SIZE = 10

/** 状态徽章:draft → 草稿(secondary)/ locked → 已锁定(destructive) */
function StatusBadge({ status }: { status?: 'draft' | 'locked' }) {
  if (status === 'locked') return <Badge variant="destructive">已锁定</Badge>
  return <Badge variant="secondary">草稿</Badge>
}

const INVALIDATE_TREE = '["productBom","tree"'
const INVALIDATE_PAGE = '["productBom","page"'
const INVALIDATE_ITEMS = '["productBom","items"'

export default function ProductBomList() {
  // ===== 视图 / 搜索 / 分页 =====
  const [view, setView] = useState<'list' | 'tree'>('list')
  const [search, setSearch] = useState({ productCodeLike: '', nodeNameLike: '' })
  const [submittedSearch, setSubmittedSearch] = useState({
    productCodeLike: '',
    nodeNameLike: '',
  })
  const [page, setPage] = useState(0) // 0-based

  // ===== 编辑态选择 =====
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // ===== 对话框开关 =====
  const [nodeFormOpen, setNodeFormOpen] = useState(false)
  const [nodeFormMode, setNodeFormMode] = useState<BomNodeMode>('create-root')
  const [nodeFormParentId, setNodeFormParentId] = useState<string | undefined>(undefined)
  const [nodeFormInitial, setNodeFormInitial] = useState<
    Pick<SpProductBom, 'id' | 'nodeName' | 'productCode' | 'remark' | 'sortOrder'> | undefined
  >(undefined)

  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [itemFormInitial, setItemFormInitial] = useState<SpProductBomItem | undefined>(undefined)

  const [deletingNode, setDeletingNode] = useState<{ id: string; nodeName: string } | null>(null)
  const [deletingItem, setDeletingItem] = useState<SpProductBomItem | null>(null)
  const [locking, setLocking] = useState(false)

  // ===== 数据 =====
  const { data: pageData, loading: pageLoading } = useQuery$(
    ['productBom', 'page', submittedSearch, page],
    () => productBomPage({ ...submittedSearch, current: page + 1, size: PAGE_SIZE }),
  )
  const { data: tree, loading: treeLoading } = useQuery$(
    ['productBom', 'tree'],
    () => productBomTree(),
  )

  const rootTree = useMemo(
    () => (tree ? pickRootSubtree(tree, selectedRootId ?? '') : undefined),
    [tree, selectedRootId],
  )
  const selectedNode = useMemo(
    () => (rootTree ? pickRootSubtree([rootTree], selectedNodeId ?? '') : undefined),
    [rootTree, selectedNodeId],
  )

  const { data: items, loading: itemsLoading } = useQuery$(
    ['productBom', 'items', selectedNodeId],
    () => productBomItems(selectedNodeId!),
    { enabled: !!selectedNodeId },
  )

  const canWrite = !!rootTree && rootTree.status !== 'locked'

  // ===== mutations =====
  const { mutate: deleteNode } = useMutation$((id: string) => productBomDelete(id))
  const { mutate: deleteItem } = useMutation$((id: string) => productBomItemDelete(id))
  const { mutate: lockTree, loading: lockLoading } = useMutation$(() =>
    productBomLock(selectedRootId!),
  )
  const { mutate: newVersion } = useMutation$(() => productBomNewVersion(selectedRootId!))

  // ===== 导航 =====
  const enterEdit = (rootId: string) => {
    setSelectedRootId(rootId)
    setSelectedNodeId(rootId)
  }
  const backToList = () => {
    setSelectedRootId(null)
    setSelectedNodeId(null)
  }

  // ===== 搜索 =====
  const onSearch = () => {
    setSubmittedSearch(search)
    setPage(0)
  }
  const onReset = () => {
    setSearch({ productCodeLike: '', nodeNameLike: '' })
    setSubmittedSearch({ productCodeLike: '', nodeNameLike: '' })
    setPage(0)
  }

  // ===== 节点表单打开 =====
  const openCreateRoot = () => {
    setNodeFormMode('create-root')
    setNodeFormParentId(undefined)
    setNodeFormInitial(undefined)
    setNodeFormOpen(true)
  }
  const openAddChild = () => {
    if (!selectedNodeId) return
    setNodeFormMode('add-child')
    setNodeFormParentId(selectedNodeId)
    setNodeFormInitial(undefined)
    setNodeFormOpen(true)
  }
  const openEditNode = () => {
    if (!selectedNode) return
    setNodeFormMode('edit')
    setNodeFormParentId(undefined)
    setNodeFormInitial(selectedNode)
    setNodeFormOpen(true)
  }

  const onNodeSaved = (newId: string) => {
    invalidate(INVALIDATE_TREE)
    invalidate(INVALIDATE_PAGE)
    setNodeFormOpen(false)
    if (nodeFormMode === 'create-root') enterEdit(newId)
  }

  // ===== 物料行表单打开 =====
  const openAddItem = () => {
    setItemFormInitial(undefined)
    setItemFormOpen(true)
  }
  const openEditItem = (item: SpProductBomItem) => {
    setItemFormInitial(item)
    setItemFormOpen(true)
  }
  const onItemSaved = () => {
    invalidate(INVALIDATE_ITEMS)
    setItemFormOpen(false)
  }

  // ===== 删除 / 锁定 / 新版本 =====
  const confirmDeleteNode = async () => {
    if (!deletingNode) return
    try {
      await deleteNode(deletingNode.id)
      toast.success('已删除节点')
      invalidate(INVALIDATE_TREE)
      invalidate(INVALIDATE_PAGE)
      setSelectedNodeId(selectedRootId)
    } catch {
      /* toast by interceptor */
    } finally {
      setDeletingNode(null)
    }
  }
  const confirmDeleteItem = async () => {
    if (!deletingItem?.id) return
    try {
      await deleteItem(deletingItem.id)
      toast.success('已删除物料行')
      invalidate(INVALIDATE_ITEMS)
    } catch {
      /* toast by interceptor */
    } finally {
      setDeletingItem(null)
    }
  }
  const confirmLock = async () => {
    try {
      await lockTree()
      toast.success('已锁定')
      invalidate(INVALIDATE_TREE)
      invalidate(INVALIDATE_PAGE)
    } catch {
      /* toast by interceptor */
    } finally {
      setLocking(false)
    }
  }
  const handleNewVersion = async () => {
    try {
      const newId = await newVersion()
      toast.success('新版本已创建')
      invalidate(INVALIDATE_TREE)
      invalidate(INVALIDATE_PAGE)
      enterEdit(newId)
    } catch {
      /* toast by interceptor */
    }
  }

  // ===== 列定义:浏览态列表 =====
  const listColumns = useMemo<ColumnDef<SpProductBom>[]>(
    () => [
      { accessorKey: 'nodeName', header: '节点名称' },
      {
        accessorKey: 'productCode',
        header: '产品编码',
        cell: ({ row }) => row.original.productCode || '—',
      },
      {
        accessorKey: 'version',
        header: '版本',
        cell: ({ row }) => row.original.version || '—',
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-sm"
              title="进入编辑"
              onClick={() => enterEdit(row.original.id)}
            >
              <Pencil className="size-4" />
            </Button>
            {row.original.status === 'draft' && (
              <Button
                variant="ghost"
                size="icon-sm"
                title="删除"
                onClick={() =>
                  setDeletingNode({
                    id: row.original.id,
                    nodeName: row.original.nodeName,
                  })
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [],
  )

  // ===== 列定义:浏览态树 =====
  const browseTreeColumns = useMemo<ColumnDef<BomTreeNode>[]>(
    () => [
      { accessorKey: 'nodeName', header: '节点名称' },
      {
        accessorKey: 'version',
        header: '版本',
        cell: ({ row }) => row.original.version || '—',
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'itemCount',
        header: '物料数',
        cell: ({ row }) => row.original.itemCount ?? 0,
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) =>
          row.original.level === 0 ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => enterEdit(row.original.id)}
            >
              进入编辑
            </Button>
          ) : null,
      },
    ],
    [],
  )

  // ===== 列定义:编辑态左树 =====
  const editTreeColumns = useMemo<ColumnDef<BomTreeNode>[]>(
    () => [
      {
        accessorKey: 'nodeName',
        header: '节点名称',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelectedNodeId(row.original.id)}
            className={
              row.original.id === selectedNodeId
                ? 'text-left font-medium text-primary'
                : 'text-left hover:text-primary'
            }
          >
            {row.original.nodeName}
          </button>
        ),
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'itemCount',
        header: '物料数',
        cell: ({ row }) => row.original.itemCount ?? 0,
      },
    ],
    [selectedNodeId],
  )

  // ===== 列定义:编辑态物料行 =====
  const itemColumns = useMemo<ColumnDef<SpProductBomItem>[]>(
    () => [
      { accessorKey: 'materialCode', header: '物料编码' },
      {
        accessorKey: 'materialDesc',
        header: '物料描述',
        cell: ({ row }) => row.original.materialDesc || '—',
      },
      { accessorKey: 'quantity', header: '数量' },
      {
        accessorKey: 'unit',
        header: '单位',
        cell: ({ row }) => row.original.unit || '—',
      },
      {
        accessorKey: 'itemType',
        header: '类型',
        cell: ({ row }) =>
          row.original.itemType === 'bom_ref' ? '子 BOM 引用' : '物料',
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              title="编辑"
              disabled={!canWrite}
              onClick={() => openEditItem(row.original)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="删除"
              disabled={!canWrite}
              onClick={() => setDeletingItem(row.original)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [canWrite],
  )

  // ===== 浏览态视图切换按钮组 =====
  const viewSwitch = (
    <div className="flex gap-1 rounded-md border border-border p-0.5">
      <Button
        variant={view === 'list' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setView('list')}
      >
        <List className="size-4" />
        列表
      </Button>
      <Button
        variant={view === 'tree' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setView('tree')}
      >
        <Network className="size-4" />
        树
      </Button>
    </div>
  )

  // 共用对话框(浏览/编辑态均渲染)
  const dialogs = (
    <>
      <BomNodeForm
        open={nodeFormOpen}
        onOpenChange={setNodeFormOpen}
        mode={nodeFormMode}
        parentId={nodeFormParentId}
        initial={nodeFormInitial}
        onSaved={onNodeSaved}
      />
      <BomItemForm
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        bomId={selectedNodeId ?? ''}
        initial={itemFormInitial}
        onSaved={onItemSaved}
      />

      <AlertDialog open={!!deletingNode} onOpenChange={(o) => !o && setDeletingNode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除节点</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除节点「{deletingNode?.nodeName}」吗?将级联删除其子节点与物料行,且不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNode}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingItem} onOpenChange={(o) => !o && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除物料行</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除物料「{deletingItem?.materialCode}」吗?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={locking} onOpenChange={(o) => !o && setLocking(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认锁定</AlertDialogTitle>
            <AlertDialogDescription>
              锁定后整棵 BOM 树将变为只读,且不可撤销。
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
  if (selectedRootId === null) {
    return (
      <PermissionGuard perm="product-bom:list">
        <PageContainer
          title="产品BOM管理"
          description="管理产品 BOM 树结构、节点物料与版本"
          actions={
            <>
              {viewSwitch}
              <Button onClick={openCreateRoot}>
                <Plus className="size-4" />
                新建根 BOM
              </Button>
            </>
          }
        >
          {view === 'list' ? (
            <>
              <SearchForm onSearch={onSearch} onReset={onReset}>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">产品编码</label>
                  <Input
                    value={search.productCodeLike}
                    onChange={(e) =>
                      setSearch((s) => ({ ...s, productCodeLike: e.target.value }))
                    }
                    placeholder="产品编码"
                    className="w-44"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">节点名称</label>
                  <Input
                    value={search.nodeNameLike}
                    onChange={(e) =>
                      setSearch((s) => ({ ...s, nodeNameLike: e.target.value }))
                    }
                    placeholder="节点名称"
                    className="w-44"
                  />
                </div>
              </SearchForm>

              <DataTable
                columns={listColumns}
                data={pageData?.records ?? []}
                loading={pageLoading}
                loadingRowCount={PAGE_SIZE}
                getRowId={(r) => r.id}
                onRowClick={(r) => enterEdit(r.id)}
                pagination={{
                  mode: 'server',
                  pageIndex: (pageData?.current ?? page + 1) - 1,
                  pageSize: PAGE_SIZE,
                  totalPages: pageData?.pages ?? 1,
                  totalRows: pageData?.total,
                  onPageChange: (idx) => setPage(idx),
                }}
              />
            </>
          ) : (
            <TreeDataTable
              columns={browseTreeColumns}
              data={tree ?? []}
              getSubRows={(r) => r.children}
              getRowId={(r) => r.id}
              loading={treeLoading}
            />
          )}
        </PageContainer>
        {dialogs}
      </PermissionGuard>
    )
  }

  // ===== 编辑态 =====
  return (
    <PermissionGuard perm="product-bom:list">
      <PageContainer title="产品BOM编辑">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
          <Button variant="ghost" size="sm" onClick={backToList}>
            <ChevronLeft className="size-4" />
            返回列表
          </Button>
          <StatusBadge status={rootTree?.status} />
          {rootTree?.version && (
            <Badge variant="outline">版本 {rootTree.version}</Badge>
          )}
          <div className="ml-auto flex gap-2">
            {rootTree?.status === 'draft' && (
              <Button variant="outline" size="sm" onClick={() => setLocking(true)}>
                <Lock className="size-4" />
                锁定整树
              </Button>
            )}
            {rootTree?.status === 'locked' && (
              <Button variant="outline" size="sm" onClick={handleNewVersion}>
                <GitBranch className="size-4" />
                创建新版本
              </Button>
            )}
          </div>
        </div>

        <MasterDetailLayout
          master={
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 text-sm font-medium">BOM 结构树</div>
              <TreeDataTable
                columns={editTreeColumns}
                data={rootTree ? [rootTree] : []}
                getSubRows={(r) => r.children}
                getRowId={(r) => r.id}
                loading={treeLoading}
              />
            </div>
          }
          detail={
            <div className="space-y-4">
              {/* 选中节点信息 */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium">节点信息</div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canWrite}
                      onClick={openAddChild}
                    >
                      <Plus className="size-4" />
                      加子节点
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canWrite}
                      onClick={openEditNode}
                    >
                      <Pencil className="size-4" />
                      编辑节点
                    </Button>
                    {selectedNode && (selectedNode.level ?? 0) > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canWrite}
                        onClick={() =>
                          selectedNode &&
                          setDeletingNode({ id: selectedNode.id, nodeName: selectedNode.nodeName })
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                        删除节点
                      </Button>
                    )}
                  </div>
                </div>
                {selectedNode ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">节点名称</dt>
                      <dd>{selectedNode.nodeName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">BOM 编码</dt>
                      <dd>{selectedNode.bomCode || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">层级</dt>
                      <dd>{selectedNode.level ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">版本</dt>
                      <dd>{selectedNode.version || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">状态</dt>
                      <dd>
                        <StatusBadge status={selectedNode.status} />
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">备注</dt>
                      <dd>{selectedNode.remark || '—'}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">请选择左侧节点</p>
                )}
              </div>

              {/* 物料行 */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium">物料行</div>
                  <Button
                    size="sm"
                    disabled={!canWrite || !selectedNodeId}
                    onClick={openAddItem}
                  >
                    <Plus className="size-4" />
                    新增物料行
                  </Button>
                </div>
                <DataTable
                  columns={itemColumns}
                  data={items ?? []}
                  loading={itemsLoading}
                  getRowId={(r) => r.id ?? ''}
                />
              </div>
            </div>
          }
        />
      </PageContainer>
      {dialogs}
    </PermissionGuard>
  )
}
