<template>
  <PageContainer>
    <!-- 搜索栏 -->
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="角色名称">
        <el-input v-model="search.nameLike" placeholder="请输入角色名称" clearable />
      </el-form-item>
    </SearchForm>

    <!-- 数据表格 -->
    <DataTable
      :data="tableData"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <!-- 工具栏:新增按钮(权限控制) -->
      <template #toolbar>
        <el-button v-permission="'role:add'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <!-- 系统角色列:徽标渲染 -->
      <template #col-isSystem="{ row }">
        <el-tag v-if="row.isSystem === '1'" type="danger">系统</el-tag>
        <el-tag v-else type="info">普通</el-tag>
      </template>

      <!-- 操作列 -->
      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SysRole)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SysRole)">删除</el-button>
      </template>
    </DataTable>

    <!-- 新增/编辑弹窗 -->
    <RoleForm
      v-model="dialogVisible"
      :model="editingModel"
      :menu-tree="menuTree"
      :checked-ids="checkedIds"
      :loading="submitLoading"
      @submit="handleFormSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import type { Column } from '@/components/DataTable.vue'
import RoleForm from './RoleForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { rolePage, roleAddOrUpdate, roleDelete, roleMenuIds } from '@/api/system/role'
import { menuTreeAdmin } from '@/api/system/menu'
import type { SysRole, SysRoleDTO } from '@/types/system'
import type { TreeVO, SysMenu } from '@/types/menu'

// ─── 分页 ─────────────────────────────────────────────────────────────────────
const { pager, setTotal, reset } = usePagination()

// ─── 搜索条件 ─────────────────────────────────────────────────────────────────
const search = reactive({ nameLike: '' })

// ─── 列表请求 ─────────────────────────────────────────────────────────────────
const { data: pageData, loading, run } = useRequest(
  () => rolePage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

// 拉取后同步 total;T 推断为 SysRole,无需强转
const tableData = computed<SysRole[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

// ─── 表格列定义 ───────────────────────────────────────────────────────────────
const columns: Column[] = [
  { prop: 'name', label: '角色名称', minWidth: 140 },
  { prop: 'code', label: '角色编码', minWidth: 140 },
  { prop: 'descr', label: '描述', minWidth: 160 },
  { prop: 'isSystem', label: '系统角色', width: 100 },
]

// ─── 菜单树数据(供表单使用) ──────────────────────────────────────────────────
const menuTree = ref<TreeVO<SysMenu>[]>([])

onMounted(async () => {
  try {
    const tree = await menuTreeAdmin()
    menuTree.value = tree ?? []
  } catch {
    ElMessage.warning('菜单树加载失败,权限树可能无法正常显示')
  }
})

// ─── 弹窗状态 ─────────────────────────────────────────────────────────────────
const dialogVisible = ref(false)
const editingModel = ref<SysRoleDTO | null>(null)
const checkedIds = ref<string[]>([])
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  checkedIds.value = []
  dialogVisible.value = true
}

async function openEdit(row: SysRole) {
  editingModel.value = { ...row }
  // 先拉取已勾选的菜单 id,再打开弹窗
  try {
    const ids = await roleMenuIds(row.id)
    checkedIds.value = ids ?? []
  } catch {
    checkedIds.value = []
    ElMessage.warning('菜单权限加载失败,请重试')
  }
  dialogVisible.value = true
}

// ─── 分页事件 ─────────────────────────────────────────────────────────────────
function handlePageChange(page: number) {
  pager.current = page
  run()
}

function handleSizeChange(size: number) {
  pager.size = size
  reset()
  run()
}

// ─── 搜索/重置 ────────────────────────────────────────────────────────────────
function handleSearch() {
  reset()
  run()
}

function handleReset() {
  search.nameLike = ''
  reset()
  run()
}

// ─── 提交(新增/编辑) ─────────────────────────────────────────────────────────
async function handleFormSubmit(dto: SysRoleDTO) {
  submitLoading.value = true
  try {
    await roleAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

// ─── 删除 ─────────────────────────────────────────────────────────────────────
async function handleDelete(row: SysRole) {
  try {
    await ElMessageBox.confirm(`确认删除角色「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await roleDelete(row.id)
  ElMessage.success('删除成功')
  run()
}
</script>
