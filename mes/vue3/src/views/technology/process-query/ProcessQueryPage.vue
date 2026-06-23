<template>
  <PageContainer>
    <!-- 产品选择(始终显示) -->
    <div class="pq-toolbar">
      <span class="pq-toolbar__label">产品</span>
      <el-select
        v-model="pickedRootId"
        placeholder="选择产品查看工艺文件"
        filterable
        style="width: 320px"
        @change="onPickProduct"
      >
        <el-option
          v-for="p in products ?? []"
          :key="p.id"
          :label="p.productCode ? `${p.nodeName} (${p.productCode})` : p.nodeName"
          :value="p.id"
        />
      </el-select>
    </div>

    <!-- 未选产品:占位 -->
    <el-empty v-if="!pickedRootId" description="请选择产品查看其工艺文件" />

    <!-- 选中产品:主从 -->
    <MasterDetailLayout v-else :has-selection="!!selectedBomId">
      <template #master>
        <TreeTable :data="treeData" :loading="listLoading" :columns="treeColumns">
          <template #col-nodeName="{ row }">
            <span
              :class="
                selectedBomId === (row as ProcessContentTreeNode).id ? 'pq-node-selected' : 'pq-node'
              "
              @click="selectNode((row as ProcessContentTreeNode).id)"
              >{{ (row as ProcessContentTreeNode).nodeName }}</span
            >
          </template>
          <template #col-level="{ row }">
            {{ levelLabel((row as ProcessContentTreeNode).level) }}
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
            <span v-else class="pq-muted">未编制</span>
          </template>
        </TreeTable>
      </template>

      <template #detail>
        <ProcessQueryDetail
          v-if="selectedBomId && detail"
          :key="selectedBomId"
          :node-name="selectedNodeName"
          :detail="detail"
          :bom-items="bomItems"
        />
      </template>
      <template #detail-empty>
        <el-empty description="请点击左侧 BOM 节点查看工艺" />
      </template>
    </MasterDetailLayout>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import TreeTable from '@/components/TreeTable.vue'
import { type Column } from '@/components/DataTable.vue'
import ProcessQueryDetail from './ProcessQueryDetail.vue'
import { useRequest } from '@/composables/useRequest'
import { pcProducts, pcList, pcGet, pcBomItems } from '@/api/technology/processContent'
import { buildTreeFromList, levelLabel } from '@/utils/processContent'
import type {
  SpProductBom,
  SpProductBomItem,
  ProcessContentDetail,
  ProcessContentTreeNode,
} from '@/types/technology'

// ─── 产品下拉 ─────────────────────────────────────────────
const { data: products } = useRequest(pcProducts, {
  immediate: true,
  initialData: [] as SpProductBom[],
})
const pickedRootId = ref('')

// ─── 左树 ─────────────────────────────────────────────────
const treeData = ref<ProcessContentTreeNode[]>([])
const { loading: listLoading, run: loadTree } = useRequest(async () => {
  const list = await pcList(pickedRootId.value)
  treeData.value = buildTreeFromList(list)
})
const treeColumns: Column[] = [
  { prop: 'nodeName', label: '节点名称', minWidth: 200 },
  { prop: 'level', label: '层级', width: 100 },
  { prop: 'contentStatus', label: '编制状态', width: 120 },
]

// ─── 选产品:建树 + 自动选中产品根节点 ─────────────────────
const onPickProduct = async (rootId: string) => {
  selectedBomId.value = ''
  detail.value = null
  try {
    await loadTree() // useRequest.run 失败会 re-throw
    selectNode(rootId) // 自动选中产品根
  } catch {
    /* 树加载失败,拦截器已提示;保持空状态不进 selectNode */
  }
}

// ─── 选节点 → 取详情 + 物料(selToken 守卫防快速切节点乱序)──
const selectedBomId = ref('')
const detail = ref<ProcessContentDetail | null>(null)
const bomItems = ref<SpProductBomItem[]>([])
const selectedNodeName = computed(() => {
  const find = (nodes: ProcessContentTreeNode[]): string | undefined => {
    for (const n of nodes) {
      if (n.id === selectedBomId.value) return n.nodeName
      const sub = find(n.children)
      if (sub) return sub
    }
    return undefined
  }
  return find(treeData.value) ?? ''
})
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
</script>

<style scoped>
.pq-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}
.pq-toolbar__label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
.pq-node {
  cursor: pointer;
}
.pq-node-selected {
  cursor: pointer;
  color: var(--el-color-primary);
  font-weight: 600;
}
.pq-muted {
  color: var(--el-text-color-secondary);
}
</style>
