<template>
  <PageContainer title="动态表配置">
    <DataTable
      :data="tableData"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <template #toolbar>
        <el-input v-model="search.tableName" placeholder="表名" clearable class="qbox" @keyup.enter="handleSearch" />
        <el-input v-model="search.tableDesc" placeholder="表描述" clearable class="qbox" @keyup.enter="handleSearch" />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button v-permission="'manager:add'" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </template>
      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click.stop="openEdit(row as SpTableManager)">编辑</el-button>
        <el-button type="danger" link size="small" @click.stop="handleDelete(row as SpTableManager)">删除</el-button>
      </template>
    </DataTable>

    <ManagerForm v-model="dialogVisible" :model="editing" :loading="submitLoading" @submit="handleSubmit" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ManagerForm from './ManagerForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { managerPage, managerAddOrUpdate, managerDelete } from '@/api/basedata/manager'
import type { SpTableManager, SpTableManagerDto } from '@/types/manager'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ tableName: '', tableDesc: '' })
const tableData = ref<SpTableManager[]>([])
const columns: Column[] = [
  { prop: 'tableName', label: '表名' },
  { prop: 'tableDesc', label: '表描述' },
]

const { loading, run: load } = useRequest(async () => {
  const res = await managerPage({ ...search, current: pager.current, size: pager.size })
  tableData.value = res.records
  setTotal(res.total)
})
load()

const handleSearch = () => {
  reset()
  load()
}
const handleReset = () => {
  search.tableName = ''
  search.tableDesc = ''
  handleSearch()
}
const handlePageChange = (p: number) => {
  pager.current = p
  load()
}
const handleSizeChange = (s: number) => {
  pager.size = s
  reset()
  load()
}

const dialogVisible = ref(false)
const editing = ref<SpTableManager | null>(null)
const submitLoading = ref(false)
const openCreate = () => {
  editing.value = null
  dialogVisible.value = true
}
const openEdit = (row: SpTableManager) => {
  editing.value = row
  dialogVisible.value = true
}
const handleSubmit = async (dto: SpTableManagerDto) => {
  submitLoading.value = true
  try {
    await managerAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } finally {
    submitLoading.value = false
  }
}
const handleDelete = async (row: SpTableManager) => {
  await ElMessageBox.confirm(`确认删除动态表「${row.tableName}」及其字段配置?`, '提示', { type: 'warning' })
  await managerDelete(row.id!)
  ElMessage.success('删除成功')
  load()
}
</script>

<style scoped>
.qbox { width: 160px; }
</style>
