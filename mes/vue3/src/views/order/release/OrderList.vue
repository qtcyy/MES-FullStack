<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="工单编号">
        <el-input v-model="search.orderCodeLike" placeholder="工单编号" clearable />
      </el-form-item>
      <el-form-item label="物料">
        <el-input v-model="search.materielLike" placeholder="物料编码" clearable />
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
        <el-button v-permission="'order:add'" type="primary" :icon="Plus" @click="openCreate">新增工单</el-button>
      </template>

      <template #col-orderType="{ row }">
        <el-tag size="small" type="info">{{ orderTypeLabel(row.orderType) }}</el-tag>
      </template>
      <template #col-statue="{ row }">
        <el-tag size="small" :type="orderStatusMeta(row.statue).tag">{{ orderStatusMeta(row.statue).label }}</el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpOrder)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpOrder)">删除</el-button>
      </template>
    </DataTable>

    <OrderForm v-model="dialogVisible" :model="editingModel" :loading="submitLoading" @submit="handleFormSubmit" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import OrderForm from './OrderForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { orderPage, orderAddOrUpdate, orderDelete } from '@/api/order/order'
import { orderTypeLabel, orderStatusMeta } from '@/utils/order'
import type { SpOrder } from '@/types/order'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ orderCodeLike: '', materielLike: '' })

const { data: pageData, loading, run } = useRequest(
  () => orderPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)
const tableData = computed<SpOrder[]>(() => {
  const r = pageData.value
  if (r) setTotal(r.total)
  return r?.records ?? []
})

const columns: Column[] = [
  { prop: 'orderCode', label: '工单编号', width: 150 },
  { prop: 'orderDescription', label: '描述', minWidth: 140 },
  { prop: 'qty', label: '数量', width: 80 },
  { prop: 'orderType', label: '类型', width: 90 },
  { prop: 'materiel', label: '物料', width: 120 },
  { prop: 'planStartTime', label: '计划开始', minWidth: 150 },
  { prop: 'planEndTime', label: '计划结束', minWidth: 150 },
  { prop: 'statue', label: '状态', width: 90 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpOrder> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpOrder) {
  editingModel.value = { ...row }
  dialogVisible.value = true
}
function handlePageChange(p: number) {
  pager.current = p
  run()
}
function handleSizeChange(s: number) {
  pager.size = s
  reset()
  run()
}
function handleSearch() {
  reset()
  run()
}
function handleReset() {
  search.orderCodeLike = ''
  search.materielLike = ''
  reset()
  run()
}

async function handleFormSubmit(dto: Partial<SpOrder>) {
  submitLoading.value = true
  try {
    await orderAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpOrder) {
  try {
    await ElMessageBox.confirm(`确认删除工单「${row.orderCode}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await orderDelete(row.id!)
    ElMessage.success('删除成功')
    run()
  } catch {
    /* 拦截器已提示 */
  }
}
</script>
