<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑加工单元' : '新增加工单元'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="单元代码" prop="code">
            <el-input v-model="form.code" placeholder="如 PU-01" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="单元名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入单元名称" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="单元类型" prop="type">
        <!-- sp_process_unit.type 无对应字典,按自由文本处理 -->
        <el-input v-model="form.type" placeholder="如 人员作业单元 / 设备作业单元" clearable />
      </el-form-item>

      <el-form-item label="是否有线边库" prop="hasLineWarehouse">
        <el-switch v-model="form.hasLineWarehouse" active-value="1" inactive-value="0" />
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
import { buildProcessUnitPayload } from '@/utils/processUnit'
import type { SpProcessUnit } from '@/types/processUnit'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpProcessUnit> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpProcessUnit>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const form = reactive<Partial<SpProcessUnit>>({
  id: undefined,
  code: '',
  name: '',
  type: undefined,
  hasLineWarehouse: '0',
  descr: undefined,
})

function resetForm() {
  form.id = undefined
  form.code = ''
  form.name = ''
  form.type = undefined
  form.hasLineWarehouse = '0'
  form.descr = undefined
}

watch(
  () => props.model,
  (val) => {
    if (val) Object.assign(form, { hasLineWarehouse: '0', ...val })
    else resetForm()
  },
  { immediate: true },
)

const rules: FormRules = {
  code: [{ required: true, message: '请输入单元代码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入单元名称', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildProcessUnitPayload({ ...form }))
}
</script>
