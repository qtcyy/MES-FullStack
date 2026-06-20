<template>
  <FormDialog
    :model-value="modelValue"
    :title="currentFlowId ? '换绑工艺路线' : '绑定工艺路线'"
    width="520px"
    :loading="loading"
    @update:model-value="$emit('update:modelValue', $event)"
    @submit="onSubmit"
  >
    <el-form :model="form" label-width="96px">
      <el-form-item label="工艺路线" required>
        <el-select v-model="form.flowId" placeholder="请选择工艺路线" filterable style="width: 100%">
          <el-option
            v-for="f in flows"
            :key="f.id"
            :label="f.flowDesc ? `${f.flow} — ${f.flowDesc}` : f.flow"
            :value="f.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="可选:绑定原因/步骤说明" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import type { SpFlow } from '@/types/technology'

const props = defineProps<{
  modelValue: boolean
  flows: SpFlow[]
  currentFlowId?: string  // 换绑时预选
  loading?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [{ flowId: string; remark: string }]
}>()

const form = reactive<{ flowId: string; remark: string }>({ flowId: '', remark: '' })

// 每次打开:重置并按 currentFlowId 预选(换绑回填)
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.flowId = props.currentFlowId ?? ''
      form.remark = ''
    }
  },
)

function onSubmit() {
  if (!form.flowId) {
    ElMessage.warning('请选择工艺路线')
    return
  }
  emit('submit', { flowId: form.flowId, remark: form.remark })
}
</script>
