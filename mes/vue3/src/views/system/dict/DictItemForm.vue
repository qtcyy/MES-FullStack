<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑字典项' : '新增字典项'"
    width="520px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="项名称" prop="dictName">
        <el-input v-model="form.dictName" placeholder="请输入字典项名称" clearable />
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
  /** 父级类型 id(新增时作为 parentId) */
  parentId: string
  /** 父级类型 type 标识(新增时带入 type) */
  parentType: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SysDict>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

// ─── 表单状态 ─────────────────────────────────────────────────────────────────
/**
 * 字段名使用业务别名规避 DOM 属性名冲突:
 *   dictName  → 后端字段 name
 *   dictValue → 后端字段 value
 *   (sortNum/descr 无 DOM 冲突,直接使用)
 * parentId / type 在提交时注入,不放在 form 中(避免冲突)
 */
const form = reactive({
  id: undefined as string | undefined,
  dictName: '',    // → name
  dictValue: '',   // → value
  sortNum: 0 as number | undefined,
  descr: '',
})

// ─── 监听 model 变化,同步表单 ─────────────────────────────────────────────────
watch(
  () => props.model,
  (val) => {
    if (val) {
      form.id        = val.id
      form.dictName  = val.name ?? ''
      form.dictValue = val.value ?? ''
      form.sortNum   = val.sortNum ?? 0
      form.descr     = val.descr ?? ''
    } else {
      form.id        = undefined
      form.dictName  = ''
      form.dictValue = ''
      form.sortNum   = 0
      form.descr     = ''
    }
  },
  { immediate: true },
)

// ─── 校验规则 ─────────────────────────────────────────────────────────────────
const rules: FormRules = {
  dictName: [{ required: true, message: '请输入字典项名称', trigger: 'blur' }],
}

// ─── 提交 ─────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  await formRef.value?.validate()
  // 映射回后端字段名;parentId/type 来自父组件 props
  const payload: Partial<SysDict> = {
    name:     form.dictName,
    value:    form.dictValue,
    parentId: props.parentId,
    type:     props.parentType,
    sortNum:  form.sortNum,
    descr:    form.descr,
  }
  if (form.id) payload.id = form.id
  emit('submit', payload)
}
</script>
