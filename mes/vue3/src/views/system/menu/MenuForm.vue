<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑菜单' : '新增菜单'"
    width="600px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="菜单编码" prop="menuCode">
        <el-input v-model="form.menuCode" placeholder="请输入菜单编码(唯一标识)" clearable />
      </el-form-item>

      <el-form-item label="菜单名称" prop="menuName">
        <el-input v-model="form.menuName" placeholder="请输入菜单名称" clearable />
      </el-form-item>

      <el-form-item label="上级菜单" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          :data="filteredMenuTree"
          node-key="id"
          :props="{ label: 'name', children: 'children', disabled: 'disabled' }"
          check-strictly
          clearable
          placeholder="不选则为一级菜单"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="类型" prop="menuType">
        <el-select v-model="form.menuType" placeholder="请选择类型" style="width: 100%">
          <el-option label="目录" value="0" />
          <el-option label="菜单" value="1" />
          <el-option label="按钮" value="2" />
        </el-select>
      </el-form-item>

      <el-form-item label="菜单URL" prop="url">
        <el-input v-model="form.url" placeholder="请输入菜单URL(目录可留空)" clearable />
      </el-form-item>

      <el-form-item label="权限标识" prop="permission">
        <el-input v-model="form.permission" placeholder="如 menu:add" clearable />
      </el-form-item>

      <el-form-item label="图标" prop="icon">
        <el-input v-model="form.icon" placeholder="请输入图标名称" clearable />
      </el-form-item>

      <el-form-item label="排序" prop="sortNum">
        <el-input-number v-model="form.sortNum" :min="0" :max="9999" controls-position="right" style="width: 100%" />
      </el-form-item>

      <el-form-item label="描述" prop="descr">
        <el-input
          v-model="form.descr"
          type="textarea"
          :rows="2"
          placeholder="请输入描述(可选)"
        />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import type { SysMenu, TreeVO } from '@/types/menu'
import { collectSubtreeIds, type HasIdParent } from '@/utils/systemTree'

// ─── Props & Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;非空 = 编辑(需已通过 menuGetById 补全全字段) */
  model: SysMenu | null
  /** 当前菜单树(来自 menuTreeAdmin) */
  menuTree: TreeVO<SysMenu>[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SysMenu>]
}>()

const formRef = ref<FormInstance>()

const isEdit = computed(() => !!props.model?.id)

// ─── 表单状态 ─────────────────────────────────────────────────────────────────
/**
 * 字段名使用业务别名(menuCode/menuName/menuType)避免与 DOM 属性名冲突
 * 提交时映射回后端字段名(code/name/type)
 */
const form = reactive({
  id: undefined as string | undefined,
  menuCode: '',    // → code
  menuName: '',    // → name
  parentId: undefined as string | undefined,
  menuType: '0' as string,  // → type
  url: '',
  permission: '',
  icon: '',
  sortNum: 0 as number | undefined,
  descr: '',
})

// ─── 排除自身及后代的树选数据 ──────────────────────────────────────────────────
/**
 * 将 TreeVO 树拍平为 HasIdParent 扁平数组供 collectSubtreeIds 使用
 * 通过 DFS 参数传递父 id,不依赖 node.pid
 */
function flattenTreeVO(nodes: TreeVO<SysMenu>[]): HasIdParent[] {
  const result: HasIdParent[] = []
  function dfs(list: TreeVO<SysMenu>[], parentId: string) {
    for (const node of list) {
      result.push({ id: node.id, parentId: parentId })
      if (node.children?.length) dfs(node.children, node.id)
    }
  }
  dfs(nodes, '0')
  return result
}

/**
 * 为 el-tree-select 添加 disabled 字段:编辑时禁用自身及全部后代
 * 避免形成循环引用
 */
type MenuTreeNode = TreeVO<SysMenu> & { disabled?: boolean; children?: MenuTreeNode[] }

