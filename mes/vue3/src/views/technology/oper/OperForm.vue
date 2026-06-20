<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑工序' : '新增工序'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item v-if="isEdit" label="工序编码">
            <el-input :model-value="form.operCode" disabled placeholder="保存后自动生成" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="加工单元" prop="processUnitId">
            <el-select v-model="form.processUnitId" placeholder="请选择加工单元" clearable style="width: 100%">
              <el-option v-for="u in (processUnits ?? [])" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="工序描述" prop="operDesc">
        <el-input v-model="form.operDesc" placeholder="请输入工序描述" clearable />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="工时(分)" prop="laborHours">
            <el-input-number v-model="form.laborHours" :min="0" :precision="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="制造周期(分)" prop="manufacturingCycle">
            <el-input-number v-model="form.manufacturingCycle" :min="0" :precision="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="生成计划">
            <el-switch v-model="form.generatePlan" active-value="1" inactive-value="0" />
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
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { operProcessUnits } from '@/api/technology/oper'
import { buildOperPayload, validateOper } from '@/utils/technology'
import type { SpOper } from '@/types/technology'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpOper> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpOper>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

// 加工单元下拉(全量,GET 端点)
const { data: processUnits } = useRequest(operProcessUnits, { immediate: true, initialData: [] })

const form = reactive<Partial<SpOper>>({
  id: undefined,
  operCode: undefined,
  operDesc: '',
  processUnitId: undefined,
  laborHours: 0,
  manufacturingCycle: 1,
  generatePlan: '1',
  remark: undefined,
})

function resetForm() {
  form.id = undefined
  form.operCode = undefined
  form.operDesc = ''
  form.processUnitId = undefined
  form.laborHours = 0
  form.manufacturingCycle = 1
  form.generatePlan = '1'
  form.remark = undefined
}

watch(
  () => props.model,
  (val) => {
    if (val) Object.assign(form, { laborHours: 0, manufacturingCycle: 1, generatePlan: '1', ...val })
    else resetForm()
  },
  { immediate: true },
)

const rules: FormRules = {
  operDesc: [{ required: true, message: '请输入工序描述', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  // 业务规则(制造周期>工时)前端先拦,后端二次校验
  const err = validateOper({ ...form })
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildOperPayload({ ...form }))
}
</script>
