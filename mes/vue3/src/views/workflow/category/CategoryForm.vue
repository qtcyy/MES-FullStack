<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑流程分类' : '新增流程分类'"
    width="520px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-form-item label="分类编码" prop="code">
        <el-input
          v-model="form.code"
          placeholder="字母/数字/下划线,如 ORDER_APPROVAL"
          clearable
          :disabled="isEdit"
        />
      </el-form-item>
      <el-form-item label="分类名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入分类名称" clearable />
      </el-form-item>
      <el-form-item label="备注" prop="descr">
        <el-input v-model="form.descr" type="textarea" :rows="3" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { buildCategoryPayload } from '@/utils/workflow'
import type { WorkflowCategory } from '@/types/workflow'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<WorkflowCategory> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<WorkflowCategory>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const form = reactive<Partial<WorkflowCategory>>({ id: undefined, code: '', name: '', descr: '' })

function resetForm() {
  form.id = undefined
  form.code = ''
  form.name = ''
  form.descr = ''
}

watch(
  () => props.model,
  (val) => {
    if (val) Object.assign(form, { descr: '', ...val })
    else resetForm()
  },
  { immediate: true },
)

const rules: FormRules = {
  code: [
    { required: true, message: '请输入分类编码', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]+$/, message: '编码须为字母/数字/下划线', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildCategoryPayload({ ...form }))
}
</script>
