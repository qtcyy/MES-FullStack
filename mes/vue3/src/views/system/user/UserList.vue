<template>
  <div class="user-list">
    <!-- 搜索栏 -->
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="登录名">
        <el-input v-model="search.usernameLike" placeholder="请输入登录名" clearable />
      </el-form-item>
      <el-form-item label="姓名">
        <el-input v-model="search.nameLike" placeholder="请输入姓名" clearable />
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
        <el-button v-permission="'user:add'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <!-- 状态列:徽标渲染 -->
      <template #col-deleted="{ row }">
        <el-tag v-if="row.deleted === '0'" type="success">正常</el-tag>
        <el-tag v-else-if="row.deleted === '2'" type="info">禁用</el-tag>
        <el-tag v-else-if="row.deleted === '1'" type="danger">已删除</el-tag>
        <el-tag v-else type="warning">未知</el-tag>
      </template>

      <!-- 操作列 -->
      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SysUser)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SysUser)">删除</el-button>
      </template>
    </DataTable>

    <!-- 新增/编辑弹窗 -->
    <UserForm
      v-model="dialogVisible"
      :model="editingModel"
      :roles="roleList"
      :dept-tree="deptTree"
      :loading="submitLoading"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import type { Column } from '@/components/DataTable.vue'
import UserForm from './UserForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { userPage, userAddOrUpdate, userDelete } from '@/api/system/user'
import { rolePage } from '@/api/system/role'
import { deptAll } from '@/api/system/dept'
import { buildTree, type Tree } from '@/utils/systemTree'
import type { SysUser, SysUserDTO, SysRole, SysDepartment } from '@/types/system'

// ─── 分页 ─────────────────────────────────────────────────────────────────────
const { pager, setTotal, reset } = usePagination()

// ─── 搜索条件 ─────────────────────────────────────────────────────────────────
const search = reactive({ usernameLike: '', nameLike: '' })

// ─── 列表请求 ─────────────────────────────────────────────────────────────────
const { data: pageData, loading, run } = useRequest(
  () => userPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

// 拉取后同步 total;DataTable 泛型要求 Record<string,unknown>,用 as 适配
const tableData = computed<Record<string, unknown>[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return (result?.records ?? []) as unknown as Record<string, unknown>[]
})

// ─── 表格列定义 ───────────────────────────────────────────────────────────────
const columns: Column[] = [
  { prop: 'username', label: '登录名', width: 140 },
  { prop: 'name', label: '姓名', width: 120 },
  { prop: 'deleted', label: '状态', width: 90 },
  { prop: 'createTime', label: '创建时间', minWidth: 160 },
]

// ─── 角色 & 部门数据(供表单使用) ──────────────────────────────────────────────
const roleList = ref<SysRole[]>([])
const deptTree = ref<Tree<SysDepartment>[]>([])

onMounted(async () => {
  // 并行加载角色列表和部门树
  const [roleRes, deptRes] = await Promise.allSettled([
    rolePage({ current: 1, size: 9999 }),
    deptAll(),
  ])
  if (roleRes.status === 'fulfilled') roleList.value = roleRes.value?.records ?? []
  if (deptRes.status === 'fulfilled') {
    const records = deptRes.value?.records ?? []
    deptTree.value = buildTree(records)
  }
})

// ─── 弹窗状态 ─────────────────────────────────────────────────────────────────
const dialogVisible = ref(false)
const editingModel = ref<SysUserDTO | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}

function openEdit(row: SysUser) {
  editingModel.value = { ...row }
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
  search.usernameLike = ''
  search.nameLike = ''
  reset()
  run()
}

// ─── 提交(新增/编辑) ─────────────────────────────────────────────────────────
async function handleFormSubmit(dto: SysUserDTO) {
  submitLoading.value = true
  try {
    await userAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

// ─── 删除 ─────────────────────────────────────────────────────────────────────
async function handleDelete(row: SysUser) {
  await ElMessageBox.confirm(`确认删除用户「${row.name}」?`, '提示', {
    type: 'warning',
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
  })
  await userDelete(row.id)
  ElMessage.success('删除成功')
  run()
}
</script>

<style scoped>
.user-list {
  padding: var(--sp-4);
}
</style>
