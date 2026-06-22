<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="流程名称">
        <el-input v-model="search.name" placeholder="请输入流程名称" clearable />
      </el-form-item>
    </SearchForm>

    <DataTable
      :data="tableData"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      :action-width="240"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <template #col-version="{ row }">v{{ row.version }}</template>
      <template #col-enabled="{ row }">
        <el-tag size="small" :type="row.enabled ? 'success' : 'info'">
          {{ row.enabled ? '启用' : '停用' }}
        </el-tag>
      </template>
      <template #col-formKey="{ row }">
        <el-tag v-if="row.formKey" size="small" type="warning">{{ row.formKey }}</el-tag>
        <span v-else class="muted">未关联</span>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="toggleEnabled(row as WorkflowDefinition)">
          {{ (row as WorkflowDefinition).enabled ? '停用' : '启用' }}
        </el-button>
        <el-button type="primary" link size="small" @click="openAssociate(row as WorkflowDefinition)">关联表单</el-button>
        <el-button type="primary" link size="small" @click="openEvents(row as WorkflowDefinition)">流程事件</el-button>
      </template>
    </DataTable>

    <AssociateFormDialog v-model="associateVisible" :definition="activeDef" @saved="run" />
    <EventConfigDialog v-model="eventVisible" :definition="activeDef" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import type { Column } from '@/components/DataTable.vue'
import AssociateFormDialog from './AssociateFormDialog.vue'
import EventConfigDialog from './EventConfigDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { definitionPage, definitionSetEnabled } from '@/api/workflow/definition'
import type { WorkflowDefinition } from '@/types/workflow'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ name: '' })

const { data: pageData, loading, run } = useRequest(
  () => definitionPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<WorkflowDefinition[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'processName', label: '流程名称', minWidth: 160 },
  { prop: 'processKey', label: 'processKey', width: 160 },
  { prop: 'categoryName', label: '分类', width: 130 },
  { prop: 'version', label: '版本', width: 80 },
  { prop: 'enabled', label: '状态', width: 90 },
  { prop: 'formKey', label: '关联表单', width: 150 },
]

const associateVisible = ref(false)
const eventVisible = ref(false)
const activeDef = ref<WorkflowDefinition | null>(null)

function openAssociate(row: WorkflowDefinition) {
  activeDef.value = row
  associateVisible.value = true
}
function openEvents(row: WorkflowDefinition) {
  activeDef.value = row
  eventVisible.value = true
}

async function toggleEnabled(row: WorkflowDefinition) {
  try {
    await definitionSetEnabled(row.id, !row.enabled)
    ElMessage.success(row.enabled ? '已停用' : '已启用')
    run()
  } catch { /* 响应拦截器已提示 */ }
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
function handleSearch() {
  reset()
  run()
}
function handleReset() {
  search.name = ''
  reset()
  run()
}
</script>

<style scoped>
.muted {
  color: var(--el-text-color-secondary);
}
</style>
