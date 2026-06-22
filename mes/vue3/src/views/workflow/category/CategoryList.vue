<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="分类编码">
        <el-input v-model="search.code" placeholder="请输入分类编码" clearable />
      </el-form-item>
      <el-form-item label="分类名称">
        <el-input v-model="search.name" placeholder="请输入分类名称" clearable />
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
        <el-button v-permission="'workflow:category:list'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as WorkflowCategory)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as WorkflowCategory)">删除</el-button>
      </template>
    </DataTable>

    <CategoryForm
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
import CategoryForm from './CategoryForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { categoryPage, categorySave, categoryDelete } from '@/api/workflow/category'
import type { WorkflowCategory } from '@/types/workflow'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })

const { data: pageData, loading, run } = useRequest(
  () => categoryPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<WorkflowCategory[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'code', label: '分类编码', width: 180 },
  { prop: 'name', label: '分类名称', minWidth: 160 },
  { prop: 'descr', label: '备注', minWidth: 200 },
  { prop: 'updateTime', label: '更新时间', width: 170 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<WorkflowCategory> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: WorkflowCategory) {
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
  search.code = ''
  search.name = ''
  reset()
  run()
}

async function handleFormSubmit(dto: Partial<WorkflowCategory>) {
  submitLoading.value = true
  try {
    await categorySave(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: WorkflowCategory) {
  try {
    await ElMessageBox.confirm(`确认删除流程分类「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await categoryDelete(row.id!)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
