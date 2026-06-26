<template>
  <PageContainer>
    <MasterDetailLayout :has-selection="hasSelection">

      <!-- ══════════════════ 左侧:字典类型 ══════════════════ -->
      <template #master>
        <!-- 搜索栏(按 type 包含过滤) -->
        <SearchForm :model="typeSearch" @search="handleTypeSearch" @reset="handleTypeReset">
          <el-form-item label="类型标识">
            <el-input v-model="typeSearch.typeLike" placeholder="请输入类型标识" clearable />
          </el-form-item>
        </SearchForm>

        <!-- 类型工具栏 -->
        <div class="dict-toolbar">
          <el-button
            v-permission="'dict:add'"
            type="primary"
            :icon="Plus"
            @click="openCreateType"
          >
            新增类型
          </el-button>
        </div>

        <!-- 类型列表:按 type 分组,客户端过滤后分页;整行可点击选中 -->
        <DataTable
          :data="filteredTypePage"
          :loading="loading"
          :columns="typeColumns"
          :pager="typePager"
          :action-width="0"
          @page-change="(p) => (typePager.current = p)"
          @size-change="(s) => { typePager.size = s; typePager.current = 1 }"
          @row-click="(row) => handleSelectType(row as TypeRow)"
        >
          <!-- type 列:高亮选中行 -->
          <template #col-type="{ row }">
            <span :class="selectedType?.type === (row as TypeRow).type ? 'dict-type-selected' : ''">
              {{ (row as TypeRow).type }}
            </span>
          </template>
        </DataTable>
      </template>

      <!-- ══════════════════ 右侧:字典项 ══════════════════ -->
      <template #detail>
        <div class="dict-detail-header">
          <span class="dict-detail-title">【{{ selectedType?.type }}】字典项</span>
        </div>

        <!-- 字典项工具栏 -->
        <div class="dict-toolbar">
          <el-button
            v-permission="'dict:add'"
            type="primary"
            :icon="Plus"
            @click="openCreateItem"
          >
            新增字典项
          </el-button>
        </div>

        <!-- 字典项列表 -->
        <DataTable
          :data="itemPage"
          :loading="loading"
          :columns="itemColumns"
          :pager="itemPager"
          :action-width="120"
          @page-change="(p) => (itemPager.current = p)"
          @size-change="(s) => { itemPager.size = s; itemPager.current = 1 }"
        >
          <!-- 操作列 -->
          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click="openEditItem(row as SysDict)">编辑</el-button>
            <el-button type="danger"  link size="small" @click="handleDeleteItem(row as SysDict)">删除</el-button>
          </template>
        </DataTable>
      </template>

      <!-- 未选中时占位 -->
      <template #detail-empty>
        <el-empty description="请点击左侧类型查看字典项" />
      </template>

    </MasterDetailLayout>

    <!-- ══════════════════ 弹窗:统一入口 ══════════════════ -->
    <DictEntryForm
      v-model="entryDialogVisible"
      :model="editingEntry"
      :mode="entryMode"
      :selected-type="selectedType?.type ?? ''"
      :loading="submitLoading"
      @submit="handleEntrySubmit"
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
import DataTable from '@/components/DataTable.vue'
import type { Column } from '@/components/DataTable.vue'
import DictEntryForm from './DictEntryForm.vue'
import { useRequest } from '@/composables/useRequest'
import { dictPage, dictAddOrUpdate, dictDelete } from '@/api/system/dict'
import { partitionDict } from '@/utils/systemTree'
import type { SysDict } from '@/types/system'

// ─── 类型行(左侧列表)─────────────────────────────────────────────────────────
interface TypeRow {
  type: string
  count: number
}

// ─── 全量拉取 ─────────────────────────────────────────────────────────────────
const { data: pageData, loading, run } = useRequest(
  () => dictPage({ current: 1, size: 9999 }),
  { immediate: true },
)

// ─── 按 type 分组 ─────────────────────────────────────────────────────────────
const partitioned = computed(() => partitionDict((pageData.value?.records ?? []) as SysDict[]))
const allTypes = computed<TypeRow[]>(() => partitioned.value.types)
const itemsByType = computed<Record<string, SysDict[]>>(() => partitioned.value.itemsByType)

// ─── 选中类型(以 type 字符串作 key) ──────────────────────────────────────────
const selectedType = ref<TypeRow | null>(null)
const hasSelection = computed(() => !!selectedType.value)

function handleSelectType(row: TypeRow) {
  selectedType.value = row
  itemPager.current = 1
}

// ─── 类型搜索(按 type 包含过滤) ───────────────────────────────────────────────
const typeSearch = reactive({ typeLike: '' })

