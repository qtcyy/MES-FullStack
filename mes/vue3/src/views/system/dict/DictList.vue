<template>
  <PageContainer>
    <MasterDetailLayout :has-selection="!!selectedType">

      <!-- ══════════════════ 左侧:字典类型 ══════════════════ -->
      <template #master>
        <!-- 搜索栏(按名称过滤类型) -->
        <SearchForm :model="typeSearch" @search="handleTypeSearch" @reset="handleTypeReset">
          <el-form-item label="类型名称">
            <el-input v-model="typeSearch.nameLike" placeholder="请输入类型名称" clearable />
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

        <!-- 类型列表:数据量小,一次性全量展示,客户端过滤后分页 -->
        <DataTable
          :data="filteredTypePage"
          :loading="loading"
          :columns="typeColumns"
          :pager="typePager"
          :action-width="120"
          @page-change="(p) => (typePager.current = p)"
          @size-change="(s) => { typePager.size = s; typePager.current = 1 }"
        >
          <!-- 名称列:可点击高亮选中 -->
          <template #col-name="{ row }">
            <el-link
              :type="selectedType?.id === (row as SysDict).id ? 'primary' : 'default'"
              :underline="false"
              @click="handleSelectType(row as SysDict)"
            >
              {{ (row as SysDict).name }}
            </el-link>
          </template>

          <!-- 操作列 -->
          <template #actions="{ row }">
            <el-button type="primary" link size="small" @click="openEditType(row as SysDict)">编辑</el-button>
            <el-button type="danger"  link size="small" @click="handleDeleteType(row as SysDict)">删除</el-button>
          </template>
        </DataTable>
      </template>

      <!-- ══════════════════ 右侧:字典项 ══════════════════ -->
      <template #detail>
        <div class="dict-detail-header">
          <span class="dict-detail-title">【{{ selectedType!.name }}】字典项</span>
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

      <!-- 未选中时占位(MasterDetailLayout 默认已有 el-empty,此处可覆盖) -->
      <template #detail-empty>
        <el-empty description="请点击左侧类型名称查看字典项" />
      </template>

    </MasterDetailLayout>

    <!-- ══════════════════ 弹窗 ══════════════════ -->

    <!-- 字典类型:新增/编辑 -->
    <DictTypeForm
      v-model="typeDialogVisible"
      :model="editingType"
      :loading="submitLoading"
      @submit="handleTypeSubmit"
    />

    <!-- 字典项:新增/编辑 -->
    <DictItemForm
      v-model="itemDialogVisible"
      :model="editingItem"
      :parent-id="selectedType?.id ?? ''"
      :parent-type="selectedType?.type ?? ''"
      :loading="submitLoading"
      @submit="handleItemSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import type { Column } from '@/components/DataTable.vue'
import DictTypeForm from './DictTypeForm.vue'
import DictItemForm from './DictItemForm.vue'
import { useRequest } from '@/composables/useRequest'
import { dictPage, dictAddOrUpdate, dictDelete } from '@/api/system/dict'
import { partitionDict } from '@/utils/systemTree'
import type { SysDict } from '@/types/system'

// ─── 全量拉取 ─────────────────────────────────────────────────────────────────
const { data: pageData, loading, run } = useRequest(
  () => dictPage({ current: 1, size: 9999 }),
  { immediate: true },
)

// ─── 两级拆分 ─────────────────────────────────────────────────────────────────
/**
 * partitionDict 按 parentId==='0' 拆分:
 *   types       = 类型记录列表
 *   itemsByType = { [类型id]: 项记录[] }
 * NOTE: 类型行判定依赖 parentId==='0',此为运行时假设,待后端接入后核实。
 */
const allTypes = computed<SysDict[]>(() => {
  const records = (pageData.value?.records ?? []) as SysDict[]
  return partitionDict(records).types
})

const itemsByType = computed<Record<string, SysDict[]>>(() => {
  const records = (pageData.value?.records ?? []) as SysDict[]
  return partitionDict(records).itemsByType
})

// ─── 选中类型 ─────────────────────────────────────────────────────────────────
const selectedType = ref<SysDict | null>(null)

function handleSelectType(row: SysDict) {
  selectedType.value = row
  // 切换类型时重置字典项分页
  itemPager.current = 1
}

// ─── 类型列:客户端搜索过滤 ────────────────────────────────────────────────────
const typeSearch = reactive({ nameLike: '' })

