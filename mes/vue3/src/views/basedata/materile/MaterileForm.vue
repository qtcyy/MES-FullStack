<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑物料' : '新增物料'"
    width="640px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="物料类型" prop="matType">
            <el-select v-model="form.matType" placeholder="请选择物料类型" clearable style="width: 100%">
              <el-option v-for="o in matTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item v-if="isEdit" label="物料编码">
            <el-input :model-value="form.materiel" disabled placeholder="保存后自动生成" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="物料描述" prop="materielDesc">
        <el-input v-model="form.materielDesc" placeholder="请输入物料描述" clearable />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="基本单位" prop="unit">
            <el-select v-model="form.unit" placeholder="请选择单位" clearable style="width: 100%">
              <el-option v-for="o in unitOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
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
          <el-form-item label="物料来源" prop="source">
            <!-- source 无对应字典 type(DB 仅 material_type/ORDER_UNIT),故按设计硬编码自制/外购,非遗漏 -->
            <el-select v-model="form.source" placeholder="请选择来源" clearable style="width: 100%">
              <el-option label="自制" value="自制" />
              <el-option label="外购" value="外购" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="规格" prop="size">
            <el-input v-model="form.size" placeholder="请输入规格" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="提前期(天)" prop="leadTime">
            <el-input-number v-model="form.leadTime" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="安全库存" prop="safetyStock">
            <el-input-number v-model="form.safetyStock" :min="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="产品组" prop="productGroup">
        <el-input v-model="form.productGroup" placeholder="请输入产品组" clearable />
      </el-form-item>

      <el-form-item label="物料图片">
        <ImageUpload v-model="form.imageUrl" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { useDict } from '@/composables/useDict'
import { buildMaterilePayload } from '@/utils/materile'
import type { SpMaterile } from '@/types/basedata'

// prop `model` 是「回填数据源」,沿用 1a 兄弟表单(UserForm/DeptForm)的 :model prop 约定。
// 注意它与表单字段 `form.model`(物料型号,对应 SpMaterile.model)命名空间不同、无运行时冲突。
const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpMaterile> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpMaterile>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

// 动态字典下拉(模块级缓存,列表页与表单共享同一请求)
const { options: matTypeOptions } = useDict('material_type')
const { options: unitOptions } = useDict('ORDER_UNIT')

const form = reactive<Partial<SpMaterile>>({
  id: undefined,
  materiel: undefined,
  materielDesc: '',
  unit: undefined,
  matType: undefined,
  model: undefined,
  source: undefined,
  size: undefined,
  leadTime: 1,
  safetyStock: 0,
  productGroup: undefined,
  imageUrl: '',
})

function resetForm() {
  form.id = undefined
  form.materiel = undefined
  form.materielDesc = ''
  form.unit = undefined
  form.matType = undefined
  form.model = undefined
  form.source = undefined
  form.size = undefined
  form.leadTime = 1
  form.safetyStock = 0
  form.productGroup = undefined
  form.imageUrl = ''
}

watch(
  () => props.model,
  (val) => {
    // 默认值兜底 + val 覆盖:先铺 leadTime/safetyStock/imageUrl 默认值,再用回填数据覆盖,
    // 保证编辑态缺失这些字段时回落到默认。
    if (val) Object.assign(form, { leadTime: 1, safetyStock: 0, imageUrl: '', ...val })
    else resetForm()
  },
  { immediate: true },
)

const rules: FormRules = {
  matType: [{ required: true, message: '请选择物料类型', trigger: 'change' }],
  materielDesc: [{ required: true, message: '请输入物料描述', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildMaterilePayload({ ...form }))
}
</script>
