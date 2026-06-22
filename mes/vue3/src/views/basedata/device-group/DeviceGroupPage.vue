<template>
  <PageContainer title="设备编组">
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
            <el-input v-model="search.code" placeholder="编组编码" clearable class="qbox" @keyup.enter="handleSearch" />
            <el-input v-model="search.name" placeholder="编组名称" clearable class="qbox" @keyup.enter="handleSearch" />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-button v-permission="'device:add'" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
          </template>

          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="openEdit(row as SpDeviceGroup)">编辑</el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row as SpDeviceGroup)">删除</el-button>
          </template>
        </DataTable>
      </template>

      <template #detail>
        <DeviceGroupMembers v-if="selected?.id" :key="selected.id" :group-id="selected.id" />
      </template>
      <template #detail-empty>
        <el-empty description="请选择左侧编组以维护成员" />
      </template>
    </MasterDetailLayout>

    <DeviceGroupForm
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
import DeviceGroupForm from './DeviceGroupForm.vue'
import DeviceGroupMembers from './DeviceGroupMembers.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { deviceGroupPage, deviceGroupAddOrUpdate, deviceGroupDelete } from '@/api/basedata/deviceGroup'
import type { SpDeviceGroup } from '@/types/basedata'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })
const selected = ref<SpDeviceGroup | null>(null)

const { data: pageData, loading, run } = useRequest(
  () => deviceGroupPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpDeviceGroup[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

// 列表刷新后,若当前选中编组已不在行集中,清空选中以避免陈旧引用
watch(tableData, (rows) => {
  if (selected.value && !rows.some((r) => r.id === selected.value!.id)) {
    selected.value = null
  }
})

const columns: Column[] = [
  { prop: 'code', label: '编组编码', width: 120 },
  { prop: 'name', label: '编组名称', minWidth: 140 },
  { prop: 'descr', label: '描述', minWidth: 160 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpDeviceGroup> | null>(null)
const submitLoading = ref(false)

function select(row: SpDeviceGroup) {
  selected.value = row
}

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpDeviceGroup) {
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

async function handleFormSubmit(dto: Partial<SpDeviceGroup>) {
  submitLoading.value = true
  try {
    await deviceGroupAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpDeviceGroup) {
  try {
    await ElMessageBox.confirm(`确认删除编组「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deviceGroupDelete(row.id!)
    ElMessage.success('删除成功')
    if (selected.value?.id === row.id) selected.value = null
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>

<style scoped>
.qbox { width: 150px; }
</style>
