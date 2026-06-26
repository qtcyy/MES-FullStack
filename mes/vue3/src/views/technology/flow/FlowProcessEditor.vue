<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑工艺路线' : '新增工艺路线'"
    width="820px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="流程代码" prop="flow">
            <el-input v-model="form.flow" placeholder="请输入流程代码" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="流程描述" prop="flowDesc">
            <el-input v-model="form.flowDesc" placeholder="请输入流程描述" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="工序编排" prop="opers">
        <OrderedTransfer v-model="orderedOpers" :candidates="candidates" v-loading="poolLoading" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import OrderedTransfer from '@/components/OrderedTransfer.vue'
import { operList } from '@/api/technology/oper'
import { flowOpers } from '@/api/technology/flow'
import { operToTransferItem, buildFlowPayload, validateFlow } from '@/utils/technology'
import type { SpFlow, TransferItem, SpFlowDtoReq } from '@/types/technology'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;SpFlow = 编辑 */
  model: SpFlow | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [SpFlowDtoReq]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const form = reactive<{ flow: string; flowDesc: string }>({ flow: '', flowDesc: '' })
const orderedOpers = ref<TransferItem[]>([])
const candidates = ref<TransferItem[]>([])
const poolLoading = ref(false)

// 打开弹窗:取候选池;编辑态再取有序工序链回填
watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    form.flow = props.model?.flow ?? ''
    form.flowDesc = props.model?.flowDesc ?? ''
    orderedOpers.value = []
    poolLoading.value = true
    try {
      const pool = await operList()
      candidates.value = pool.map(operToTransferItem)
      if (props.model?.id) {
        const chain = await flowOpers(props.model.id)
        const byId = new Map(candidates.value.map((c) => [c.id, c]))
        // 回填有序链:用候选池补 primary(描述);候选缺失时用 vo.title 兜底
        orderedOpers.value = chain.map(
          (vo) => byId.get(vo.value) ?? { id: vo.value, primary: vo.title, secondary: vo.title },
        )
      }
    } finally {
      poolLoading.value = false
    }
  },
)

const rules: FormRules = {
  flow: [{ required: true, message: '请输入流程代码', trigger: 'blur' }],
  flowDesc: [{ required: true, message: '请输入流程描述', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  const err = validateFlow(form, orderedOpers.value)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildFlowPayload({ id: props.model?.id, ...form }, orderedOpers.value))
}
</script>
