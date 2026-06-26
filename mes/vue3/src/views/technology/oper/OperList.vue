<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="工序描述">
        <el-input v-model="search.operDescLike" placeholder="请输入工序描述" clearable />
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
        <el-button v-permission="'oper:list'" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </template>

      <template #col-generatePlan="{ row }">
        <el-tag size="small" :type="row.generatePlan === '1' ? 'success' : 'info'">
          {{ row.generatePlan === '1' ? '是' : '否' }}
        </el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpOper)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpOper)">删除</el-button>
      </template>
    </DataTable>

    <OperForm
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
import OperForm from './OperForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { operPage, operAddOrUpdate, operDelete } from '@/api/technology/oper'
import type { SpOper } from '@/types/technology'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ operDescLike: '' })

const { data: pageData, loading, run } = useRequest(
  () => operPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpOper[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'operCode', label: '工序编码', width: 130 },
  { prop: 'operDesc', label: '工序描述', minWidth: 160 },
  { prop: 'laborHours', label: '工时(分)', width: 100 },
  { prop: 'manufacturingCycle', label: '制造周期(分)', width: 120 },
  { prop: 'generatePlan', label: '生成计划', width: 100 },
  { prop: 'remark', label: '备注', minWidth: 120 },
  { prop: 'createTime', label: '创建时间', minWidth: 160 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpOper> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpOper) {
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
  search.operDescLike = ''
  reset()
  run()
}

async function handleFormSubmit(dto: Partial<SpOper>) {
  submitLoading.value = true
  try {
    await operAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpOper) {
  try {
    await ElMessageBox.confirm(`确认删除工序「${row.operDesc}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await operDelete(row.id)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示(含「被引用拒删」后端文案) */ }
}
</script>
