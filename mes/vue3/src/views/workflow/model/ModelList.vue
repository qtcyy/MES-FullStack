<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="模型名称">
        <el-input v-model="search.name" placeholder="请输入名称" clearable />
      </el-form-item>
      <el-form-item label="模型 key">
        <el-input v-model="search.modelKey" placeholder="请输入 key" clearable />
      </el-form-item>
    </SearchForm>

    <DataTable
      :data="tableData"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <template #toolbar>
        <el-button v-permission="'workflow:model:list'" type="primary" :icon="Plus" @click="createVisible = true">
          新建模型
        </el-button>
      </template>

      <template #col-status="{ row }">
        <el-tag :type="(row as WorkflowModel).status === 'PUBLISHED' ? 'success' : 'info'" effect="plain">
          {{ (row as WorkflowModel).status === 'PUBLISHED' ? '已发布' : '草稿' }}
        </el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openDesigner(row as WorkflowModel)">设计</el-button>
        <el-button type="success" link size="small" @click="openPublish(row as WorkflowModel)">发布</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as WorkflowModel)">删除</el-button>
      </template>
    </DataTable>

    <ModelCreateDialog v-model="createVisible" @created="onCreated" />
    <BpmnDesignerDialog v-model="designerVisible" :model-id="designId" @saved="run" />
    <PublishDialog v-model="publishVisible" :model="publishing" @published="run" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ModelCreateDialog from './ModelCreateDialog.vue'
import BpmnDesignerDialog from './BpmnDesignerDialog.vue'
import PublishDialog from './PublishDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { modelPage, modelDelete } from '@/api/workflow/model'
import type { WorkflowModel } from '@/types/workflow'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ name: '', modelKey: '' })

const { data: pageData, loading, run } = useRequest(
  () => modelPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<WorkflowModel[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'name', label: '模型名称', minWidth: 160 },
  { prop: 'modelKey', label: '模型 key', width: 160 },
  { prop: 'status', label: '状态', width: 90 },
  { prop: 'version', label: '版本', width: 70 },
  { prop: 'categoryName', label: '分类', minWidth: 120 },
  { prop: 'updateTime', label: '更新时间', width: 170 },
]

const createVisible = ref(false)
const designerVisible = ref(false)
const designId = ref<string | null>(null)
const publishVisible = ref(false)
const publishing = ref<WorkflowModel | null>(null)

function openDesigner(row: WorkflowModel) {
  designId.value = row.id
  designerVisible.value = true
}
function onCreated(id: string) {
  designId.value = id
  designerVisible.value = true
  run()
}
function openPublish(row: WorkflowModel) {
  publishing.value = row
  publishVisible.value = true
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
  search.modelKey = ''
  reset()
  run()
}

async function handleDelete(row: WorkflowModel) {
  try {
    await ElMessageBox.confirm(`确认删除模型「${row.name}」?已发布将级联清理派生的流程定义。`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await modelDelete(row.id)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
