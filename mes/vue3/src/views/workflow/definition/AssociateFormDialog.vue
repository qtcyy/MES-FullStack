<template>
  <FormDialog
    :model-value="modelValue"
    title="关联流程表单"
    width="480px"
    :loading="submitLoading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form label-width="92px">
      <el-form-item label="流程">
        <span>{{ definition?.processName }}</span>
      </el-form-item>
      <el-form-item label="关联表单">
        <el-select v-model="selected" :loading="loading" style="width: 100%">
          <el-option label="未关联" :value="NONE" />
          <el-option
            v-for="f in forms"
            :key="f.formKey"
            :label="`${f.name} (${f.formKey})`"
            :value="f.formKey"
          />
        </el-select>
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { formList } from '@/api/workflow/form'
import { definitionSetForm } from '@/api/workflow/definition'
import type { WorkflowForm, WorkflowDefinition } from '@/types/workflow'

const NONE = '__none__'

const props = defineProps<{
  modelValue: boolean
  definition: WorkflowDefinition | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: []
}>()

const forms = ref<WorkflowForm[]>([])
const loading = ref(false)
const submitLoading = ref(false)
const selected = ref<string>(NONE)

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    selected.value = props.definition?.formKey || NONE
    loading.value = true
    try {
      forms.value = await formList()
    } finally {
      loading.value = false
    }
  },
)

async function handleSubmit() {
  if (!props.definition) return
  submitLoading.value = true
  try {
    const formKey = selected.value === NONE ? null : selected.value
    await definitionSetForm(props.definition.id, formKey)
    ElMessage.success('保存成功')
    emit('update:modelValue', false)
    emit('saved')
  } finally {
    submitLoading.value = false
  }
}
</script>
