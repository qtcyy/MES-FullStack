<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑设备' : '新增设备'"
    width="640px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="设备编码" prop="code">
            <el-input v-model="form.code" placeholder="如 DS11-1" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="设备名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入设备名称" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <!-- sp_device.type 无对应字典 type(DB 仅 material_type/ORDER_UNIT),按自由文本处理 -->
          <el-form-item label="类型" prop="type">
            <el-input v-model="form.type" placeholder="请输入设备类型" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="型号" prop="model">
            <el-input v-model="form.model" placeholder="请输入型号" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="规格" prop="specs">
            <el-input v-model="form.specs" placeholder="请输入规格" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="位置" prop="location">
            <el-input v-model="form.location" placeholder="请输入位置" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="状态" prop="status">
        <!-- sp_device.status 无对应字典 type,按自由文本处理 -->
        <el-input v-model="form.status" placeholder="请输入状态" clearable />
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
import { buildDevicePayload } from '@/utils/device'
import type { SpDevice } from '@/types/basedata'

// 沿用 MaterileForm 的 :model prop 回填约定。
// 注意:表单字段 form.model(设备型号)与 prop `model`(回填数据源)命名空间不同、无运行时冲突。
const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpDevice> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpDevice>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const form = reactive<Partial<SpDevice>>({
  id: undefined,
  code: '',
  name: '',
  type: undefined,
  model: undefined,
  specs: undefined,
  location: undefined,
  status: undefined,
  descr: undefined,
})

function resetForm() {
  form.id = undefined
  form.code = ''
  form.name = ''
  form.type = undefined
  form.model = undefined
  form.specs = undefined
  form.location = undefined
  form.status = undefined
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
  code: [{ required: true, message: '请输入设备编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildDevicePayload({ ...form }))
}
</script>
