import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Badge,
  DataTable,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TreeDataTable,
} from '@workspace/ui'
import { CheckCircle2, ExternalLink, FileText } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import MultiImageUpload from '@/components/MultiImageUpload'
import { useQuery$ } from '@/http/hooks'
import {
  processContentProducts,
  processContentList,
  processContentGet,
  processContentBomItems,
} from '@/api/technology/process-content'
import { buildBomNodeTree, type BomNodeTree } from '@/utils/productBom'
import { parseKeys } from '@/utils/imageKeys'
import type {
  ProcessContentNodeVO,
  SpProcessContent,
  SpProcessEquipment,
  SpProcessDocument,
  SpProductBomItem,
} from '@/types/technology'

type ProcessTreeNode = BomNodeTree<ProcessContentNodeVO>

const noop = () => {}

/** 编制状态徽章:completed → 已完成(绿)/ 有 content draft → 草稿 / 无 content → 未编制 */
function ContentStatusBadge({ content }: { content: SpProcessContent | null | undefined }) {
  if (content?.status === 'completed') {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
        <CheckCircle2 className="size-3" />
        已完成
      </Badge>
    )
  }
  if (content) return <Badge variant="secondary">草稿</Badge>
  return <Badge variant="outline">未编制</Badge>
}

/** 层级文案:0 产品 / 1 半成品 / ≥2 组件 */
function levelLabel(level?: number): string {
  const lv = level ?? 0
  if (lv === 0) return '产品'
  if (lv === 1) return '半成品'
  return '组件'
}

/** 只读图片区:有图展示,无图给占位 */
function ReadonlyImages({ keys, urls }: { keys: string[]; urls: string[] }) {
  if (keys.length === 0) return <p className="text-sm text-muted-foreground">暂无图片</p>
  return <MultiImageUpload keys={keys} urls={urls} onChange={noop} disabled />
}

/**
 * 工艺查询只读页(菜单 116,/technology/process-query)。
 * 产品 → BOM 树 → 只读工艺文件详情。复用 process-content 的 4 个只读 GET 端点,
 * 纯查看:无任何编辑/上传/状态变更入口(与编制页 ProcessContentList 的唯一区别)。
 */