const filteredTypes = computed<TypeRow[]>(() => {
  const kw = typeSearch.typeLike.trim().toLowerCase()
  if (!kw) return allTypes.value
  return allTypes.value.filter((t) => t.type.toLowerCase().includes(kw))
})

function handleTypeSearch() {
  typePager.current = 1
}

function handleTypeReset() {
  typeSearch.typeLike = ''
  typePager.current = 1
}

// ─── 类型客户端分页 ───────────────────────────────────────────────────────────
const typePager = reactive({ current: 1, size: 10, total: 0 })

watch(
  filteredTypes,
  (list) => {
    typePager.total = list.length
    typePager.current = 1
  },
  { immediate: true },
)

watch(
  () => typeSearch.typeLike,
  () => { typePager.current = 1 },
)

const filteredTypePage = computed<TypeRow[]>(() => {
  const list = filteredTypes.value
  const start = (typePager.current - 1) * typePager.size
  return list.slice(start, start + typePager.size)
})

// ─── 字典项客户端分页 ─────────────────────────────────────────────────────────
const itemPager = reactive({ current: 1, size: 10, total: 0 })

const currentItems = computed<SysDict[]>(() => {
  if (!selectedType.value) return []
  return itemsByType.value[selectedType.value.type] ?? []
})

watch(
  currentItems,
  (list) => {
    itemPager.total = list.length
    itemPager.current = 1
  },
  { immediate: true },
)

const itemPage = computed<SysDict[]>(() => {
  const list = currentItems.value
  const start = (itemPager.current - 1) * itemPager.size
  return list.slice(start, start + itemPager.size)
})

// ─── 列定义 ───────────────────────────────────────────────────────────────────
const typeColumns: Column[] = [
  { prop: 'type',  label: '类型标识', minWidth: 120 },
  { prop: 'count', label: '条目数',   width: 80 },
]

const itemColumns: Column[] = [
  { prop: 'name',    label: '名称',   minWidth: 100 },
  { prop: 'value',   label: '数据值', width: 120 },
  { prop: 'sortNum', label: '排序',   width: 70 },
]

// ─── 增删改后保持选中 ──────────────────────────────────────────────────────────
/**
 * 重新拉取全量数据,并按 type 字符串找回选中类型的最新对象。
 * 若该 type 已无任何行(如删除了最后一条)则清空 selectedType。
 */
async function refresh() {
  const prevType = selectedType.value?.type
  try {
    await run()
  } catch {
    ElMessage.warning('数据刷新失败,请手动刷新')
    return
  }
  if (prevType) {
    const found = allTypes.value.find((t) => t.type === prevType) ?? null
    selectedType.value = found
  }
}

// ─── 弹窗:统一入口 ───────────────────────────────────────────────────────────
const entryDialogVisible = ref(false)
const editingEntry = ref<SysDict | null>(null)
const entryMode = ref<'new-type' | 'new-item' | 'edit'>('new-type')
const submitLoading = ref(false)

/** 新增类型:type 可编辑 */
function openCreateType() {
  editingEntry.value = null
  entryMode.value = 'new-type'
  entryDialogVisible.value = true
}

/** 选中类型下新增项:type 预填+禁用 */
function openCreateItem() {
  editingEntry.value = null
  entryMode.value = 'new-item'
  entryDialogVisible.value = true
}

/** 编辑现有字典项 */
function openEditItem(row: SysDict) {
  editingEntry.value = { ...row }
  entryMode.value = 'edit'
  entryDialogVisible.value = true
}

async function handleEntrySubmit(dto: Partial<SysDict>) {
  submitLoading.value = true
  try {
    await dictAddOrUpdate(dto)
    ElMessage.success('保存成功')
    entryDialogVisible.value = false
    // 新增类型后选中该类型
    const isNewType = entryMode.value === 'new-type'
    await refresh()
    if (isNewType && dto.type) {
      const found = allTypes.value.find((t) => t.type === dto.type) ?? null
      selectedType.value = found
    }
  } finally {
    submitLoading.value = false
  }
}

// ─── 删除字典项 ───────────────────────────────────────────────────────────────
async function handleDeleteItem(row: SysDict) {
  try {
    await ElMessageBox.confirm(
      `确认删除字典项「${row.name}」?`,
      '提示',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await dictDelete(row.id)
    ElMessage.success('删除成功')
    await refresh()
  } catch { /* 响应拦截器已提示错误,吞掉防未捕获 rejection */ }
}
</script>

<style scoped>
.dict-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}

.dict-detail-header {
  margin-bottom: var(--sp-3);
}

.dict-detail-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.dict-type-selected {
  color: var(--el-color-primary);
  font-weight: 600;
}
</style>