const filteredTypes = computed<SysDict[]>(() => {
  const kw = typeSearch.nameLike.trim().toLowerCase()
  if (!kw) return allTypes.value
  return allTypes.value.filter((t) => t.name.toLowerCase().includes(kw))
})

function handleTypeSearch() {
  typePager.current = 1
}

function handleTypeReset() {
  typeSearch.nameLike = ''
  typePager.current = 1
}

// ─── 类型客户端分页 ───────────────────────────────────────────────────────────
const typePager = reactive({ current: 1, size: 10, total: 0 })

const filteredTypePage = computed<SysDict[]>(() => {
  const list = filteredTypes.value
  typePager.total = list.length
  const start = (typePager.current - 1) * typePager.size
  return list.slice(start, start + typePager.size)
})

// ─── 字典项客户端分页 ─────────────────────────────────────────────────────────
const itemPager = reactive({ current: 1, size: 10, total: 0 })

const currentItems = computed<SysDict[]>(() => {
  if (!selectedType.value) return []
  return itemsByType.value[selectedType.value.id] ?? []
})

const itemPage = computed<SysDict[]>(() => {
  const list = currentItems.value
  itemPager.total = list.length
  const start = (itemPager.current - 1) * itemPager.size
  return list.slice(start, start + itemPager.size)
})

// ─── 列定义 ───────────────────────────────────────────────────────────────────
const typeColumns: Column[] = [
  { prop: 'name',    label: '类型名称', minWidth: 100 },
  { prop: 'type',    label: '类型标识', width: 120 },
  { prop: 'sortNum', label: '排序',     width: 70 },
]

const itemColumns: Column[] = [
  { prop: 'name',    label: '项名称', minWidth: 100 },
  { prop: 'value',   label: '数据值', width: 120 },
  { prop: 'sortNum', label: '排序',   width: 70 },
]

// ─── 增删改后保持选中 ──────────────────────────────────────────────────────────
/** 重新拉取全量数据,并按 id 找回选中类型的最新对象 */
async function refresh() {
  const prevId = selectedType.value?.id
  try {
    await run()
  } catch {
    ElMessage.warning('数据刷新失败,请手动刷新')
    return
  }
  if (prevId) {
    // 按 id 取回最新对象,保持选中态
    const found = allTypes.value.find((t) => t.id === prevId) ?? null
    selectedType.value = found
  }
}

// ─── 弹窗:类型 ───────────────────────────────────────────────────────────────
const typeDialogVisible = ref(false)
const editingType = ref<SysDict | null>(null)
const submitLoading = ref(false)

function openCreateType() {
  editingType.value = null
  typeDialogVisible.value = true
}

function openEditType(row: SysDict) {
  editingType.value = { ...row }
  typeDialogVisible.value = true
}

async function handleTypeSubmit(dto: Partial<SysDict>) {
  submitLoading.value = true
  try {
    await dictAddOrUpdate(dto)
    ElMessage.success('保存成功')
    typeDialogVisible.value = false
    await refresh()
  } finally {
    submitLoading.value = false
  }
}

async function handleDeleteType(row: SysDict) {
  try {
    await ElMessageBox.confirm(
      `确认删除字典类型「${row.name}」?删除后该类型下所有字典项将无法访问。`,
      '提示',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    // 用户取消,吞掉
    return
  }
  try {
    await dictDelete(row.id)
    ElMessage.success('删除成功')
    // 若删的是当前选中类型,清除选中
    if (selectedType.value?.id === row.id) selectedType.value = null
    await refresh()
  } catch { /* 响应拦截器已提示错误,吞掉防未捕获 rejection */ }
}

// ─── 弹窗:字典项 ─────────────────────────────────────────────────────────────
const itemDialogVisible = ref(false)
const editingItem = ref<SysDict | null>(null)

function openCreateItem() {
  editingItem.value = null
  itemDialogVisible.value = true
}

function openEditItem(row: SysDict) {
  editingItem.value = { ...row }
  itemDialogVisible.value = true
}

async function handleItemSubmit(dto: Partial<SysDict>) {
  submitLoading.value = true
  try {
    await dictAddOrUpdate(dto)
    ElMessage.success('保存成功')
    itemDialogVisible.value = false
    await refresh()
  } finally {
    submitLoading.value = false
  }
}

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
</style>
