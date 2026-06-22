<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="零部件编码">
        <el-input v-model="search.code" placeholder="请输入零部件编码" clearable />
      </el-form-item>
      <el-form-item label="零部件名称">
        <el-input v-model="search.name" placeholder="请输入零部件名称" clearable />
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
        <el-button v-permission="'component:add'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpComponent)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpComponent)">删除</el-button>
      </template>
    </DataTable>

    <ComponentForm
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
import ComponentForm from './ComponentForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { componentPage, componentAddOrUpdate, componentDelete } from '@/api/basedata/component'
import type { SpComponent } from '@/types/basedata'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })

const { data: pageData, loading, run } = useRequest(
  () => componentPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpComponent[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'code', label: '零部件编码', width: 160 },
  { prop: 'name', label: '零部件名称', minWidth: 160 },
  { prop: 'descr', label: '描述', minWidth: 200 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpComponent> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpComponent) {
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

async function handleFormSubmit(dto: Partial<SpComponent>) {
  submitLoading.value = true
  try {
    await componentAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpComponent) {
  try {
    await ElMessageBox.confirm(`确认删除零部件「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await componentDelete(row.id!)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
