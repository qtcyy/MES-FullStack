import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TreeDataTable,
  toast,
} from '@workspace/ui'
import {
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import FormField from '@/components/FormField'
import MultiImageUpload from '@/components/MultiImageUpload'
import EquipmentForm from './EquipmentForm'
import ProcessDocumentUpload from './ProcessDocumentUpload'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import {
  processContentProducts,
  processContentList,
  processContentGet,
  processContentBomItems,
  processContentSave,
  processContentComplete,
  processEquipmentDelete,
  processDocumentDelete,
  PROCESS_UPLOAD_IMAGE_URL,
} from '@/api/technology/process-content'
import { buildBomNodeTree, type BomNodeTree } from '@/utils/productBom'
import { parseKeys, joinKeys } from '@/utils/imageKeys'
import type {
  ProcessContentDetailVO,
  ProcessContentNodeVO,
  SpProcessContent,
  SpProcessEquipment,
  SpProcessDocument,
  SpProductBomItem,
} from '@/types/technology'

const INVALIDATE = '["processContent"'

type ProcessTreeNode = BomNodeTree<ProcessContentNodeVO>

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

export default function ProcessContentList() {
  // ===== 浏览态:产品根选择 =====
  const [pickedRootId, setPickedRootId] = useState<string>('')
  // ===== 编制态选择 =====
  const [editingRootId, setEditingRootId] = useState<string | null>(null)
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null)

  // ===== 数据 =====
  const { data: products } = useQuery$(['processContent', 'products'], () => processContentProducts())
  const { data: list, loading: listLoading } = useQuery$(
    ['processContent', 'list', editingRootId],
    () => processContentList(editingRootId!),
    { enabled: !!editingRootId },
  )
  const { data: detail } = useQuery$(
    ['processContent', 'detail', selectedBomId],
    () => processContentGet(selectedBomId!),
    { enabled: !!selectedBomId },
  )

  const flat = useMemo<ProcessContentNodeVO[]>(() => list ?? [], [list])
  const treeData = useMemo<ProcessTreeNode[]>(() => buildBomNodeTree(flat), [flat])

  const rootName = useMemo(
    () => flat.find((x) => x.bomNode.id === editingRootId)?.bomNode.nodeName,
    [flat, editingRootId],
  )
  const selectedNode = useMemo(
    () => flat.find((x) => x.bomNode.id === selectedBomId),
    [flat, selectedBomId],
  )

  // ===== 导航 =====
  const enterEdit = () => {
    if (!pickedRootId) return
    setEditingRootId(pickedRootId)
    setSelectedBomId(pickedRootId)
  }
  const back = () => {
    setEditingRootId(null)
    setSelectedBomId(null)
  }

  // ===== 列定义:左侧 BOM 树 =====
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

  // ===== 浏览态 =====
  if (editingRootId === null) {
    return (
      <PermissionGuard perm="process-content:list">
        <PageContainer
          title="工艺文件编制"
          description="为产品 BOM 节点编制工艺文件:主信息、工序要求、检验、工装设备、技术文档"
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
            <Button disabled={!pickedRootId} onClick={enterEdit}>
              <FileText className="size-4" />
              进入编制
            </Button>
          </div>
        </PageContainer>
      </PermissionGuard>
    )
  }

  // ===== 编制态 =====
  // 详情编辑器以「节点 id + 已保存内容版本」为 key 重新挂载,使其内部 useState 初始化器
  // 直接以 detail 为种子(免 effect-setState),保存后 invalidate 拉到新 detail 即重置编辑态。
  const editorKey =
    selectedBomId == null
      ? 'none'
      : `${selectedBomId}:${detail?.content?.id ?? 'new'}:${detail?.content?.status ?? 'none'}`

  return (
    <PermissionGuard perm="process-content:list">
      <PageContainer title="工艺文件编制">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
          <Button variant="ghost" size="sm" onClick={back}>
            <ChevronLeft className="size-4" />
            返回
          </Button>
          <span className="text-sm font-medium">{rootName ?? '—'}</span>
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
            !selectedNode || !selectedBomId ? (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">请选择左侧节点</p>
              </div>
            ) : (
              <ProcessContentEditor
                key={editorKey}
                bomId={selectedBomId}
                nodeName={selectedNode.bomNode.nodeName}
                detail={detail}
              />
            )
          }
        />
      </PageContainer>
    </PermissionGuard>
  )
}

// ============================================================================
// 详情编辑器(主从右侧):以 key 重新挂载,useState 初始化器直接 seed 自 detail。
// ============================================================================

interface MainFormValues {
  mainInfo: string
  procContent: string
  requirements: string
  inspectionRequired: boolean
  notes: string
}

interface ProcessContentEditorProps {
  bomId: string
  nodeName: string
  detail: ProcessContentDetailVO | undefined
}

