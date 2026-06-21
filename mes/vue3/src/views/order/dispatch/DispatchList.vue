<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="工单编号">
        <el-input v-model="search.orderCode" placeholder="工单编号" clearable />
      </el-form-item>
    </SearchForm>

    <DataTable
      :data="tableData"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      selectable
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
      @selection-change="onSelection"
    >
      <template #toolbar>
        <el-button
          v-permission="'order:dispatch'"
          type="primary"
          :icon="Promotion"
          :disabled="!selectedIds.length"
          @click="openDispatch"
        >
          派工（{{ selectedIds.length }}）
        </el-button>
      </template>
      <template #col-orderType="{ row }">
        <el-tag size="small" type="info">{{ orderTypeLabel(row.orderType) }}</el-tag>
      </template>
    </DataTable>

    <DispatchDialog v-model="dialogVisible" :order-ids="selectedIds" :loading="submitLoading" @submit="handleDispatch" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Promotion } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import DispatchDialog from './DispatchDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { dispatchPage, dispatchAssign } from '@/api/order/dispatch'
import { orderTypeLabel } from '@/utils/order'
import type { DispatchableOrder, SpDispatchAssign } from '@/types/order'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ orderCode: '' })

const { data: pageData, loading, run } = useRequest(
  () => dispatchPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)
const tableData = computed<DispatchableOrder[]>(() => {
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
]

const selectedIds = ref<string[]>([])
function onSelection(rows: DispatchableOrder[]) {
  selectedIds.value = rows.map((r) => r.id!).filter(Boolean)
}

const dialogVisible = ref(false)
const submitLoading = ref(false)
function openDispatch() {
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
  search.orderCode = ''
  reset()
  run()
}

async function handleDispatch(dto: SpDispatchAssign) {
  submitLoading.value = true
  try {
    await dispatchAssign(dto)
    ElMessage.success(`已派工 ${dto.orderIds.length} 张工单`)
    dialogVisible.value = false
    selectedIds.value = []
    run()
  } finally {
    submitLoading.value = false
  }
}
</script>
