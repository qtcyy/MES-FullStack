<template>
  <el-drawer :model-value="modelValue" title="订单审批" size="560px"
    @update:model-value="(v) => emit('update:modelValue', v)">
    <div v-if="task" class="approval">
      <el-steps :active="1" finish-status="success" align-center style="margin-bottom:24px">
        <el-step title="开始" />
        <el-step title="审批" />
        <el-step title="结束" />
      </el-steps>

      <el-descriptions :column="1" border title="订单信息">
        <el-descriptions-item label="任务">{{ task.taskName }}</el-descriptions-item>
        <el-descriptions-item label="订单编号">{{ order?.orderCode }}</el-descriptions-item>
        <el-descriptions-item label="订单类型">{{ order?.orderSource === 'DEMAND' ? '需求订单' : '预测订单' }}</el-descriptions-item>
        <el-descriptions-item label="产品BOM">{{ order?.bomCode }} / {{ order?.materielDesc }}（{{ order?.bomVersion }}）</el-descriptions-item>
        <el-descriptions-item label="需求数量">{{ order?.qty }}</el-descriptions-item>
        <el-descriptions-item label="计划交付">{{ order?.planEndTime || order?.planStartTime }}</el-descriptions-item>
        <el-descriptions-item label="任务状态">
          <el-tag :type="task.status === 'PENDING' ? 'warning' : 'primary'">
            {{ task.status === 'PENDING' ? '待签收' : '已签收' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-form style="margin-top:16px">
        <el-form-item label="审批意见">
          <el-input v-model="comment" type="textarea" :rows="3" placeholder="选填" />
        </el-form-item>
      </el-form>

      <el-timeline v-if="events.length" style="margin-top:8px">
        <el-timeline-item v-for="ev in events" :key="ev.id" :timestamp="ev.eventTime" placement="top">
          {{ ev.message }}
        </el-timeline-item>
      </el-timeline>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button v-if="task?.status === 'PENDING'" type="primary" :loading="busy" @click="onClaim">签收</el-button>
      <el-button v-if="task?.status === 'CLAIMED'" type="danger" :loading="busy" @click="onReject">驳回</el-button>
      <el-button v-if="task?.status === 'CLAIMED'" type="primary" :loading="busy" @click="onComplete">提交</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { taskClaim, taskComplete, taskReject, taskHistory } from '@/api/workflow/task'
import { productionOrderGetById } from '@/api/plan/order-entry'
import type { WorkflowTask, WorkflowEvent, ProductionOrder } from '@/types/plan'

const props = defineProps<{ modelValue: boolean; task: WorkflowTask | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; done: [] }>()

const order = ref<ProductionOrder | null>(null)
const events = ref<WorkflowEvent[]>([])
const comment = ref('')
const busy = ref(false)

watch(
  () => props.modelValue,
  async (open) => {
    if (open && props.task) {
      comment.value = ''
      order.value = await productionOrderGetById(props.task.businessId).catch(() => null)
      events.value = await taskHistory(props.task.instanceId).catch(() => [])
    }
  },
)

async function onClaim() {
  if (!props.task) return
  busy.value = true
  try { await taskClaim(props.task.id); ElMessage.success('签收成功'); emit('update:modelValue', false); emit('done') }
  finally { busy.value = false }
}
async function onComplete() {
  if (!props.task) return
  busy.value = true
  try { await taskComplete(props.task.id, comment.value); ElMessage.success('审批通过,订单转待运算'); emit('update:modelValue', false); emit('done') }
  finally { busy.value = false }
}
async function onReject() {
  if (!props.task) return
  busy.value = true
  try { await taskReject(props.task.id, comment.value); ElMessage.success('已驳回'); emit('update:modelValue', false); emit('done') }
  finally { busy.value = false }
}
</script>
