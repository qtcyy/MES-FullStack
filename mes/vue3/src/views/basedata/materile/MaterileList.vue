<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="物料编码">
        <el-input v-model="search.materielLike" placeholder="请输入物料编码" clearable />
      </el-form-item>
      <el-form-item label="物料描述">
        <el-input v-model="search.materielDescLike" placeholder="请输入物料描述" clearable />
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
        <el-button v-permission="'materile:add'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <template #col-imageUrl="{ row }">
        <el-image
          v-if="row.imageUrl"
          :src="row.imageUrl"
          fit="cover"
          style="width: 44px; height: 44px; border-radius: 4px"
          :preview-src-list="[row.imageUrl]"
          preview-teleported
        />
        <el-tag v-else size="small" type="info">无图</el-tag>
      </template>

      <template #col-matType="{ row }">{{ matTypeLabel(row.matType) }}</template>
      <template #col-unit="{ row }">{{ unitLabel(row.unit) }}</template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpMaterile)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpMaterile)">删除</el-button>
      </template>
    </DataTable>

    <MaterileForm
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
import MaterileForm from './MaterileForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { useDict } from '@/composables/useDict'
import { materilePage, materileAddOrUpdate, materileDelete } from '@/api/basedata/materile'
import type { SpMaterile } from '@/types/basedata'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ materielLike: '', materielDescLike: '' })

const { data: pageData, loading, run } = useRequest(
  () => materilePage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpMaterile[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

// 字典:列展示中文 label(与表单共享缓存)
const { labelOf: matTypeLabel } = useDict('material_type')
const { labelOf: unitLabel } = useDict('ORDER_UNIT')

const columns: Column[] = [
  { prop: 'imageUrl', label: '图片', width: 80 },
  { prop: 'materiel', label: '物料编码', width: 130 },
  { prop: 'materielDesc', label: '物料描述', minWidth: 160 },
  { prop: 'matType', label: '类型', width: 100 },
  { prop: 'unit', label: '单位', width: 90 },
  { prop: 'model', label: '型号', width: 120 },
  { prop: 'createTime', label: '创建时间', minWidth: 160 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpMaterile> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpMaterile) {
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
  search.materielLike = ''
  search.materielDescLike = ''
  reset()
  run()
}

async function handleFormSubmit(dto: Partial<SpMaterile>) {
  submitLoading.value = true
  try {
    await materileAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpMaterile) {
  try {
    await ElMessageBox.confirm(`确认删除物料「${row.materielDesc}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await materileDelete(row.id)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
