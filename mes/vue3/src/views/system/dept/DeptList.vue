<template>
  <PageContainer>
    <!-- 树形表格 -->
    <TreeTable
      :data="deptTree"
      :loading="loading"
      :columns="columns"
    >
      <!-- 工具栏:新增按钮 -->
      <template #toolbar>
        <el-button v-permission="'dept:add'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <!-- 操作列 -->
      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as Tree<SysDepartment>)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as Tree<SysDepartment>)">删除</el-button>
        <el-button type="success" link size="small" @click="openCreateChild(row as Tree<SysDepartment>)">新增子项</el-button>
      </template>
    </TreeTable>

    <!-- 新增/编辑弹窗 -->
    <DeptForm
      v-model="dialogVisible"
      :model="editingModel"
      :flat-list="flatRecords"
      :dept-tree="deptTree"
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
import DeptForm from './DeptForm.vue'
import { useRequest } from '@/composables/useRequest'
import { deptAll, deptAddOrUpdate, deptDelete } from '@/api/system/dept'
import type { SysDepartment } from '@/types/system'
import { buildTree } from '@/utils/systemTree'
import type { Tree } from '@/utils/systemTree'

// ─── 全量拉取部门列表(客户端建树) ───────────────────────────────────────────────
const { data: pageData, loading, run } = useRequest(
  () => deptAll(),
  { immediate: true },
)

/** 扁平记录(供表单 collectSubtreeIds 排除自身后代) */
const flatRecords = computed<SysDepartment[]>(() => pageData.value?.records ?? [])

/** 树形数据(供 TreeTable 展示及表单树选) */
const deptTree = computed<Tree<SysDepartment>[]>(() => buildTree(flatRecords.value))

// ─── 表格列定义 ───────────────────────────────────────────────────────────────
const columns: Column[] = [
  { prop: 'name', label: '名称', minWidth: 200 },
  { prop: 'sortNum', label: '排序', width: 100 },
]

// ─── 弹窗状态 ─────────────────────────────────────────────────────────────────
const dialogVisible = ref(false)
const editingModel = ref<Partial<SysDepartment> | null>(null)
const submitLoading = ref(false)

/** 打开新增 */
function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}

/** 打开新增子项:预置 parentId = 当前行 id,不带 id(语义明确为新增,非编辑) */
function openCreateChild(row: Tree<SysDepartment>) {
  editingModel.value = {
    name: '',
    parentId: row.id,
    sortNum: 0,
  }
  dialogVisible.value = true
}

/** 打开编辑:部门字段简单,无需 deptGetById 补全,直接使用列表行数据 */
function openEdit(row: Tree<SysDepartment>) {
  // 从扁平 records 中找到原始对象(不含 children,避免表单混入树节点属性)
  const found = flatRecords.value.find((d) => d.id === row.id) as Partial<SysDepartment> | undefined
  if (!found) {
    ElMessage.warning('部门信息加载失败,请重试')
    return
  }
  editingModel.value = { ...found }
  dialogVisible.value = true
}

// ─── 提交(新增/编辑) ─────────────────────────────────────────────────────────
async function handleFormSubmit(payload: Partial<SysDepartment>) {
  submitLoading.value = true
  try {
    await deptAddOrUpdate(payload)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

// ─── 删除(软删) ───────────────────────────────────────────────────────────────
/**
 * 取消时 try/catch 静默处理(ElMessageBox.confirm 取消会 reject)
 * 删除后端软删,若有子部门业务层应有保护(与菜单同模式)
 * 第二个 try/catch 捕获后端拒绝,响应拦截器已 toast 错误,此处吞掉防未捕获 rejection
 */
async function handleDelete(row: Tree<SysDepartment>) {
  try {
    await ElMessageBox.confirm(`确认删除部门「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deptDelete(row.id)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示错误,此处吞掉防未捕获 rejection */ }
}
</script>
