<template>
  <PageContainer>
    <!-- ════════════════ 浏览态 ════════════════ -->
    <template v-if="!editingRootId">
      <div class="pb-toolbar">
        <el-radio-group v-model="view" size="small">
          <el-radio-button value="list">列表</el-radio-button>
          <el-radio-button value="tree">树视图</el-radio-button>
        </el-radio-group>
        <el-button v-permission="'product-bom:list'" type="primary" :icon="Plus" @click="openCreateRoot">新建产品 BOM</el-button>
      </div>

      <!-- 列表视图:根节点分页 -->
      <template v-if="view === 'list'">
        <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
          <el-form-item label="产品编码">
            <el-input v-model="search.productCodeLike" placeholder="产品编码" clearable />
          </el-form-item>
          <el-form-item label="节点名称">
            <el-input v-model="search.nodeNameLike" placeholder="节点名称" clearable />
          </el-form-item>
        </SearchForm>

        <DataTable
          :data="rootRows"
          :loading="listLoading"
          :columns="rootColumns"
          :pager="pager"
          @page-change="handlePageChange"
          @size-change="handleSizeChange"
        >
          <template #col-status="{ row }">
            <el-tag :type="(row as SpProductBom).status === 'locked' ? 'warning' : 'info'" size="small" disable-transitions>
              {{ (row as SpProductBom).status === 'locked' ? '已锁定' : '草稿' }}
            </el-tag>
          </template>
          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click="enterEdit((row as SpProductBom).id)">进入编辑</el-button>
            <el-button
              type="danger"
              link
              size="small"
              :disabled="(row as SpProductBom).status === 'locked'"
              @click="handleDeleteRoot(row as SpProductBom)"
            >删除</el-button>
          </template>
        </DataTable>
      </template>

      <!-- 树视图:全量森林 -->
      <template v-else>
        <TreeTable :data="treeData ?? []" :loading="treeLoading" :columns="treeColumns" :action-width="120">
          <template #col-status="{ row }">
            <el-tag :type="(row as BomTreeNode).status === 'locked' ? 'warning' : 'info'" size="small" disable-transitions>
              {{ (row as BomTreeNode).status === 'locked' ? '已锁定' : '草稿' }}
            </el-tag>
          </template>
          <template #actions="{ row }">
            <el-button v-if="(row as BomTreeNode).level === 0" type="primary" link size="small" @click="enterEdit((row as BomTreeNode).id)">进入编辑</el-button>
          </template>
        </TreeTable>
      </template>
    </template>

    <!-- ════════════════ 编辑态 ════════════════ -->
    <template v-else>
      <div class="pb-edit-header">
        <el-button :icon="Back" size="small" @click="exitEdit">返回</el-button>
        <span class="pb-edit-header__name">{{ subtree?.nodeName ?? '' }}</span>
        <el-tag :type="rootLocked ? 'warning' : 'info'" size="small" disable-transitions>
          {{ rootLocked ? '已锁定' : '草稿' }}
        </el-tag>
        <span class="pb-edit-header__version">版本 {{ subtree?.version ?? '-' }}</span>
        <div class="pb-edit-header__ops">
          <el-button v-if="!rootLocked" type="warning" :icon="Lock" size="small" @click="handleLock">锁定整树</el-button>
          <el-button v-else type="primary" :icon="CopyDocument" size="small" @click="handleNewVersion">创建新版本</el-button>
        </div>
      </div>

      <MasterDetailLayout :has-selection="!!selectedNode">
        <template #master>
          <TreeTable
            :data="subtree ? [subtree] : []"
            :loading="treeLoading"
            :columns="structColumns"
          >
            <template #col-nodeName="{ row }">
              <span
                :class="selectedNodeId === (row as BomTreeNode).id ? 'pb-node-selected' : 'pb-node'"
                @click="selectNode((row as BomTreeNode).id)"
              >{{ (row as BomTreeNode).nodeName }}</span>
            </template>
          </TreeTable>
        </template>

        <template #detail>
          <BomNodeDetail
            v-if="selectedNode"
            :node="selectedNode"
            :is-root="selectedNodeId === editingRootId"
            :can-write="!rootLocked"
            :items="items"
            :items-loading="itemsLoading"
            @add-child="openAddChild"
            @edit-node="openEditNode"
            @delete-node="handleDeleteNode"
            @add-item="openAddItem"
            @edit-item="openEditItem"
            @delete-item="handleDeleteItem"
          />
        </template>

        <template #detail-empty>
          <el-empty description="请点击左侧结构树节点" />
        </template>
      </MasterDetailLayout>
    </template>

    <!-- 弹窗 -->
    <BomNodeForm
      v-model="nodeDialogVisible"
      :mode="nodeMode"
      :parent-id="nodeParentId"
      :model="editingNode"
      :loading="submitLoading"
      @submit="handleNodeSubmit"
    />
    <BomItemForm
      v-model="itemDialogVisible"
      :bom-id="selectedNodeId ?? ''"
      :model="editingItem"
      :loading="submitLoading"
      @submit="handleItemSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Back, Lock, CopyDocument } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import TreeTable from '@/components/TreeTable.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import BomNodeForm from './BomNodeForm.vue'