export default function ProcessQueryPage() {
  const [rootId, setRootId] = useState<string>('')
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null)

  // ===== 数据(独立 processQuery 缓存键,避免与编制页缓存串扰)=====
  const { data: products } = useQuery$(['processQuery', 'products'], () => processContentProducts())
  const { data: list, loading: listLoading } = useQuery$(
    ['processQuery', 'list', rootId],
    () => processContentList(rootId),
    { enabled: !!rootId },
  )
  const { data: detail } = useQuery$(
    ['processQuery', 'detail', selectedBomId],
    () => processContentGet(selectedBomId!),
    { enabled: !!selectedBomId },
  )
  const { data: bomItems, loading: bomItemsLoading } = useQuery$(
    ['processQuery', 'bomItems', selectedBomId],
    () => processContentBomItems(selectedBomId!),
    { enabled: !!selectedBomId },
  )

  const flat = useMemo<ProcessContentNodeVO[]>(() => list ?? [], [list])
  const treeData = useMemo<ProcessTreeNode[]>(() => buildBomNodeTree(flat), [flat])
  const selectedNode = useMemo(
    () => flat.find((x) => x.bomNode.id === selectedBomId),
    [flat, selectedBomId],
  )

  const onPickProduct = (v: string) => {
    setRootId(v)
    setSelectedBomId(v) // 自动选中产品根节点
  }

  // ===== 左侧 BOM 树列 =====
  const treeColumns = useMemo<ColumnDef<ProcessTreeNode>[]>(
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
        id: 'status',
        header: '编制状态',
        cell: ({ row }) => <ContentStatusBadge content={row.original.content} />,
      },
    ],
    [selectedBomId],
  )

  // ===== 工装设备列(只读,无操作)=====
  const equipColumns = useMemo<ColumnDef<SpProcessEquipment>[]>(
    () => [
      { accessorKey: 'name', header: '设备名称' },
      { accessorKey: 'quantity', header: '数量', cell: ({ row }) => row.original.quantity ?? 1 },
      { accessorKey: 'remark', header: '备注', cell: ({ row }) => row.original.remark || '—' },
    ],
    [],
  )

  // ===== 技术文档列(只读,仅预览)=====
  const docColumns = useMemo<ColumnDef<SpProcessDocument>[]>(
    () => [
      { accessorKey: 'name', header: '文档名称' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <button
            type="button"
            title="预览"
            disabled={!row.original.fileUrl}
            onClick={() =>
              row.original.fileUrl && window.open(row.original.fileUrl, '_blank', 'noopener')
            }
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-40"
          >
            <ExternalLink className="size-4" />
            预览
          </button>
        ),
      },
    ],
    [],
  )

  // ===== 物料清单列(只读)=====
  const bomItemColumns = useMemo<ColumnDef<SpProductBomItem>[]>(
    () => [
      { accessorKey: 'materialCode', header: '物料编码' },
      {
        accessorKey: 'materialDesc',
        header: '物料描述',
        cell: ({ row }) => row.original.materialDesc || '—',
      },
      { accessorKey: 'quantity', header: '数量' },
      { accessorKey: 'unit', header: '单位', cell: ({ row }) => row.original.unit || '—' },
    ],
    [],
  )

  const content = detail?.content ?? null

  return (
    <PermissionGuard perm="process-query:list">
      <PageContainer
        title="产品工艺查询"
        description="按产品浏览 BOM 结构,只读查看各节点工艺文件:主信息、工序要求、检验、工装设备、技术文档、物料清单"
      >
        {/* 产品选择 */}
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">产品</label>
            <Select value={rootId || undefined} onValueChange={onPickProduct}>
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
        </div>

        {!rootId ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
            <FileText className="size-4" />
            请选择产品查看其工艺文件
          </div>
        ) : (
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
              !selectedNode || !selectedBomId ? (
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">请选择左侧节点</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 顶部:节点名 + 编制状态 */}
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
                    <div className="text-sm font-medium">{selectedNode.bomNode.nodeName}</div>
                    <ContentStatusBadge content={content} />
                  </div>

                  {/* 只读 Tabs */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <Tabs defaultValue="main" className="w-full">
                      <TabsList className="flex-wrap">
                        <TabsTrigger value="main">主信息</TabsTrigger>
                        <TabsTrigger value="requirements">工序要求</TabsTrigger>
                        <TabsTrigger value="inspection">检验</TabsTrigger>
                        <TabsTrigger value="notes">注意事项</TabsTrigger>
                        <TabsTrigger value="equipment">工装设备</TabsTrigger>
                        <TabsTrigger value="documents">技术文档</TabsTrigger>
                        <TabsTrigger value="bomItems">物料清单</TabsTrigger>
                      </TabsList>

                      {/* 主信息 */}
                      <TabsContent value="main" className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <span className="text-sm font-medium">主信息</span>
                          <Textarea value={content?.mainInfo ?? ''} readOnly rows={2} />
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-sm font-medium">工序内容</span>
                          <Textarea value={content?.content ?? ''} readOnly rows={5} />
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-sm font-medium">工序图片</span>
                          <ReadonlyImages
                            keys={parseKeys(content?.contentImages)}
                            urls={detail?.contentImageUrls ?? []}
                          />
                        </div>
                      </TabsContent>

                      {/* 工序要求 */}
                      <TabsContent value="requirements" className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <span className="text-sm font-medium">工序要求</span>
                          <Textarea value={content?.requirements ?? ''} readOnly rows={6} />
                        </div>
                      </TabsContent>

                      {/* 检验 */}
                      <TabsContent value="inspection" className="space-y-4 pt-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">是否需要检验</span>
                          <Badge variant={content?.inspectionRequired === '1' ? 'default' : 'outline'}>
                            {content?.inspectionRequired === '1' ? '是' : '否'}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-sm font-medium">检验图片</span>
                          <ReadonlyImages
                            keys={parseKeys(content?.inspectionImages)}
                            urls={detail?.inspectionImageUrls ?? []}
                          />
                        </div>
                      </TabsContent>

                      {/* 注意事项 */}
                      <TabsContent value="notes" className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <span className="text-sm font-medium">注意事项</span>
                          <Textarea value={content?.notes ?? ''} readOnly rows={6} />
                        </div>
                      </TabsContent>

                      {/* 工装设备(只读) */}
                      <TabsContent value="equipment" className="space-y-3 pt-2">
                        <DataTable
                          columns={equipColumns}
                          data={detail?.equipment ?? []}
                          getRowId={(r) => r.id ?? ''}
                        />
                      </TabsContent>

                      {/* 技术文档(只读,仅预览) */}
                      <TabsContent value="documents" className="space-y-3 pt-2">
                        <DataTable
                          columns={docColumns}
                          data={detail?.documents ?? []}
                          getRowId={(r) => r.id ?? ''}
                        />
                      </TabsContent>

                      {/* 物料清单(只读) */}
                      <TabsContent value="bomItems" className="space-y-3 pt-2">
                        <DataTable
                          columns={bomItemColumns}
                          data={bomItems ?? []}
                          loading={bomItemsLoading}
                          getRowId={(r) => r.id ?? ''}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )
            }
          />
        )}
      </PageContainer>
    </PermissionGuard>
  )
}
