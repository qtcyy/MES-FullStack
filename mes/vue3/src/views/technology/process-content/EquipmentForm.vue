<template>
  <FormDialog
    :model-value="modelValue"
    :title="form.id ? '编辑设备' : '新增设备'"
    width="460px"
    :loading="loading"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @submit="onSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="设备名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入设备名称" clearable />
      </el-form-item>
      <el-form-item label="数量" prop="quantity">
        <el-input-number v-model="form.quantity" :min="1" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import type { SpProcessEquipment } from '@/types/technology'

// 受控弹窗,沿用 DeviceForm 的 :model 回填约定。
const props = defineProps<{
  modelValue: boolean
  /** null = 新增;有 id = 编辑 */
  model: SpProcessEquipment | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [{ id?: string; name: string; quantity?: number; remark?: string }]
}>()

const formRef = ref<FormInstance>()

const form = reactive<{ id?: string; name: string; quantity: number; remark: string }>({
  id: undefined,
  name: '',
  quantity: 1,
  remark: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
}

watch(
  () => props.model,
  (val) => {
    form.id = val?.id
    form.name = val?.name ?? ''
    form.quantity = val?.quantity ?? 1
    form.remark = val?.remark ?? ''
  },
  { immediate: true },
)

async function onSubmit() {
  await formRef.value?.validate()
  emit('submit', {
    id: form.id,
    name: form.name,
    quantity: form.quantity,
    remark: form.remark,
  })
}
</script>
