<template>
  <PageContainer>
    <DataTable
      :data="tableData"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <template #toolbar>
        <el-button v-permission="'flow:add'" type="primary" :icon="Plus" @click="openCreate">新建工艺路线</el-button>
      </template>

      <template #col-process="{ row }">
        <span v-if="row.process" class="flow-chain">
          <template v-for="(seg, i) in row.process.split('->')" :key="i">
            <el-tag size="small" disable-transitions>{{ seg }}</el-tag>
            <el-icon v-if="(i as number) < row.process.split('->').length - 1" class="flow-chain__arrow"><Right /></el-icon>
          </template>
        </span>
        <el-tag v-else size="small" type="info">未编排</el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpFlow)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpFlow)">删除</el-button>
      </template>
    </DataTable>

    <FlowProcessEditor
      v-model="dialogVisible"
      :model="editingModel"
      :loading="submitLoading"
      @submit="handleFormSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Right } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import FlowProcessEditor from './FlowProcessEditor.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { flowPage, flowSaveProcess, flowDelete } from '@/api/technology/flow'
import type { SpFlow, SpFlowDtoReq } from '@/types/technology'

const { pager, setTotal, reset } = usePagination()

const { data: pageData, loading, run } = useRequest(
  () => flowPage({ current: pager.current, size: pager.size }),
  { immediate: true },
)

const tableData = computed<SpFlow[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'flow', label: '流程代码', width: 140 },
  { prop: 'flowDesc', label: '流程描述', width: 160 },
  { prop: 'process', label: '工序链', minWidth: 320 },
  { prop: 'createTime', label: '创建时间', minWidth: 160 },
]

const dialogVisible = ref(false)
const editingModel = ref<SpFlow | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpFlow) {
  editingModel.value = { ...row }
  dialogVisible.value = true
}

function handlePageChange(page: number) {
  pager.current = page
  run()
}
function handleSizeChange(size: number) {
  pager.size = size
  reset()
  run()
}

async function handleFormSubmit(dto: SpFlowDtoReq) {
  submitLoading.value = true
  try {
    await flowSaveProcess(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpFlow) {
  try {
    await ElMessageBox.confirm(`确认删除工艺路线「${row.flow}」?将同时删除其工序编排。`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await flowDelete(row.id)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>

<style scoped>
.flow-chain { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.flow-chain__arrow { color: var(--el-text-color-secondary); }
</style>
