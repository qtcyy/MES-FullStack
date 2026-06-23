<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑零部件' : '新增零部件'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="零部件编码" prop="code">
        <el-input v-model="form.code" placeholder="请输入零部件编码" clearable />
      </el-form-item>

      <el-form-item label="零部件名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入零部件名称" clearable />
      </el-form-item>

      <el-form-item label="描述" prop="descr">
        <el-input v-model="form.descr" type="textarea" :rows="2" placeholder="请输入描述" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { buildComponentPayload } from '@/utils/device'
import type { SpComponent } from '@/types/basedata'

// 沿用 DeviceForm 的 :model prop 回填约定。
const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpComponent> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpComponent>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const form = reactive<Partial<SpComponent>>({
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
  code: [{ required: true, message: '请输入零部件编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入零部件名称', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildComponentPayload({ ...form }))
}
</script>
