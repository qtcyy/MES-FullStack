<template>
  <PageContainer>
    <!-- ════════ 浏览态 ════════ -->
    <template v-if="!editingRootId">
      <div class="bf-toolbar">
        <el-select v-model="pickedRootId" placeholder="选择产品 BOM" filterable style="width: 280px">
          <el-option v-for="p in products ?? []" :key="p.id" :label="p.nodeName" :value="p.id" />
        </el-select>
        <el-button type="primary" :icon="Right" :disabled="!pickedRootId" @click="enterBind">进入绑定</el-button>
      </div>
      <el-empty description="选择一个产品 BOM,进入工艺绑定" />
    </template>

    <!-- ════════ 编辑态 ════════ -->
    <template v-else>
      <div class="bf-edit-header">
        <el-button :icon="Back" size="small" @click="back">返回</el-button>
        <span class="bf-edit-header__name">{{ rootName }}</span>
        <el-tag :type="rootLocked ? 'warning' : 'info'" size="small" disable-transitions>
          {{ rootLocked ? 'BOM已锁定' : 'BOM草稿' }}
        </el-tag>
        <div class="bf-edit-header__ops">
          <el-button type="warning" :icon="Lock" size="small" :disabled="!rootLocked" @click="handleLock">
            锁定工艺
          </el-button>
        </div>
      </div>

      <MasterDetailLayout :has-selection="!!selected">
        <template #master>
          <TreeTable :data="treeData" :loading="listLoading" :columns="structColumns" :action-width="1">
            <template #col-nodeName="{ row }">
              <span
                :class="selectedBomId === (row as BomFlowTreeNode).id ? 'bf-node-selected' : 'bf-node'"
                @click="selectedBomId = (row as BomFlowTreeNode).id"
              >{{ (row as BomFlowTreeNode).nodeName }}</span>
            </template>
            <template #col-flow="{ row }">
              <span v-if="(row as BomFlowTreeNode).flow">{{ (row as BomFlowTreeNode).flow!.flow }}</span>
              <span v-else class="bf-unbound">未绑定</span>
            </template>
          </TreeTable>
        </template>

        <template #detail>
          <BomNodeFlowDetail
            v-if="selected"
            :node="selected"
            :can-write="canWrite"
            @bind="openBind"
            @unbind="handleUnbind"
          />
        </template>

        <template #detail-empty>
          <el-empty description="请点击左侧结构树节点" />
        </template>
      </MasterDetailLayout>
    </template>

    <FlowBindDialog
      v-model="bindOpen"
      :flows="flows ?? []"
      :current-flow-id="selected?.bomFlow?.flowId"
      :loading="submitLoading"
      @submit="handleBind"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Right, Back, Lock } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import TreeTable from '@/components/TreeTable.vue'
import { type Column } from '@/components/DataTable.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import BomNodeFlowDetail from './BomNodeFlowDetail.vue'
import FlowBindDialog from './FlowBindDialog.vue'
import { useRequest } from '@/composables/useRequest'
import {
  bomFlowProducts, bomFlowList, bomFlowFlows,
  bomFlowBind, bomFlowUnbind, bomFlowLock,
} from '@/api/technology/bomFlow'
import { buildBomNodeTree, canWriteBomFlow, buildBindPayload } from '@/utils/bomFlow'
import type { BomFlowNodeVO, BomFlowTreeNode, SpProductBom, SpFlow } from '@/types/technology'

// ─── 浏览态 ───────────────────────────────────────────────
const { data: products } = useRequest(bomFlowProducts, { immediate: true, initialData: [] as SpProductBom[] })
const pickedRootId = ref('')

// ─── 工艺路线下拉(绑定弹窗用,加载一次) ────────────────────
const { data: flows } = useRequest(bomFlowFlows, { immediate: true, initialData: [] as SpFlow[] })

// ─── 编辑态 ───────────────────────────────────────────────
const editingRootId = ref<string | null>(null)
const selectedBomId = ref<string | null>(null)
const flat = ref<BomFlowNodeVO[]>([])
const listLoading = ref(false)

const treeData = computed<BomFlowTreeNode[]>(() => buildBomNodeTree(flat.value))
const selected = computed<BomFlowNodeVO | undefined>(() =>
  flat.value.find((x) => x.bomNode.id === selectedBomId.value),
)
const rootVO = computed<BomFlowNodeVO | undefined>(() =>
  flat.value.find((x) => x.bomNode.id === editingRootId.value),
)
const rootName = computed(() => rootVO.value?.bomNode.nodeName ?? '')
const rootLocked = computed(() => rootVO.value?.bomNode.status === 'locked')
const canWrite = computed(() =>
  canWriteBomFlow(rootVO.value?.bomNode.status, selected.value?.bomFlow?.status, selected.value?.bomNode.status),
)

async function loadList(rootId: string) {
  listLoading.value = true
  try {
    flat.value = await bomFlowList(rootId)
  } catch {
    flat.value = []
  } finally {
    listLoading.value = false
  }
}

async function enterBind() {
  if (!pickedRootId.value) return
  editingRootId.value = pickedRootId.value
  selectedBomId.value = pickedRootId.value
  await loadList(pickedRootId.value)
}
function back() {
  editingRootId.value = null
  selectedBomId.value = null
  flat.value = []
}

// ─── 绑定/换绑 ────────────────────────────────────────────
const bindOpen = ref(false)
const submitLoading = ref(false)

function openBind() {
  bindOpen.value = true
}
async function handleBind(payload: { flowId: string; remark: string }) {
  if (!selectedBomId.value) return
  submitLoading.value = true
  try {
    await bomFlowBind(buildBindPayload(selectedBomId.value, payload.flowId, payload.remark))
    ElMessage.success('绑定成功')
    bindOpen.value = false
    await loadList(editingRootId.value!)
  } finally {
    submitLoading.value = false
  }
}

async function handleUnbind() {
  if (!selected.value) return
  try {
    await ElMessageBox.confirm(`确认解绑节点「${selected.value.bomNode.nodeName}」的工艺路线?`, '提示', {
      type: 'warning', confirmButtonText: '确认解绑', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await bomFlowUnbind(selected.value.bomNode.id)
    ElMessage.success('已解绑')
    await loadList(editingRootId.value!)
  } catch { /* 拦截器已提示 */ }
}

// ─── 锁定工艺 ─────────────────────────────────────────────
async function handleLock() {
  if (!editingRootId.value) return
  try {
    await ElMessageBox.confirm('锁定后整个产品的工艺绑定将变为只读,且不可撤销。确认?', '提示', {
      type: 'warning', confirmButtonText: '确认锁定', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await bomFlowLock(editingRootId.value)
    ElMessage.success('已锁定工艺')
    await loadList(editingRootId.value)
  } catch { /* 拦截器已提示 */ }
}

// ─── 列定义 ───────────────────────────────────────────────
const structColumns: Column[] = [
  { prop: 'nodeName', label: '结构', minWidth: 200 },
  { prop: 'flow', label: '已绑工艺', minWidth: 120 },
]
</script>

<style scoped>
.bf-toolbar { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.bf-edit-header { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); flex-wrap: wrap; }
.bf-edit-header__name { font-size: 15px; font-weight: 600; }
.bf-edit-header__ops { margin-left: auto; }
.bf-node { cursor: pointer; }
.bf-node-selected { cursor: pointer; color: var(--el-color-primary); font-weight: 600; }
.bf-unbound { color: var(--el-text-color-secondary); }
</style>
