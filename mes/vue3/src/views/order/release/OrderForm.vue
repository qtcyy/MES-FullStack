<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑工单' : '新增工单'"
    width="640px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="工单编号" prop="orderCode">
            <el-input v-model="form.orderCode" placeholder="请输入工单编号" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="工单类型" prop="orderType">
            <el-select v-model="form.orderType" placeholder="请选择" clearable style="width: 100%">
              <el-option label="量产 (P)" value="P" />
              <el-option label="验证 (A)" value="A" />
              <el-option label="返工 (F)" value="F" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="物料" prop="materiel">
            <el-select
              v-model="form.materiel"
              placeholder="请选择物料"
              clearable
              filterable
              style="width: 100%"
              @change="onMaterielChange"
            >
              <el-option
                v-for="m in materials"
                :key="m.id"
                :label="`${m.materiel ?? ''} ${m.materielDesc ?? ''}`"
                :value="m.materiel!"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="数量" prop="qty">
            <el-input-number
              v-model="form.qty"
              :min="1"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="物料描述">
        <el-input v-model="form.materielDesc" placeholder="选物料后自动带出，可改" clearable />
      </el-form-item>

      <el-form-item label="工艺路线">
        <el-select v-model="form.flowId" placeholder="请选择工艺路线" clearable filterable style="width: 100%">
          <el-option v-for="f in flows" :key="f.id" :label="`${f.flow} ${f.flowDesc ?? ''}`" :value="f.id" />
        </el-select>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="计划开始">
            <el-date-picker
              v-model="form.planStartTime"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="计划开始时间"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="计划结束">
            <el-date-picker
              v-model="form.planEndTime"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="计划结束时间"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="工单描述">
        <el-input v-model="form.orderDescription" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { materilePage } from '@/api/basedata/materile'
import { flowList } from '@/api/technology/flow'
import { buildOrderPayload, validateOrder } from '@/utils/order'
import type { SpOrder } from '@/types/order'
import type { SpMaterile } from '@/types/basedata'
import type { SpFlow } from '@/types/technology'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpOrder> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpOrder>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)
const form = reactive<Partial<SpOrder>>({})

// 物料下拉(全量取前 200 条,filterable 本地过滤)
const { data: matPage } = useRequest(() => materilePage({ current: 1, size: 200 }), { immediate: true })
const materials = computed<SpMaterile[]>(() => matPage.value?.records ?? [])

// 工艺路线下拉(全量 GET)
const { data: flowData } = useRequest(() => flowList(), { immediate: true, initialData: [] })
const flows = computed<SpFlow[]>(() => flowData.value ?? [])

watch(
  () => props.model,
  (m) => {
    Object.keys(form).forEach((k) => delete (form as Record<string, unknown>)[k])
    Object.assign(form, { qty: 1, ...(m ?? {}) })
  },
  { immediate: true },
)

const rules: FormRules = {
  orderCode: [{ required: true, message: '请输入工单编号', trigger: 'blur' }],
  orderType: [{ required: true, message: '请选择工单类型', trigger: 'change' }],
  materiel: [{ required: true, message: '请选择物料', trigger: 'change' }],
  qty: [{ required: true, message: '数量须为正整数', trigger: 'change' }],
}

function onMaterielChange(code: string) {
  const hit = materials.value.find((m) => m.materiel === code)
  if (hit) form.materielDesc = hit.materielDesc
}

async function handleSubmit() {
  await formRef.value?.validate()
  const err = validateOrder(form)
  if (err) { ElMessage.warning(err); return }
  emit('submit', buildOrderPayload(form))
}
</script>
