<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="物料编号">
        <el-input v-model="search.materielCodeLike" placeholder="请输入物料编号" clearable />
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
        <el-button v-permission="'bom:add'" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </template>

      <template #col-deleted="{ row }">
        <el-tag size="small" :type="bomStatusType(row.deleted)">{{ bomStatusText(row.deleted) }}</el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpBom)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpBom)">删除</el-button>
      </template>
    </DataTable>

    <BomForm
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
import DataTable, { type Column } from '@/components/DataTable.vue'
import BomForm from './BomForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { bomPage, bomAddOrUpdate, bomDelete } from '@/api/technology/bom'
import { bomStatusText, bomStatusType } from '@/utils/technology'
import type { SpBom } from '@/types/technology'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ materielCodeLike: '' })

const { data: pageData, loading, run } = useRequest(
  () => bomPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpBom[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'bomCode', label: 'BOM 编号', minWidth: 140 },
  { prop: 'materielCode', label: '物料编号', minWidth: 140 },
  { prop: 'materielDesc', label: '物料名称', minWidth: 160 },
  { prop: 'versionNumber', label: '版本号', width: 90 },
  { prop: 'factory', label: '所属工厂', minWidth: 120 },
  { prop: 'deleted', label: '状态', width: 90 },
  { prop: 'remark', label: '备注', minWidth: 120 },
  { prop: 'createTime', label: '创建时间', minWidth: 160 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpBom> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpBom) {
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
  search.materielCodeLike = ''
  reset()
  run()
}

async function handleFormSubmit(dto: Partial<SpBom>) {
  submitLoading.value = true
  try {
    await bomAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpBom) {
  try {
    await ElMessageBox.confirm(`确认删除工艺 BOM「${row.bomCode}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await bomDelete(row.id)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
