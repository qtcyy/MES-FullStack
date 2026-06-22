<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑流程表单' : '新增流程表单'"
    width="640px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
      <el-divider content-position="left">基本信息</el-divider>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="表单名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入表单名称" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="表单 key" prop="formKey">
            <el-input
              v-model="form.formKey"
              placeholder="字母开头,如 orderApprovalForm"
              clearable
              :disabled="isEdit"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="表单类型" prop="formType">
        <el-select v-model="form.formType" disabled style="width: 200px">
          <el-option label="URL 表单" value="URL" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">地址脚本</el-divider>
      <el-form-item label="标题脚本" prop="titleScript">
        <el-input v-model="form.titleScript" type="textarea" :rows="2" placeholder="如:生产订单审批 - ${orderCode}" />
      </el-form-item>
      <el-form-item label="PC 地址脚本" prop="pcUrlScript">
        <el-input v-model="form.pcUrlScript" type="textarea" :rows="2" placeholder="如:/order/detail?id=${businessId}" />
      </el-form-item>
      <el-form-item label="手机地址脚本" prop="mobileUrlScript">
        <el-input v-model="form.mobileUrlScript" type="textarea" :rows="2" placeholder="如:/mobile/order/detail?id=${businessId}" />
      </el-form-item>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="可用变量:${orderCode} / ${businessId} / ${businessType} / ${initiator} / ${processName}"
        style="margin-bottom: 16px"
      />

      <el-divider content-position="left">表单选项</el-divider>
      <el-form-item label="跳过相同处理人">
        <el-switch v-model="form.skipSameAssignee" />
        <span class="hint">连续节点处理人相同则自动跳过</span>
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { buildFormPayload } from '@/utils/workflow'
import type { WorkflowForm } from '@/types/workflow'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<WorkflowForm> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<WorkflowForm>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

function blankForm(): Partial<WorkflowForm> {
  return {
    id: undefined,
    name: '',
    formKey: '',
    formType: 'URL',
    titleScript: '',
    pcUrlScript: '',
    mobileUrlScript: '',
    skipSameAssignee: false,
  }
}

const form = reactive<Partial<WorkflowForm>>(blankForm())

watch(
  () => props.model,
  (val) => {
    Object.assign(form, blankForm(), val ?? {})
  },
  { immediate: true },
)

const rules: FormRules = {
  name: [{ required: true, message: '请输入表单名称', trigger: 'blur' }],
  formKey: [
    { required: true, message: '请输入表单 key', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      message: '表单 key 须字母开头(字母/数字/下划线)',
      trigger: 'blur',
    },
  ],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildFormPayload({ ...form }))
}
</script>

<style scoped>
.hint {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
