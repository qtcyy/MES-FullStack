<template>
  <PageContainer title="动态数据维护">
    <MasterDetailLayout :has-selection="!!selected?.id">
      <template #master>
        <DataTable
          :data="tables"
          :loading="tablesLoading"
          :columns="tableColumns"
          :pager="tablePager"
          @row-click="selectTable"
          @page-change="handleTablePage"
          @size-change="handleTableSize"
        >
          <template #toolbar>
            <span class="hint">选择要维护数据的表</span>
          </template>
          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="selectTable(row as SpTableManager)">维护</el-button>
          </template>
        </DataTable>
      </template>

      <template #detail>
        <div class="detail-head">
          <span class="detail-title">{{ selected?.tableDesc || selected?.tableName }}</span>
          <el-button v-permission="'manager:add'" type="primary" :icon="Plus" size="small" @click="openCreate">新增数据</el-button>
        </div>
        <DataTable
          :key="selected!.id"
          :data="rows"
          :loading="rowsLoading"
          :columns="dataColumns"
          :pager="dataPager"
          @page-change="handleDataPage"
          @size-change="handleDataSize"
        >
          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click.stop="openEdit(row as ManagerDataRow)">编辑</el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row as ManagerDataRow)">删除</el-button>
          </template>
        </DataTable>
      </template>
      <template #detail-empty>
        <el-empty description="请选择左侧表以维护数据" />
      </template>
    </MasterDetailLayout>

    <ManagerDataForm
      v-if="selected?.id"
      v-model="dialogVisible"
      :items="items"
      :table-name="selected.tableName"
      :table-name-id="selected.id"
      :row="editingRow"
      :loading="submitLoading"
      @submit="handleSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import ManagerDataForm from './ManagerDataForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { managerPage, managerItemsByTableNameId } from '@/api/basedata/manager'
import { managerDataPage, managerDataAddOrUpdate, managerDataDelete } from '@/api/basedata/managerData'
import { buildColumns } from '@/utils/managerData'
import type { SpTableManager, SpTableManagerItem, ManagerDataRow } from '@/types/manager'

// ---- 左:表列表 ----
const { pager: tablePager, setTotal: setTableTotal, reset: resetTable } = usePagination()
const tables = ref<SpTableManager[]>([])
const tableColumns: Column[] = [
  { prop: 'tableName', label: '表名' },
  { prop: 'tableDesc', label: '描述' },
]
const { loading: tablesLoading, run: loadTables } = useRequest(async () => {
  const res = await managerPage({ current: tablePager.current, size: tablePager.size })
  tables.value = res.records
  setTableTotal(res.total)
})
loadTables()
const handleTablePage = (p: number) => {
  tablePager.current = p
  loadTables()
}
const handleTableSize = (s: number) => {
  tablePager.size = s
  resetTable()
  loadTables()
}

// ---- 选中表 ----
const selected = ref<SpTableManager | null>(null)
const items = ref<SpTableManagerItem[]>([])
const dataColumns = computed<Column[]>(() =>
  buildColumns(items.value).map((c) => ({ prop: c.field, label: c.label })),
)

// ---- 右:动态数据 ----
const { pager: dataPager, setTotal: setDataTotal, reset: resetData } = usePagination()
const rows = ref<ManagerDataRow[]>([])
const { loading: rowsLoading, run: loadRows } = useRequest(async () => {
  if (!selected.value?.id) return
  const res = await managerDataPage({
    tableName: selected.value.tableName,
    tableNameId: selected.value.id,
    current: dataPager.current,
    size: dataPager.size,
  })
  rows.value = res.records
  setDataTotal(res.total)
})

// 守卫:快速切换表时丢弃过期的明细加载结果,避免动态列与选中表错配
let selectToken = 0
const selectTable = async (row: SpTableManager) => {
  selected.value = row
  const token = ++selectToken
  items.value = []
  try {
    const loaded = await managerItemsByTableNameId(row.id!)
    if (token !== selectToken) return
    items.value = loaded
  } catch {
    if (token === selectToken) items.value = [] // 响应拦截器已提示
  }
  if (token !== selectToken) return
  resetData()
  loadRows()
}
const handleDataPage = (p: number) => {
  dataPager.current = p
  loadRows()
}
const handleDataSize = (s: number) => {
  dataPager.size = s
  resetData()
  loadRows()
}

// ---- 增删改 ----
const dialogVisible = ref(false)
const editingRow = ref<ManagerDataRow | null>(null)
const submitLoading = ref(false)
const openCreate = () => {
  editingRow.value = null
  dialogVisible.value = true
}
const openEdit = (row: ManagerDataRow) => {
  editingRow.value = row
  dialogVisible.value = true
}
const handleSubmit = async (body: Record<string, string>) => {
  submitLoading.value = true
  try {
    await managerDataAddOrUpdate(body)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadRows()
  } finally {
    submitLoading.value = false
  }
}
const handleDelete = async (row: ManagerDataRow) => {
  try {
    await ElMessageBox.confirm('确认删除该行数据?', '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await managerDataDelete(selected.value!.tableName, row.id)
    ElMessage.success('删除成功')
    loadRows()
  } catch {
    /* 响应拦截器已提示 */
  }
}
</script>

<style scoped>
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
}
.detail-title {
  font-weight: 600;
}
.hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
