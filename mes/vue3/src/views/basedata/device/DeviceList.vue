<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="设备编码">
        <el-input v-model="search.code" placeholder="请输入设备编码" clearable />
      </el-form-item>
      <el-form-item label="设备名称">
        <el-input v-model="search.name" placeholder="请输入设备名称" clearable />
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
        <el-button v-permission="'device:add'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpDevice)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpDevice)">删除</el-button>
      </template>
    </DataTable>

    <DeviceForm
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
import DeviceForm from './DeviceForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { devicePage, deviceAddOrUpdate, deviceDelete } from '@/api/basedata/device'
import { validateDevice, buildDevicePayload } from '@/utils/device'
import type { SpDevice } from '@/types/basedata'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })

const { data: pageData, loading, run } = useRequest(
  () => devicePage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpDevice[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

const columns: Column[] = [
  { prop: 'code', label: '设备编码', width: 130 },
  { prop: 'name', label: '设备名称', minWidth: 140 },
  { prop: 'type', label: '类型', width: 110 },
  { prop: 'model', label: '型号', width: 120 },
  { prop: 'specs', label: '规格', minWidth: 120 },
  { prop: 'location', label: '位置', width: 120 },
  { prop: 'status', label: '状态', width: 90 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpDevice> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpDevice) {
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

async function handleFormSubmit(dto: Partial<SpDevice>) {
  const errs = validateDevice(dto)
  if (errs.length) {
    ElMessage.warning(errs[0])
    return
  }
  submitLoading.value = true
  try {
    await deviceAddOrUpdate(buildDevicePayload(dto))
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpDevice) {
  try {
    await ElMessageBox.confirm(`确认删除设备「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deviceDelete(row.id!)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
