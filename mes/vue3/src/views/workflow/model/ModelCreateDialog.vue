<template>
  <FormDialog
    :model-value="modelValue"
    title="创建流程模型"
    width="520px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-form-item label="模型名称" prop="name">
        <el-input v-model="form.name" placeholder="如 生产订单审批流程" clearable />
      </el-form-item>
      <el-form-item label="模型 key" prop="modelKey">
        <el-input v-model="form.modelKey" placeholder="如 orderRecord(字母开头)" clearable />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { modelSave } from '@/api/workflow/model'
import { initialBpmnXml } from '@/utils/bpmn'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; created: [string] }>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ name: '', modelKey: '' })

const rules: FormRules = {
  name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  modelKey: [
    { required: true, message: '请输入模型 key', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      message: '以字母开头,仅含字母/数字/下划线',
      trigger: 'blur',
    },
  ],
}

// 打开时重置
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.name = ''
      form.modelKey = ''
    }
  },
)

async function handleSubmit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    const id = await modelSave({
      name: form.name,
      modelKey: form.modelKey,
      bpmnXml: initialBpmnXml(form.modelKey, form.name),
    })
    ElMessage.success('已创建模型')
    emit('update:modelValue', false)
    emit('created', id)
  } catch {
    /* 拦截器已提示 */
  } finally {
    loading.value = false
  }
}
</script>