function markDisabled(nodes: TreeVO<SysMenu>[], excludeSet: Set<string>): MenuTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    disabled: excludeSet.has(node.id),
    children: node.children ? markDisabled(node.children, excludeSet) : undefined,
  }))
}

const filteredMenuTree = computed<MenuTreeNode[]>(() => {
  if (!form.id) return props.menuTree as MenuTreeNode[]
  const flat = flattenTreeVO(props.menuTree)
  const excludeSet = collectSubtreeIds(flat, form.id)
  return markDisabled(props.menuTree, excludeSet)
})

// ─── 监听 model 变化,同步表单 ─────────────────────────────────────────────────
watch(
  () => props.model,
  (val) => {
    if (val) {
      // 编辑:填充全字段(调用方已 menuGetById 补全)
      form.id = val.id
      form.menuCode = val.code ?? ''
      form.menuName = val.name ?? ''
      form.parentId = val.parentId && val.parentId !== '0' ? val.parentId : undefined
      form.menuType = val.type ?? '0'
      form.url = val.url ?? ''
      form.permission = val.permission ?? ''
      form.icon = val.icon ?? ''
      form.sortNum = val.sortNum ?? 0
      form.descr = val.descr ?? ''
    } else {
      // 新增:重置所有字段
      form.id = undefined
      form.menuCode = ''
      form.menuName = ''
      form.parentId = undefined
      form.menuType = '0'
      form.url = ''
      form.permission = ''
      form.icon = ''
      form.sortNum = 0
      form.descr = ''
    }
  },
  { immediate: true },
)

// ─── 校验规则 ─────────────────────────────────────────────────────────────────
const rules: FormRules = {
  menuCode: [{ required: true, message: '请输入菜单编码', trigger: 'blur' }],
  menuName: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
}

// ─── grade 计算 ───────────────────────────────────────────────────────────────
/**
 * 拍平 TreeVO 树为 { id, grade } 映射,供 grade 计算使用。
 * grade 来自节点的 _payload(原始 SysMenu),TreeVO 本身不保证携带 grade。
 */
function buildGradeMap(nodes: TreeVO<SysMenu>[]): Map<string, string> {
  const map = new Map<string, string>()
  function dfs(list: TreeVO<SysMenu>[]) {
    for (const node of list) {
      const g = (node as TreeVO<SysMenu> & { grade?: string }).grade
        ?? (node._payload as SysMenu | undefined)?.grade
      if (g) map.set(node.id, g)
      if (node.children?.length) dfs(node.children)
    }
  }
  dfs(nodes)
  return map
}

/**
 * 计算当前菜单的 grade:
 * - 顶级(parentId 为空/'0') → '1'
 * - 编辑时已有 grade → 沿用(不破坏既有值)
 * - 有上级 → 从 gradeMap 找父 grade + 1;找不到时兜底 '2'
 */
function computeGrade(gradeMap: Map<string, string>): string {
  // 编辑时沿用既有 grade
  if (form.id && props.model?.grade) return props.model.grade
  // 顶级菜单
  if (!form.parentId || form.parentId === '0') return '1'
  // 有父节点:父 grade + 1
  const parentGrade = gradeMap.get(form.parentId)
  if (parentGrade) return String(Number(parentGrade) + 1)
  // 找不到父 grade 时兜底
  return '2'
}

// ─── 提交 ─────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  await formRef.value?.validate()

  // 计算 grade(sp_sys_menu.grade 是 NOT NULL 无默认值,必须提供)
  const gradeMap = buildGradeMap(props.menuTree)
  const grade = computeGrade(gradeMap)

  // 映射回后端字段名
  const payload: Partial<SysMenu> = {
    code: form.menuCode,
    name: form.menuName,
    parentId: form.parentId ?? '0',
    type: form.menuType,
    url: form.url,
    permission: form.permission,
    icon: form.icon,
    sortNum: form.sortNum,
    descr: form.descr,
    grade,
  }
  if (form.id) payload.id = form.id
  emit('submit', payload)
}
</script>