import BomItemForm from './BomItemForm.vue'
import BomNodeDetail from './BomNodeDetail.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import {
  productBomPage, productBomTree, productBomSave, productBomDelete,
  productBomLock, productBomNewVersion,
  productBomItems, productBomItemSave, productBomItemDelete,
} from '@/api/technology/productBom'
import { pickBomSubtree, findBomNode, canWriteBom, type NodeMode } from '@/utils/productBom'
import type { SpProductBom, BomTreeNode, SpProductBomItem } from '@/types/technology'

// ─── 浏览态:列表 ───────────────────────────────────────────────
const view = ref<'list' | 'tree'>('list')
const search = reactive<{ productCodeLike: string; nodeNameLike: string }>({
  productCodeLike: '',
  nodeNameLike: '',
})
const { pager, setTotal, reset } = usePagination()

const { data: pageData, loading: listLoading, run: listRun } = useRequest(
  () => productBomPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)
const rootRows = computed<SpProductBom[]>(() => {
  const r = pageData.value
  if (r) setTotal(r.total)
  return r?.records ?? []
})

function handleSearch() { reset(); listRun() }
function handleReset() { search.productCodeLike = ''; search.nodeNameLike = ''; reset(); listRun() }
function handlePageChange(p: number) { pager.current = p; listRun() }
function handleSizeChange(s: number) { pager.size = s; reset(); listRun() }

// ─── 浏览态/编辑态共用:全量树 ─────────────────────────────────
const { data: treeData, loading: treeLoading, run: treeRun } = useRequest(
  productBomTree, { immediate: true, initialData: [] as BomTreeNode[] },
)

// ─── 编辑态 ─────────────────────────────────────────────────────
const editingRootId = ref<string | null>(null)
const selectedNodeId = ref<string | null>(null)

const subtree = computed<BomTreeNode | undefined>(() =>
  editingRootId.value ? pickBomSubtree(treeData.value ?? [], editingRootId.value) : undefined,
)
const rootLocked = computed(() => !canWriteBom(subtree.value?.status))
const selectedNode = computed<BomTreeNode | undefined>(() =>
  subtree.value && selectedNodeId.value ? findBomNode(subtree.value, selectedNodeId.value) : undefined,
)

const items = ref<SpProductBomItem[]>([])
const itemsLoading = ref(false)
async function loadItems(nodeId: string) {
  itemsLoading.value = true
  try {
    items.value = await productBomItems(nodeId)
  } catch {
    items.value = []
  } finally {
    itemsLoading.value = false
  }
}

async function enterEdit(rootId: string) {
  items.value = []
  editingRootId.value = rootId
  selectedNodeId.value = rootId
  await treeRun()
  await loadItems(rootId)
}
function exitEdit() {
  editingRootId.value = null
  selectedNodeId.value = null
  items.value = []
  listRun()
}
function selectNode(id: string) {
  selectedNodeId.value = id
  // fire-and-forget:节点切换极少高频,慢响应下 last-write-wins 可接受(作业场景已知局限)
  loadItems(id)
}

// 树变化后(增删节点)重拉树并保持选中(若节点已删则回落根)
async function refreshTree() {
  await treeRun()
  if (editingRootId.value && selectedNodeId.value) {
    const still = subtree.value && findBomNode(subtree.value, selectedNodeId.value)
    if (!still) {
      selectedNodeId.value = editingRootId.value
    }
    if (selectedNodeId.value) await loadItems(selectedNodeId.value)
  }
}

// ─── 节点弹窗 ───────────────────────────────────────────────────
const nodeDialogVisible = ref(false)
const nodeMode = ref<NodeMode>('create-root')
const nodeParentId = ref<string | undefined>(undefined)
const editingNode = ref<Partial<SpProductBom> | null>(null)
const submitLoading = ref(false)

function openCreateRoot() {
  nodeMode.value = 'create-root'
  nodeParentId.value = undefined
  editingNode.value = null
  nodeDialogVisible.value = true
}
function openAddChild() {
  nodeMode.value = 'add-child'
  nodeParentId.value = selectedNodeId.value ?? undefined
  editingNode.value = null
  nodeDialogVisible.value = true
}
function openEditNode() {
  if (!selectedNode.value) return
  nodeMode.value = 'edit'
  nodeParentId.value = undefined
  editingNode.value = {
    id: selectedNode.value.id,
    nodeName: selectedNode.value.nodeName,
    remark: selectedNode.value.remark,
    sortOrder: selectedNode.value.sortOrder,
  }
  nodeDialogVisible.value = true
}

