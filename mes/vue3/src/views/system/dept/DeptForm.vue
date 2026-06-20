<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑部门' : '新增部门'"
    width="520px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="部门名称" prop="deptName">
        <el-input v-model="form.deptName" placeholder="请输入部门名称" clearable />
      </el-form-item>

      <el-form-item label="上级部门" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          :data="filteredDeptTree"
          node-key="id"
          :props="{ label: 'deptName', children: 'children', disabled: 'disabled' }"
          check-strictly
          clearable
          placeholder="不选则为顶级部门"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="排序" prop="sortNum">
        <el-input-number
          v-model="form.sortNum"
          :min="0"
          :max="9999"
          controls-position="right"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import type { SysDepartment } from '@/types/system'
import { collectSubtreeIds } from '@/utils/systemTree'
import type { Tree } from '@/utils/systemTree'

// ─── Props & Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;非空 = 编辑 */
  model: SysDepartment | null
  /** 扁平部门列表(用于 collectSubtreeIds 排除自身及后代) */
  flatList: SysDepartment[]
  /** 部门树(已 buildTree,供 el-tree-select 展示) */
  deptTree: Tree<SysDepartment>[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SysDepartment>]
}>()

const formRef = ref<FormInstance>()

const isEdit = computed(() => !!props.model?.id)

// ─── 表单状态 ─────────────────────────────────────────────────────────────────
/**
 * 使用 deptName 避免与 DOM 属性 name 发生字段名冲突(RHF 同类坑)
 * 提交时映射回 name
 */
const form = reactive({
  id: undefined as string | undefined,
  deptName: '',     // → name
  parentId: undefined as string | undefined,
  sortNum: 0 as number | undefined,
})

// ─── 排除自身及后代的树选数据 ──────────────────────────────────────────────────
/**
 * 为 el-tree-select 节点标记 disabled:编辑时禁用自身及全部后代,防止循环引用
 * 新增时无需排除,直接返回原始树
 */
type DeptTreeNode = Tree<SysDepartment> & { disabled?: boolean; deptName: string; children?: DeptTreeNode[] }

function markDisabled(
  nodes: Tree<SysDepartment>[],
  excludeSet: Set<string>,
): DeptTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    deptName: node.name,   // el-tree-select :props label='deptName',故在此映射
    disabled: excludeSet.has(node.id),
    children: node.children ? markDisabled(node.children, excludeSet) : undefined,
  }))
}

const filteredDeptTree = computed<DeptTreeNode[]>(() => {
  // 将 name 映射为 deptName 供 tree-select label 使用
  function addLabel(nodes: Tree<SysDepartment>[]): DeptTreeNode[] {
    return nodes.map((node) => ({
      ...node,
      deptName: node.name,
      children: node.children ? addLabel(node.children) : undefined,
    }))
  }

  if (!form.id) return addLabel(props.deptTree)

  // 编辑:从扁平 records 中收集自身+后代 id,标记 disabled
  const excludeSet = collectSubtreeIds(props.flatList, form.id)
  return markDisabled(props.deptTree, excludeSet)
})

// ─── 监听 model 变化,同步表单 ─────────────────────────────────────────────────
watch(
  () => props.model,
  (val) => {
    if (val) {
      // 编辑:填充字段
      form.id = val.id
      form.deptName = val.name ?? ''
      form.parentId = val.parentId && val.parentId !== '0' ? val.parentId : undefined
      form.sortNum = val.sortNum ?? 0
    } else {
      // 新增:重置
      form.id = undefined
      form.deptName = ''
      form.parentId = undefined
      form.sortNum = 0
    }
  },
  { immediate: true },
)

// ─── 校验规则 ─────────────────────────────────────────────────────────────────
const rules: FormRules = {
  deptName: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
}

// ─── 提交 ─────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  await formRef.value?.validate()
  const payload: Partial<SysDepartment> = {
    name: form.deptName,
    parentId: form.parentId ?? '0',
    sortNum: form.sortNum,
  }
  if (form.id) payload.id = form.id
  emit('submit', payload)
}
</script>
