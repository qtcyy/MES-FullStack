<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="订单编号">
        <el-input v-model="search.orderCodeLike" placeholder="订单编号" clearable />
      </el-form-item>
      <el-form-item label="审批状态">
        <el-select v-model="search.auditStatus" placeholder="全部" clearable style="width:140px">
          <el-option label="审核中" value="APPROVING" />
          <el-option label="审核通过" value="APPROVED" />
          <el-option label="已驳回" value="REJECTED" />
        </el-select>
      </el-form-item>
    </SearchForm>

    <DataTable :data="tableData" :loading="loading" :columns="columns" :pager="pager"
      @page-change="onPage" @size-change="onSize">
      <template #toolbar>
        <el-button v-permission="'plan:order:add'" type="primary" :icon="Plus" @click="openCreate">新增需求订单</el-button>
      </template>
      <template #col-orderSource="{ row }">
        <el-tag size="small" :type="row.orderSource === 'DEMAND' ? 'warning' : 'success'">
          {{ row.orderSource === 'DEMAND' ? '需求订单' : '预测订单' }}
        </el-tag>
      </template>
      <template #col-auditStatus="{ row }">
        <el-tag size="small" :type="auditTag(row.auditStatus)">{{ auditLabel(row.auditStatus) }}</el-tag>
      </template>
      <template #col-planStatus="{ row }">
        <el-tag v-if="row.planStatus" size="small" :type="row.planStatus === 'UNCOMPUTED' ? 'primary' : 'info'">
          {{ planLabel(row.planStatus) }}
        </el-tag>
      </template>
      <template #actions="{ row }">
        <el-button type="danger" link size="small" @click="onDelete(row as ProductionOrder)">删除</el-button>
      </template>
    </DataTable>

    <OrderEntryForm v-model="dialogVisible" :loading="submitLoading" @submit="onSubmit" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import OrderEntryForm from './OrderEntryForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { productionOrderPage, productionOrderSave, productionOrderDelete } from '@/api/plan/order-entry'
import type { ProductionOrder } from '@/types/plan'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ orderCodeLike: '', auditStatus: '' })

const { data: pageData, loading, run } = useRequest(
  () => productionOrderPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)
const tableData = computed<ProductionOrder[]>(() => {
  const r = pageData.value
  if (r) setTotal(r.total)
  return r?.records ?? []
})

const columns: Column[] = [
  { prop: 'orderCode', label: '订单编号', width: 180 },
  { prop: 'orderSource', label: '类型', width: 100 },
  { prop: 'bomCode', label: '产品BOM', minWidth: 140 },
  { prop: 'materielDesc', label: '产品', minWidth: 120 },
  { prop: 'qty', label: '数量', width: 80 },
  { prop: 'planEndTime', label: '计划交付', minWidth: 120 },
  { prop: 'auditStatus', label: '审批状态', width: 100 },
  { prop: 'planStatus', label: '计划状态', width: 100 },
]

type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'
function auditLabel(s?: string) { return ({ DRAFT: '草稿', APPROVING: '审核中', APPROVED: '审核通过', REJECTED: '已驳回' } as Record<string, string>)[s ?? ''] ?? s }
function auditTag(s?: string): TagType { return ({ APPROVING: 'warning', APPROVED: 'success', REJECTED: 'danger' } as Record<string, TagType>)[s ?? ''] ?? 'info' }
function planLabel(s?: string) { return ({ UNCOMPUTED: '待运算', COMPUTED: '已运算', RELEASED: '已下发' } as Record<string, string>)[s ?? ''] ?? s }

const dialogVisible = ref(false)
const submitLoading = ref(false)
function openCreate() { dialogVisible.value = true }
function onPage(p: number) { pager.current = p; run() }
function onSize(s: number) { pager.size = s; reset(); run() }
function handleSearch() { reset(); run() }
function handleReset() { search.orderCodeLike = ''; search.auditStatus = ''; reset(); run() }

async function onSubmit(dto: Partial<ProductionOrder>) {
  submitLoading.value = true
  try {
    await productionOrderSave(dto)
    ElMessage.success('订单已提交,进入审核中')
    dialogVisible.value = false
    run()
  } finally { submitLoading.value = false }
}

async function onDelete(row: ProductionOrder) {
  try {
    await ElMessageBox.confirm(`确认删除订单「${row.orderCode}」?`, '提示', { type: 'warning' })
  } catch { return }
  try { await productionOrderDelete(row.id!); ElMessage.success('删除成功'); run() } catch { /* 已提示 */ }
}
</script>
