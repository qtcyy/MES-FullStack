<template>
  <PageContainer title="仓库管理">
    <MasterDetailLayout :has-selection="!!selected?.id">
      <template #master>
        <DataTable
          :data="tableData"
          :loading="loading"
          :columns="columns"
          :pager="pager"
          @row-click="select"
          @page-change="handlePageChange"
          @size-change="handleSizeChange"
        >
          <template #toolbar>
            <el-input v-model="search.code" placeholder="库房编码" clearable class="qbox" @keyup.enter="handleSearch" />
            <el-input v-model="search.name" placeholder="库房名称" clearable class="qbox" @keyup.enter="handleSearch" />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-button v-permission="'warehouse:add'" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
          </template>

          <!-- 规格列：DataTable 以 col-{prop} 命名插槽渲染自定义单元格 -->
          <template #col-spec="{ row }">
            {{ (row as SpWarehouse).groups }}×{{ (row as SpWarehouse).rows }}×{{ (row as SpWarehouse).layers }}×{{ (row as SpWarehouse).columns }}
          </template>

          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="openEdit(row as SpWarehouse)">编辑</el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row as SpWarehouse)">删除</el-button>
          </template>
        </DataTable>
      </template>

      <template #detail>
        <WarehouseLocations v-if="selected?.id" :key="selected.id" :warehouse="selected" />
      </template>
      <template #detail-empty>
        <el-empty description="请选择左侧仓库查看库位" />
      </template>
    </MasterDetailLayout>

    <WarehouseFormDialog
      v-model="dialogVisible"
      :model="editingModel"
      :loading="submitLoading"
      @submit="handleFormSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import WarehouseFormDialog from './WarehouseFormDialog.vue'
import WarehouseLocations from './WarehouseLocations.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { warehousePage, warehouseAddOrUpdate, warehouseDelete } from '@/api/basedata/warehouse'
import type { SpWarehouse } from '@/types/warehouse'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })
const selected = ref<SpWarehouse | null>(null)

const { data: pageData, loading, run } = useRequest(
  () => warehousePage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpWarehouse[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

// 列表刷新后，若选中仓库已不在行集中，清空选中（避免陈旧引用）
watch(tableData, (rows) => {
  if (selected.value && !rows.some((r) => r.id === selected.value!.id)) {
    selected.value = null
  }
})

// 规格列使用虚拟 prop "spec"，由 #col-spec 插槽渲染 groups×rows×layers×columns
const columns: Column[] = [
  { prop: 'code', label: '库房编码', width: 130 },
  { prop: 'name', label: '库房名称', minWidth: 140 },
  { prop: 'type', label: '类型', width: 100 },
  { prop: 'spec', label: '规格(组×排×层×列)', width: 160 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpWarehouse> | null>(null)
const submitLoading = ref(false)

function select(row: SpWarehouse) {
  selected.value = row
}
function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpWarehouse) {
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

async function handleFormSubmit(dto: Partial<SpWarehouse>) {
  submitLoading.value = true
  try {
    await warehouseAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    const editedId = dto.id
    await run()
    // 用刷新后列表中的服务端真实记录更新选中,触发库位面板(:key)按真实维度重挂
    if (editedId && selected.value?.id === editedId) {
      const refreshed = tableData.value.find((r) => r.id === editedId)
      if (refreshed) selected.value = refreshed
    }
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpWarehouse) {
  try {
    await ElMessageBox.confirm(`确认删除仓库「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await warehouseDelete(row.id!)
    ElMessage.success('删除成功')
    if (selected.value?.id === row.id) selected.value = null
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>

<style scoped>
.qbox { width: 150px; }
</style>
