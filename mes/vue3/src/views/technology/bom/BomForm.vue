<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑工艺 BOM' : '新增工艺 BOM'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="BOM 编号" prop="bomCode">
            <el-input v-model="form.bomCode" placeholder="请输入 BOM 编号" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="版本号" prop="versionNumber">
            <el-input v-model="form.versionNumber" placeholder="如 1" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="物料编号" prop="materielCode">
            <el-input v-model="form.materielCode" placeholder="请输入物料编号" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="物料名称" prop="materielDesc">
            <el-input v-model="form.materielDesc" placeholder="请输入物料名称" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="所属工厂" prop="factory">
            <el-input v-model="form.factory" placeholder="选填" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="deleted">
            <el-select v-model="form.deleted" placeholder="请选择状态" style="width: 100%">
              <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { type FormInstance, type FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { BOM_STATUS_OPTIONS as STATUS_OPTIONS } from '@/utils/technology'
import type { SpBom } from '@/types/technology'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpBom> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpBom>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const DEFAULTS: Partial<SpBom> = {
  id: undefined,
  bomCode: '',
  materielCode: '',
  materielDesc: '',
  versionNumber: '1',
  factory: undefined,
  deleted: '0',
  remark: undefined,
}

const form = reactive<Partial<SpBom>>({ ...DEFAULTS })

function resetForm() {
  Object.assign(form, DEFAULTS)
}

watch(
  () => props.model,
  (val) => {
    if (val) Object.assign(form, { ...DEFAULTS, ...val })
    else resetForm()
  },
  { immediate: true },
)

const rules: FormRules = {
  bomCode: [{ required: true, message: '请输入 BOM 编号', trigger: 'blur' }],
  materielCode: [{ required: true, message: '请输入物料编号', trigger: 'blur' }],
  materielDesc: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
  versionNumber: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', { ...form })
}
</script>
