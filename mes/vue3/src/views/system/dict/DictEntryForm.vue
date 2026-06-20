<template>
  <FormDialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="520px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <!-- type 字段:新增类型时可编辑;选中类型下新增/编辑时预填+禁用 -->
      <el-form-item label="类型标识" prop="dictType">
        <el-input
          v-model="form.dictType"
          :disabled="typeDisabled"
          placeholder="如 material_type / ORDER_UNIT"
          clearable
        />
        <div v-if="typeDisabled" class="form-hint">类型标识由左侧选中类型决定,不可修改</div>
      </el-form-item>

      <el-form-item label="项名称" prop="dictName">
        <el-input v-model="form.dictName" placeholder="请输入名称" clearable />
      </el-form-item>

      <el-form-item label="数据值" prop="dictValue">
        <el-input v-model="form.dictValue" placeholder="请输入数据值" clearable />
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
import type { SysDict } from '@/types/system'

// ─── Props & Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;非空 = 编辑 */
  model: SysDict | null
  /**
   * mode:
   *   'new-type' — 新增类型(type 字段可编辑,用户输入新类型 + 第一条名称/值)
   *   'new-item' — 选中类型下新增项(type 预填+禁用)
   *   'edit'     — 编辑现有行(type 预填+禁用,从 model 读取)
   */
  mode: 'new-type' | 'new-item' | 'edit'
  /** 选中的类型标识(mode=new-item 时必传) */
  selectedType?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SysDict>]
}>()

const formRef = ref<FormInstance>()

// ─── 计算属性 ─────────────────────────────────────────────────────────────────

const isEdit = computed(() => props.mode === 'edit')
const typeDisabled = computed(() => props.mode !== 'new-type')

const dialogTitle = computed(() => {
  if (props.mode === 'new-type') return '新增字典类型'
  if (props.mode === 'new-item') return '新增字典项'
  return '编辑字典条目'
})

// ─── 表单状态 ─────────────────────────────────────────────────────────────────
/**
 * 字段名使用业务别名规避 DOM 属性名冲突:
 *   dictName  → 后端字段 name
 *   dictType  → 后端字段 type
 *   dictValue → 后端字段 value
 *   (sortNum/descr 无 DOM 冲突,直接使用)
 */
const form = reactive({
  id: undefined as string | undefined,
  dictType: '',    // → type
  dictName: '',    // → name
  dictValue: '',   // → value
  sortNum: 0 as number | undefined,
  descr: '',
})

// ─── 监听 props 变化,同步表单 ──────────────────────────────────────────────────
watch(
  [() => props.model, () => props.mode, () => props.selectedType],
  ([val, mode, selType]) => {
    if (mode === 'edit' && val) {
      // 编辑:从 model 读取所有字段
      form.id        = val.id
      form.dictType  = val.type ?? ''
      form.dictName  = val.name ?? ''
      form.dictValue = val.value ?? ''
      form.sortNum   = val.sortNum ?? 0
      form.descr     = val.descr ?? ''
    } else if (mode === 'new-item') {
      // 选中类型下新增项:type 预填为 selectedType
      form.id        = undefined
      form.dictType  = selType ?? ''
      form.dictName  = ''
      form.dictValue = ''
      form.sortNum   = 0
      form.descr     = ''
    } else {
      // new-type:全部清空,type 由用户输入
      form.id        = undefined
      form.dictType  = ''
      form.dictName  = ''
      form.dictValue = ''
      form.sortNum   = 0
      form.descr     = ''
    }
  },
  { immediate: true },
)

// ─── 校验规则 ─────────────────────────────────────────────────────────────────
const rules = computed<FormRules>(() => ({
  dictType: props.mode === 'new-type'
    ? [{ required: true, message: '请输入类型标识', trigger: 'blur' }]
    : [],
  dictName: [{ required: true, message: '请输入名称', trigger: 'blur' }],
}))

// ─── 提交 ─────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  await formRef.value?.validate()
  // 映射回后端字段名
  // parentId 设 '0'(非空安全值;分组按 type 不依赖它)
  const payload: Partial<SysDict> = {
    name:     form.dictName,
    type:     form.dictType,
    value:    form.dictValue,
    parentId: '0',
    sortNum:  form.sortNum,
    descr:    form.descr,
  }
  if (isEdit.value && form.id) payload.id = form.id
  emit('submit', payload)
}
</script>

<style scoped>
.form-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}
</style>