function ProcessContentEditor({ bomId, nodeName, detail }: ProcessContentEditorProps) {
  const content = detail?.content
  const contentId = content?.id
  const isCompleted = content?.status === 'completed'

  // ===== 子表单 / 确认弹窗 =====
  const [equipOpen, setEquipOpen] = useState(false)
  const [equipInitial, setEquipInitial] = useState<SpProcessEquipment | undefined>(undefined)
  const [deletingEquip, setDeletingEquip] = useState<SpProcessEquipment | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<SpProcessDocument | null>(null)
  const [completing, setCompleting] = useState(false)

  // ===== 图片状态(key/url 等长),初始化器直接 seed 自 detail =====
  const [contentImageKeys, setContentImageKeys] = useState<string[]>(() =>
    parseKeys(content?.contentImages),
  )
  const [contentImageUrls, setContentImageUrls] = useState<string[]>(
    () => detail?.contentImageUrls ?? [],
  )
  const [inspectionImageKeys, setInspectionImageKeys] = useState<string[]>(() =>
    parseKeys(content?.inspectionImages),
  )
  const [inspectionImageUrls, setInspectionImageUrls] = useState<string[]>(
    () => detail?.inspectionImageUrls ?? [],
  )

  // ===== 物料清单(只读) =====
  const { data: bomItems, loading: bomItemsLoading } = useQuery$(
    ['processContent', 'bomItems', bomId],
    () => processContentBomItems(bomId),
    { enabled: !!bomId },
  )

  // ===== 主信息表单,默认值直接 seed 自 content =====
  const { register, handleSubmit, control } = useForm<MainFormValues>({
    defaultValues: {
      mainInfo: content?.mainInfo ?? '',
      procContent: content?.content ?? '',
      requirements: content?.requirements ?? '',
      inspectionRequired: content?.inspectionRequired === '1',
      notes: content?.notes ?? '',
    },
  })

  // ===== mutations =====
  const { mutate: saveMain, loading: saveLoading } = useMutation$((b: Partial<SpProcessContent>) =>
    processContentSave(b),
  )
  const { mutate: complete, loading: completeLoading } = useMutation$((id: string) =>
    processContentComplete(id),
  )
  const { mutate: deleteEquip, loading: deleteEquipLoading } = useMutation$((id: string) =>
    processEquipmentDelete(id),
  )
  const { mutate: deleteDoc, loading: deleteDocLoading } = useMutation$((id: string) =>
    processDocumentDelete(id),
  )

  // ===== 保存主信息(不传 status) =====
  const onSaveMain = handleSubmit(async (v) => {
    try {
      await saveMain({
        id: contentId,
        bomId,
        mainInfo: v.mainInfo,
        content: v.procContent,
        requirements: v.requirements,
        inspectionRequired: v.inspectionRequired ? '1' : '0',
        contentImages: joinKeys(contentImageKeys),
        inspectionImages: joinKeys(inspectionImageKeys),
        notes: v.notes,
      })
      toast.success('已保存主信息')
      invalidate(INVALIDATE)
    } catch {
      /* toast by interceptor */
    }
  })

  // ===== 完成编制 =====
  const confirmComplete = async () => {
    if (!contentId) return
    try {
      await complete(contentId)
      toast.success('已完成编制')
      invalidate(INVALIDATE)
    } catch {
      /* toast by interceptor */
    } finally {
      setCompleting(false)
    }
  }

  // ===== 设备 / 文档 =====
  const onEquipSaved = () => {
    invalidate(INVALIDATE)
    setEquipOpen(false)
  }
  const confirmDeleteEquip = async () => {
    if (!deletingEquip?.id) return
    try {
      await deleteEquip(deletingEquip.id)
      toast.success('已删除设备')
      invalidate(INVALIDATE)
    } catch {
      /* toast by interceptor */
    } finally {
      setDeletingEquip(null)
    }
  }
  const confirmDeleteDoc = async () => {
    if (!deletingDoc?.id) return
    try {
      await deleteDoc(deletingDoc.id)
      toast.success('已删除文档')
      invalidate(INVALIDATE)
    } catch {
      /* toast by interceptor */
    } finally {
      setDeletingDoc(null)
    }
  }
  const onDocUploaded = () => {
    invalidate(INVALIDATE)
  }

  const openAddEquip = () => {
    setEquipInitial(undefined)
    setEquipOpen(true)
  }
  const openEditEquip = (e: SpProcessEquipment) => {
    setEquipInitial(e)
    setEquipOpen(true)
  }

  // ===== 列定义:工装设备 =====
  const equipColumns = useMemo<ColumnDef<SpProcessEquipment>[]>(
    () => [
      { accessorKey: 'name', header: '设备名称' },
      {
        accessorKey: 'quantity',
        header: '数量',
        cell: ({ row }) => row.original.quantity ?? 1,
      },
      {
        accessorKey: 'remark',
        header: '备注',
        cell: ({ row }) => row.original.remark || '—',
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) =>
          isCompleted ? null : (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                title="编辑"
                onClick={() => openEditEquip(row.original)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="删除"
                onClick={() => setDeletingEquip(row.original)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ),
      },
    ],
    [isCompleted],
  )

  // ===== 列定义:技术文档 =====
  const docColumns = useMemo<ColumnDef<SpProcessDocument>[]>(
    () => [
      { accessorKey: 'name', header: '文档名称' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              title="预览"
              disabled={!row.original.fileUrl}
              onClick={() => row.original.fileUrl && window.open(row.original.fileUrl, '_blank', 'noopener')}
            >
              <ExternalLink className="size-4" />
            </Button>
            {!isCompleted && (
              <Button
                variant="ghost"
                size="icon-sm"
                title="删除"
                onClick={() => setDeletingDoc(row.original)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [isCompleted],
  )

  // ===== 列定义:物料清单(只读) =====
  const bomItemColumns = useMemo<ColumnDef<SpProductBomItem>[]>(
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
    ],
    [],
  )

  const needContentTip = (
    <p className="text-sm text-muted-foreground">请先在『主信息』填写并保存。</p>
  )

  return (
    <div className="space-y-4">
      {/* 顶部:状态 + 保存 + 完成 */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium">{nodeName}</div>
        <ContentStatusBadge content={content} />
        <div className="ml-auto flex gap-2">
          {!isCompleted && (
            <>
              <Button size="sm" onClick={onSaveMain} disabled={saveLoading}>
                <Save className="size-4" />
                保存主信息
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!contentId}
                title={contentId ? undefined : '请先保存主信息'}
                onClick={() => setCompleting(true)}
              >
                <CheckCircle2 className="size-4" />
                完成编制
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs 编辑器 */}
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
            <FormField label="主信息" htmlFor="pc-main-info" required>
              <Input id="pc-main-info" disabled={isCompleted} {...register('mainInfo')} />
            </FormField>
            <FormField label="工序内容" htmlFor="pc-content" required>
              <Textarea id="pc-content" rows={5} disabled={isCompleted} {...register('procContent')} />
            </FormField>
            <div className="space-y-1.5">
              <span className="text-sm font-medium">工序图片</span>
              <MultiImageUpload
                keys={contentImageKeys}
                urls={contentImageUrls}
                onChange={(k, u) => {
                  setContentImageKeys(k)
                  setContentImageUrls(u)
                }}
                uploadUrl={PROCESS_UPLOAD_IMAGE_URL}
                disabled={isCompleted}
              />
            </div>
          </TabsContent>

          {/* 工序要求 */}
          <TabsContent value="requirements" className="space-y-4 pt-2">
            <FormField label="工序要求" htmlFor="pc-requirements">
              <Textarea id="pc-requirements" rows={6} disabled={isCompleted} {...register('requirements')} />
            </FormField>
          </TabsContent>

          {/* 检验 */}
          <TabsContent value="inspection" className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">是否需要检验</span>
              <Controller
                control={control}
                name="inspectionRequired"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isCompleted} />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium">检验图片</span>
              <MultiImageUpload
                keys={inspectionImageKeys}
                urls={inspectionImageUrls}
                onChange={(k, u) => {
                  setInspectionImageKeys(k)
                  setInspectionImageUrls(u)
                }}
                uploadUrl={PROCESS_UPLOAD_IMAGE_URL}
                disabled={isCompleted}
              />
            </div>
          </TabsContent>

          {/* 注意事项 */}
          <TabsContent value="notes" className="space-y-4 pt-2">
            <FormField label="注意事项" htmlFor="pc-notes">
              <Textarea id="pc-notes" rows={6} disabled={isCompleted} {...register('notes')} />
            </FormField>
          </TabsContent>

          {/* 工装设备 */}
          <TabsContent value="equipment" className="space-y-3 pt-2">
            {!contentId ? (
              needContentTip
            ) : (
              <>
                {!isCompleted && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={openAddEquip}>
                      <Plus className="size-4" />
                      新增设备
                    </Button>
                  </div>
                )}
                <DataTable
                  columns={equipColumns}
                  data={detail?.equipment ?? []}
                  getRowId={(r) => r.id ?? ''}
                />
              </>
            )}
          </TabsContent>

          {/* 技术文档 */}
          <TabsContent value="documents" className="space-y-3 pt-2">
            {!contentId ? (
              needContentTip
            ) : (
              <>
                {!isCompleted && (
                  <div className="flex justify-end">
                    <ProcessDocumentUpload contentId={contentId} onSaved={onDocUploaded} />
                  </div>
                )}
                <DataTable
                  columns={docColumns}
                  data={detail?.documents ?? []}
                  getRowId={(r) => r.id ?? ''}
                />
              </>
            )}
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

      {/* 对话框 */}
      <EquipmentForm
        open={equipOpen}
        onOpenChange={setEquipOpen}
        contentId={contentId ?? ''}
        initial={equipInitial}
        onSaved={onEquipSaved}
      />

      <AlertDialog open={!!deletingEquip} onOpenChange={(o) => !o && setDeletingEquip(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除设备</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除工装设备「{deletingEquip?.name}」吗?此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEquip} disabled={deleteEquipLoading}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingDoc} onOpenChange={(o) => !o && setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除文档</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除技术文档「{deletingDoc?.name}」吗?此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDoc} disabled={deleteDocLoading}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={completing} onOpenChange={(o) => !o && setCompleting(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认完成编制</AlertDialogTitle>
            <AlertDialogDescription>
              完成编制后该节点的工艺文件将变为只读,且不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete} disabled={completeLoading}>
              完成编制
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
