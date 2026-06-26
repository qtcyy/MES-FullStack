<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑编组' : '新增编组'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
      <el-form-item label="编组编码" prop="code">
        <el-input v-model="form.code" placeholder="如 G01" clearable />
      </el-form-item>
      <el-form-item label="编组名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入编组名称" clearable />
      </el-form-item>
      <el-form-item label="描述" prop="descr">
        <el-input v-model="form.descr" type="textarea" :rows="3" placeholder="请输入描述" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { buildGroupPayload } from '@/utils/device'
import type { SpDeviceGroup } from '@/types/basedata'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpDeviceGroup> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpDeviceGroup>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const form = reactive<Partial<SpDeviceGroup>>({
  id: undefined,
  code: '',
  name: '',
  descr: undefined,
})

function resetForm() {
  form.id = undefined
  form.code = ''
  form.name = ''
  form.descr = undefined
}

watch(
  () => props.model,
  (val) => {
    if (val) Object.assign(form, { ...val })
    else resetForm()
  },
  { immediate: true },
)

const rules: FormRules = {
  code: [{ required: true, message: '请输入编组编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入编组名称', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildGroupPayload({ ...form }))
}
</script>
