<template>
  <PageContainer>
    <MasterDetailLayout :has-selection="!!selected?.id">
      <template #master>
        <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
          <el-form-item label="单元代码">
            <el-input v-model="search.code" placeholder="请输入单元代码" clearable />
          </el-form-item>
          <el-form-item label="单元名称">
            <el-input v-model="search.name" placeholder="请输入单元名称" clearable />
          </el-form-item>
        </SearchForm>

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
            <el-button v-permission="'process-unit:add'" type="primary" :icon="Plus" @click="openCreate">
              新增
            </el-button>
          </template>

          <template #col-hasLineWarehouse="{ row }">
            <el-tag :type="(row as SpProcessUnit).hasLineWarehouse === '1' ? 'success' : 'info'" effect="plain">
              {{ (row as SpProcessUnit).hasLineWarehouse === '1' ? '是' : '否' }}
            </el-tag>
          </template>

          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="openEdit(row as SpProcessUnit)">编辑</el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row as SpProcessUnit)">删除</el-button>
          </template>
        </DataTable>
      </template>

      <template #detail>
        <ProcessUnitTeams v-if="selected?.id" :key="selected.id" :unit-id="selected.id" />
      </template>
      <template #detail-empty>
        <el-empty description="请选择左侧加工单元以维护关联班组" />
      </template>
    </MasterDetailLayout>

    <ProcessUnitFormDialog
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
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ProcessUnitFormDialog from './ProcessUnitFormDialog.vue'
import ProcessUnitTeams from './ProcessUnitTeams.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { processUnitPage, processUnitAddOrUpdate, processUnitDelete } from '@/api/basedata/processUnit'
import type { SpProcessUnit } from '@/types/processUnit'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })
const selected = ref<SpProcessUnit | null>(null)

const { data: pageData, loading, run } = useRequest(
  () => processUnitPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpProcessUnit[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

// 列表刷新后,选中单元若已不在行集中,清空选中避免陈旧引用
watch(tableData, (rows) => {
  if (selected.value && !rows.some((r) => r.id === selected.value!.id)) {
    selected.value = null
  }
})

const columns: Column[] = [
  { prop: 'code', label: '单元代码', width: 140 },
  { prop: 'name', label: '单元名称', minWidth: 160 },
  { prop: 'type', label: '类型', minWidth: 120 },
  { prop: 'hasLineWarehouse', label: '线边库', width: 90 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpProcessUnit> | null>(null)
const submitLoading = ref(false)

function select(row: SpProcessUnit) {
  selected.value = row
}
function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpProcessUnit) {
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

async function handleFormSubmit(dto: Partial<SpProcessUnit>) {
  submitLoading.value = true
  try {
    await processUnitAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpProcessUnit) {
  try {
    await ElMessageBox.confirm(`确认删除加工单元「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await processUnitDelete(row.id!)
    ElMessage.success('删除成功')
    if (selected.value?.id === row.id) selected.value = null
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
