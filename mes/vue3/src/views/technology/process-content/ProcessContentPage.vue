<template>
  <PageContainer>
    <!-- ════════ 浏览态 ════════ -->
    <template v-if="!editingRootId">
      <div class="pc-toolbar">
        <el-select v-model="pickedRootId" placeholder="选择产品 BOM" filterable style="width: 280px">
          <el-option v-for="p in products ?? []" :key="p.id" :label="p.nodeName" :value="p.id" />
        </el-select>
        <el-button type="primary" :icon="Right" :disabled="!pickedRootId" @click="enterEdit"
          >进入编制</el-button
        >
      </div>
      <el-empty description="选择一个产品 BOM,进入工艺内容编制" />
    </template>

    <!-- ════════ 编辑态 ════════ -->
    <template v-else>
      <div class="pc-edit-header">
        <el-button :icon="Back" size="small" @click="back">返回</el-button>
        <span class="pc-edit-header__name">{{ rootName }}</span>
      </div>

      <MasterDetailLayout :has-selection="!!selectedBomId">
        <template #master>
          <TreeTable :data="treeData" :loading="listLoading" :columns="treeColumns">
            <template #col-nodeName="{ row }">
              <span
                :class="
                  selectedBomId === (row as ProcessContentTreeNode).id
                    ? 'pc-node-selected'
                    : 'pc-node'
                "
                @click="selectNode((row as ProcessContentTreeNode).id)"
                >{{ (row as ProcessContentTreeNode).nodeName }}</span
              >
            </template>
            <template #col-contentStatus="{ row }">
              <el-tag
                v-if="(row as ProcessContentTreeNode).contentStatus === 'completed'"
                type="success"
                size="small"
                disable-transitions
                >已完成</el-tag
              >
              <el-tag
                v-else-if="(row as ProcessContentTreeNode).contentStatus === 'draft'"
                type="info"
                size="small"
                disable-transitions
                >草稿</el-tag
              >
              <span v-else class="pc-muted">未编制</span>
            </template>
          </TreeTable>
        </template>

        <template #detail>
          <ProcessContentEditor
            v-if="selectedBomId && detail"
            :key="selectedBomId"
            :bom-id="selectedBomId"
            :detail="detail"
            :bom-items="bomItems"
            :saving="saving"
            @save="onSave"
            @complete="onComplete"
            @reload="reloadNode"
          />
        </template>
        <template #detail-empty>
          <el-empty description="请点击左侧 BOM 节点编制工艺" />
        </template>
      </MasterDetailLayout>
    </template>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Right, Back } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import TreeTable from '@/components/TreeTable.vue'
import { type Column } from '@/components/DataTable.vue'
import ProcessContentEditor from './ProcessContentEditor.vue'
import { useRequest } from '@/composables/useRequest'
import {
  pcProducts,
  pcList,
  pcGet,
  pcBomItems,
  pcSave,
  pcComplete,
} from '@/api/technology/processContent'
import { buildTreeFromList } from '@/utils/processContent'
import type {
  SpProductBom,
  SpProductBomItem,
  SpProcessContent,
  ProcessContentDetail,
  ProcessContentTreeNode,
} from '@/types/technology'

// ─── 浏览态:产品下拉 ──────────────────────────────────────
const { data: products } = useRequest(pcProducts, {
  immediate: true,
  initialData: [] as SpProductBom[],
})
const pickedRootId = ref('')
const editingRootId = ref('')
const rootName = computed(
  () => products.value?.find((p) => p.id === editingRootId.value)?.nodeName ?? '',
)

// ─── 左树 ─────────────────────────────────────────────────
const treeData = ref<ProcessContentTreeNode[]>([])
const { loading: listLoading, run: loadTree } = useRequest(async () => {
  const list = await pcList(editingRootId.value)
  treeData.value = buildTreeFromList(list)
})
const treeColumns: Column[] = [
  { prop: 'nodeName', label: '节点名称', minWidth: 200 },
  { prop: 'level', label: '层级', width: 80 },
  { prop: 'contentStatus', label: '编制状态', width: 120 },
]

const enterEdit = () => {
  editingRootId.value = pickedRootId.value
  selectedBomId.value = ''
  detail.value = null
  loadTree()
}
const back = () => {
  editingRootId.value = ''
  selectedBomId.value = ''
  detail.value = null
}

// ─── 选节点 → 取详情 + 物料(token 守卫防快速切节点乱序)────
const selectedBomId = ref('')
const detail = ref<ProcessContentDetail | null>(null)
const bomItems = ref<SpProductBomItem[]>([])
let selToken = 0
const selectNode = async (bomId: string) => {
  selectedBomId.value = bomId
  detail.value = null
  const token = ++selToken
  try {
    const [d, items] = await Promise.all([pcGet(bomId), pcBomItems(bomId)])
    if (token !== selToken) return
    detail.value = d
    bomItems.value = items
  } catch {
    if (token === selToken) {
      detail.value = {
        content: null,
        equipment: [],
        documents: [],
        contentImageUrls: [],
        inspectionImageUrls: [],
      }
      bomItems.value = []
    }
  }
}

// ─── 重载选中节点(保存/完成/子表操作后)+ 同步左树徽标 ────
// 静默刷新:不清空 detail(避免编辑器卸载重挂、Tab 跳回主信息),仅就地更新;共用 selToken 防与切节点竞态
const reloadNode = async () => {
  const bomId = selectedBomId.value
  if (!bomId) {
    loadTree()
    return
  }
  const token = ++selToken
  try {
    const [d, items] = await Promise.all([pcGet(bomId), pcBomItems(bomId)])
    if (token !== selToken) return
    detail.value = d
    bomItems.value = items
  } catch {
    /* 响应拦截器已提示;保留原 detail */
  }
  loadTree()
}

// ─── 内容保存/完成(改 BOM 树状态、需 saving spinner,仍由父级处理)────
const saving = ref(false)
const onSave = async (payload: SpProcessContent) => {
  saving.value = true
  try {
    await pcSave(payload)
    ElMessage.success('保存成功')
    await reloadNode()
  } catch {
    /* 拦截器已提示 */
  } finally {
    saving.value = false
  }
}
const onComplete = async (id: string) => {
  try {
    await ElMessageBox.confirm('完成编制后该节点工艺内容将变为只读,确认完成?', '提示', {
      type: 'warning',
      confirmButtonText: '确认完成',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await pcComplete(id)
    ElMessage.success('已完成编制')
    await reloadNode()
  } catch {
    /* 拦截器已提示 */
  }
}
</script>

<style scoped>
.pc-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}
.pc-edit-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}
.pc-edit-header__name {
  font-size: 15px;
  font-weight: 600;
}
.pc-node {
  cursor: pointer;
}
.pc-node-selected {
  cursor: pointer;
  color: var(--el-color-primary);
  font-weight: 600;
}
.pc-muted {
  color: var(--el-text-color-secondary);
}
</style>
