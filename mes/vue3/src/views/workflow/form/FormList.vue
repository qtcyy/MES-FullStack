<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="表单名称">
        <el-input v-model="search.name" placeholder="请输入表单名称" clearable />
      </el-form-item>
      <el-form-item label="表单 key">
        <el-input v-model="search.formKey" placeholder="请输入表单 key" clearable />
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
        <el-button v-permission="'workflow:form:list'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <template #col-formType="{ row }">
        <el-tag size="small">{{ row.formType }}</el-tag>
      </template>
      <template #col-skipSameAssignee="{ row }">
        <el-tag size="small" :type="row.skipSameAssignee ? 'success' : 'info'">
          {{ row.skipSameAssignee ? '是' : '否' }}
        </el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as WorkflowForm)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as WorkflowForm)">删除</el-button>
      </template>
    </DataTable>

    <FormForm
      v-model="dialogVisible"
      :model="editingModel"
      :loading="submitLoading"
      @submit="handleFormSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import type { Column } from '@/components/DataTable.vue'
import FormForm from './FormForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { formPage, formSave, formDelete } from '@/api/workflow/form'
import type { WorkflowForm } from '@/types/workflow'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ name: '', formKey: '' })

const { data: pageData, loading, run } = useRequest(
  () => formPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<WorkflowForm[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'name', label: '表单名称', minWidth: 160 },
  { prop: 'formKey', label: '表单 key', width: 180 },
  { prop: 'formType', label: '类型', width: 100 },
  { prop: 'skipSameAssignee', label: '跳过相同处理人', width: 140 },
  { prop: 'updateTime', label: '更新时间', width: 170 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<WorkflowForm> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: WorkflowForm) {
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
function handleSearch() {
  reset()
  run()
}
function handleReset() {
  search.name = ''
  search.formKey = ''
  reset()
  run()
}

async function handleFormSubmit(dto: Partial<WorkflowForm>) {
  submitLoading.value = true
  try {
    await formSave(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: WorkflowForm) {
  try {
    await ElMessageBox.confirm(`确认删除流程表单「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await formDelete(row.id!)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
