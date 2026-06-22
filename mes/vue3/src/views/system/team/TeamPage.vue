<template>
  <PageContainer title="班组员工定义">
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
            <el-input v-model="search.code" placeholder="班组代码" clearable class="qbox" @keyup.enter="handleSearch" />
            <el-input v-model="search.name" placeholder="班组名称" clearable class="qbox" @keyup.enter="handleSearch" />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-button v-permission="'team:add'" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
          </template>

          <template #col-shift="{ row }">
            {{ shiftText(row as SpTeamDTO) }}
          </template>
          <template #col-workdays="{ row }">
            {{ workdaysLabel((row as SpTeamDTO).workdays) }}
          </template>

          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="openEdit(row as SpTeamDTO)">编辑</el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row as SpTeamDTO)">删除</el-button>
          </template>
        </DataTable>
      </template>

      <template #detail>
        <TeamMembers v-if="selected?.id" :key="selected.id" :team-id="selected.id" />
      </template>
      <template #detail-empty>
        <el-empty description="请选择左侧班组以维护成员" />
      </template>
    </MasterDetailLayout>

    <TeamForm
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
import TeamForm from './TeamForm.vue'
import TeamMembers from './TeamMembers.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { teamPage, teamAddOrUpdate, teamDelete } from '@/api/system/team'
import { workdaysLabel } from '@/utils/team'
import type { SpTeam, SpTeamDTO } from '@/types/team'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ code: '', name: '' })
const selected = ref<SpTeamDTO | null>(null)

const { data: pageData, loading, run } = useRequest(
  () => teamPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpTeamDTO[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

// 列表刷新后,选中班组若已不在行集中,清空选中避免陈旧引用
watch(tableData, (rows) => {
  if (selected.value && !rows.some((r) => r.id === selected.value!.id)) {
    selected.value = null
  }
})

const columns: Column[] = [
  { prop: 'code', label: '班组代码', width: 120 },
  { prop: 'name', label: '班组名称', minWidth: 140 },
  { prop: 'shift', label: '上下班', width: 130 },
  { prop: 'workdays', label: '工作日', minWidth: 160 },
  { prop: 'userCount', label: '成员数', width: 90 },
]

function shiftText(row: SpTeamDTO): string {
  if (!row.startTime && !row.endTime) return '-'
  return `${row.startTime ?? '--'} ~ ${row.endTime ?? '--'}`
}

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpTeamDTO> | null>(null)
const submitLoading = ref(false)

function select(row: SpTeamDTO) {
  selected.value = row
}
function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpTeamDTO) {
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

async function handleFormSubmit(dto: Partial<SpTeam>) {
  submitLoading.value = true
  try {
    await teamAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpTeamDTO) {
  try {
    await ElMessageBox.confirm(`确认删除班组「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await teamDelete(row.id!)
    ElMessage.success('删除成功')
    if (selected.value?.id === row.id) selected.value = null
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>

<style scoped>
.qbox { width: 150px; }
</style>