async function handleNodeSubmit(dto: Partial<SpProductBom>) {
  submitLoading.value = true
  try {
    const newId = await productBomSave(dto)
    ElMessage.success('保存成功')
    nodeDialogVisible.value = false
    if (nodeMode.value === 'create-root') {
      // 新建根:刷新列表 + 进入编辑
      await enterEdit(newId)
    } else {
      await refreshTree()
    }
  } finally {
    submitLoading.value = false
  }
}

async function handleDeleteRoot(row: SpProductBom) {
  try {
    await ElMessageBox.confirm(`确认删除产品 BOM「${row.nodeName}」?将级联删除整棵树及物料行。`, '提示', {
      type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await productBomDelete(row.id)
    ElMessage.success('删除成功')
    listRun()
    treeRun()
  } catch { /* 拦截器已提示 */ }
}

async function handleDeleteNode() {
  if (!selectedNode.value) return
  try {
    await ElMessageBox.confirm(`确认删除节点「${selectedNode.value.nodeName}」?将级联删除其子节点与物料行。`, '提示', {
      type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await productBomDelete(selectedNode.value.id)
    ElMessage.success('删除成功')
    await refreshTree()
  } catch { /* 拦截器已提示 */ }
}

// ─── 物料行弹窗 ─────────────────────────────────────────────────
const itemDialogVisible = ref(false)
const editingItem = ref<Partial<SpProductBomItem> | null>(null)

function openAddItem() {
  editingItem.value = null
  itemDialogVisible.value = true
}
function openEditItem(row: SpProductBomItem) {
  editingItem.value = { ...row }
  itemDialogVisible.value = true
}

async function handleItemSubmit(dto: Partial<SpProductBomItem>) {
  submitLoading.value = true
  try {
    await productBomItemSave(dto)
    ElMessage.success('保存成功')
    itemDialogVisible.value = false
    if (selectedNodeId.value) await loadItems(selectedNodeId.value)
    treeRun() // itemCount 变化
  } finally {
    submitLoading.value = false
  }
}

async function handleDeleteItem(row: SpProductBomItem) {
  try {
    await ElMessageBox.confirm(`确认删除物料行「${row.materialDesc ?? row.materialCode}」?`, '提示', {
      type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await productBomItemDelete(row.id!)
    ElMessage.success('删除成功')
    if (selectedNodeId.value) await loadItems(selectedNodeId.value)
    treeRun()
  } catch { /* 拦截器已提示 */ }
}

// ─── 锁定 / 新版本 ──────────────────────────────────────────────
async function handleLock() {
  if (!editingRootId.value) return
  try {
    await ElMessageBox.confirm('锁定后整棵树将变为只读,不能再增删改节点与物料行。确认锁定?', '提示', {
      type: 'warning', confirmButtonText: '确认锁定', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await productBomLock(editingRootId.value)
    ElMessage.success('已锁定')
    await refreshTree()
  } catch { /* 拦截器已提示 */ }
}

async function handleNewVersion() {
  if (!editingRootId.value) return
  try {
    await ElMessageBox.confirm('将复制当前锁定版本派生一个新草稿版本,确认?', '提示', {
      type: 'info', confirmButtonText: '创建新版本', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    const newRootId = await productBomNewVersion(editingRootId.value)
    ElMessage.success('已创建新版本')
    await enterEdit(newRootId)
  } catch { /* 拦截器已提示 */ }
}

// ─── 列定义 ─────────────────────────────────────────────────────
const rootColumns: Column[] = [
  { prop: 'productCode', label: '产品编码', width: 140 },
  { prop: 'nodeName', label: '产品名称', minWidth: 160 },
  { prop: 'version', label: '版本', width: 90 },
  { prop: 'status', label: '状态', width: 90 },
  { prop: 'createTime', label: '创建时间', minWidth: 160 },
]
const treeColumns: Column[] = [
  { prop: 'nodeName', label: '节点', minWidth: 240 },
  { prop: 'version', label: '版本', width: 90 },
  { prop: 'status', label: '状态', width: 90 },
  { prop: 'itemCount', label: '物料数', width: 90 },
]
const structColumns: Column[] = [
  { prop: 'nodeName', label: '结构', minWidth: 220 },
  { prop: 'level', label: '层级', width: 70 },
]
</script>

<style scoped>
.pb-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); margin-bottom: var(--sp-3); flex-wrap: wrap; }
.pb-edit-header { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); flex-wrap: wrap; }
.pb-edit-header__name { font-size: 15px; font-weight: 600; }
.pb-edit-header__version { color: var(--el-text-color-secondary); }
.pb-edit-header__ops { margin-left: auto; }
.pb-node { cursor: pointer; }
.pb-node-selected { cursor: pointer; color: var(--el-color-primary); font-weight: 600; }
</style>
