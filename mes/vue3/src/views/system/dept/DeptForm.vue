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
  /** null = 纯新增;Partial<SysDepartment>(有 id) = 编辑;Partial<SysDepartment>(无 id) = 新增子项 */
  model: Partial<SysDepartment> | null
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
 * 将原始树节点统一映射为 el-tree-select 可用节点:
 * - deptName: 映射自 node.name,供 :props label='deptName' 使用
 * - disabled: 若节点 id 在 excludeSet 中则禁选(编辑时用于排除自身及后代)
 * - 新增时传空 Set,所有节点均可选
 */
type DeptTreeNode = Tree<SysDepartment> & { disabled: boolean; deptName: string; children?: DeptTreeNode[] }

function buildDeptTreeNodes(
  nodes: Tree<SysDepartment>[],
  excludeSet: Set<string> = new Set<string>(),
): DeptTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    deptName: node.name,
    disabled: excludeSet.has(node.id),
    children: node.children ? buildDeptTreeNodes(node.children, excludeSet) : undefined,
  }))
}

const filteredDeptTree = computed<DeptTreeNode[]>(() => {
  if (!form.id) {
    // 新增(含新增子项):无需排除,空 excludeSet
    return buildDeptTreeNodes(props.deptTree)
  }
  // 编辑:从扁平 records 中收集自身+后代 id,标记 disabled 防循环引用
  const excludeSet = collectSubtreeIds(props.flatList, form.id)
  return buildDeptTreeNodes(props.deptTree, excludeSet)
})

// ─── 监听 model 变化,同步表单 ─────────────────────────────────────────────────
/**
 * model 有三种情况:
 * - null        → 纯新增:重置所有字段
 * - { id }      → 编辑:填充全字段,isEdit = true
 * - { parentId }(无 id) → 新增子项:预填 parentId,id=undefined,isEdit = false
 */
watch(
  () => props.model,
  (val) => {
    if (val) {
      // 编辑 或 新增子项:按实际字段填充(id 可能为 undefined)
      form.id = val.id       // 编辑有值;新增子项为 undefined
      form.deptName = val.name ?? ''
      form.parentId = val.parentId && val.parentId !== '0' ? val.parentId : undefined
      form.sortNum = val.sortNum ?? 0
    } else {
      // 纯新增:完全重置
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
