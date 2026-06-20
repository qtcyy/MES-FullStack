<template>
  <PageContainer>
    <!-- 树形表格 -->
    <TreeTable
      :data="menuTree"
      :loading="loading"
      :columns="columns"
    >
      <!-- 工具栏:新增按钮 -->
      <template #toolbar>
        <el-button v-permission="'menu:add'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <!-- 类型列:徽标渲染 -->
      <template #col-type="{ row }">
        <el-tag v-if="row.type === '0'" type="info">目录</el-tag>
        <el-tag v-else-if="row.type === '1'" type="success">菜单</el-tag>
        <el-tag v-else-if="row.type === '2'" type="warning">按钮</el-tag>
        <el-tag v-else type="info">未知</el-tag>
      </template>

      <!-- 操作列 -->
      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as TreeVO<SysMenu>)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as TreeVO<SysMenu>)">删除</el-button>
        <el-button type="success" link size="small" @click="openCreateChild(row as TreeVO<SysMenu>)">新增子项</el-button>
      </template>
    </TreeTable>

    <!-- 新增/编辑弹窗 -->
    <MenuForm
      v-model="dialogVisible"
      :model="editingModel"
      :menu-tree="menuTreeData"
      :loading="submitLoading"
      @submit="handleFormSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import TreeTable from '@/components/TreeTable.vue'
import type { Column } from '@/components/TreeTable.vue'
import MenuForm from './MenuForm.vue'
import { useRequest } from '@/composables/useRequest'
import { menuTreeAdmin, menuGetById, menuAddOrUpdate, menuDelete } from '@/api/system/menu'
import type { SysMenu, TreeVO } from '@/types/menu'

// ─── 菜单树请求(immediate,不分页) ────────────────────────────────────────────
const { data: treeData, loading, run } = useRequest(
  () => menuTreeAdmin(),
  { immediate: true },
)

/** 树形数据(供 TreeTable 展示) */
const menuTree = computed<TreeVO<SysMenu>[]>(() => treeData.value ?? [])

/**
 * 保存当前菜单树数据供表单 el-tree-select 使用
 * 利用同一个请求返回值,无需额外拉取
 */
const menuTreeData = computed<TreeVO<SysMenu>[]>(() => treeData.value ?? [])

// ─── 表格列定义 ───────────────────────────────────────────────────────────────
const columns: Column[] = [
  { prop: 'name', label: '名称', minWidth: 180 },
  { prop: 'type', label: '类型', width: 90 },
  { prop: 'permission', label: '权限标识', minWidth: 160 },
  { prop: 'url', label: 'URL', minWidth: 180 },
  { prop: 'sortNum', label: '排序', width: 80 },
]

// ─── 弹窗状态 ─────────────────────────────────────────────────────────────────
const dialogVisible = ref(false)
const editingModel = ref<SysMenu | null>(null)
const submitLoading = ref(false)

/** 打开新增 */
function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}

/** 打开新增子项:预置 parentId = 当前行 id */
function openCreateChild(row: TreeVO<SysMenu>) {
  // 构造一个空菜单,只带 parentId 预填
  editingModel.value = {
    id: '',
    code: '',
    name: '',
    url: '',
    parentId: row.id,
    type: '0',
    permission: '',
    icon: '',
  }
  // 清除 id 使表单进入新增模式
  editingModel.value.id = ''
  dialogVisible.value = true
}

/**
 * 打开编辑:先 menuGetById 补全全字段(树投影可能缺 sortNum/grade/descr)
 * TreeVO.pid 是父节点 id,SysMenu.parentId 同字段
 */
async function openEdit(row: TreeVO<SysMenu>) {
  try {
    const fullMenu = await menuGetById(row.id)
    editingModel.value = fullMenu
  } catch {
    ElMessage.warning('菜单信息加载失败,请重试')
    return
  }
  dialogVisible.value = true
}

// ─── 提交(新增/编辑) ─────────────────────────────────────────────────────────
async function handleFormSubmit(payload: Partial<SysMenu>) {
  submitLoading.value = true
  try {
    await menuAddOrUpdate(payload)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

// ─── 删除 ─────────────────────────────────────────────────────────────────────
/**
 * 删除菜单:后端有子菜单会抛错,响应拦截器已 ElMessage.error 展示"请先删除子菜单"
 * 前端无需额外判断,try/catch 仅用于"取消"静默处理
 */
async function handleDelete(row: TreeVO<SysMenu>) {
  try {
    await ElMessageBox.confirm(`确认删除菜单「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await menuDelete(row.id)
  ElMessage.success('删除成功')
  run()
}

// ─── 挂载时菜单树已由 useRequest immediate 拉取,无需额外 onMounted ──────────
</script>
