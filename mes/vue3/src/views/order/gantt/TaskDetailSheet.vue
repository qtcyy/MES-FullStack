<template>
  <el-drawer :model-value="modelValue" :title="task?.orderCode ?? '任务详情'" size="420px" @update:model-value="(v) => emit('update:modelValue', v)">
    <template v-if="task">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="物料">{{ task.materielDesc || task.materiel || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ task.qty ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="工序">{{ task.operName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="班组">{{ task.teamName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="作业员">{{ task.userName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="计划">{{ task.planStartTime || '?' }} ~ {{ task.planEndTime || '?' }}</el-descriptions-item>
        <el-descriptions-item label="实际">{{ task.actualStartTime || '?' }} ~ {{ task.actualEndTime || '进行中' }}</el-descriptions-item>
      </el-descriptions>

      <div class="sheet-progress">
        <span>进度</span>
        <el-progress :percentage="task.progress ?? 0" :status="task.dispatchStatus === 3 ? 'success' : undefined" />
      </div>

      <!-- status=1 已派工：记录开工 -->
      <el-card v-if="task.dispatchStatus === 1" shadow="never" class="sheet-card">
        <div class="sheet-card__title">记录开工</div>
        <el-date-picker v-model="actStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="留空取当前时间" style="width: 100%" />
        <el-button type="primary" :loading="busy" style="margin-top: 8px" @click="emit('start', task.id, actStart)">确认开工</el-button>
      </el-card>

      <!-- status=2 已开工：完工 + 进度 -->
      <template v-if="task.dispatchStatus === 2">
        <el-card shadow="never" class="sheet-card">
          <div class="sheet-card__title">更新进度</div>
          <el-input-number v-model="prog" :min="0" :max="100" controls-position="right" style="width: 100%" />
          <el-button type="primary" :loading="busy" style="margin-top: 8px" @click="emit('progress', task.id, prog)">保存进度</el-button>
        </el-card>
        <el-card shadow="never" class="sheet-card">
          <div class="sheet-card__title">记录完工</div>
          <el-date-picker v-model="actEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="留空取当前时间" style="width: 100%" />
          <el-button type="success" :loading="busy" style="margin-top: 8px" @click="emit('finish', task.id, actEnd)">确认完工</el-button>
        </el-card>
      </template>

      <!-- status>=2：纠时 -->
      <el-card v-if="task.dispatchStatus >= 2" shadow="never" class="sheet-card">
        <div class="sheet-card__title">纠正实际时间</div>
        <el-date-picker v-model="actStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="实际开始" style="width: 100%; margin-bottom: 8px" />
        <el-date-picker v-model="actEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="实际结束" style="width: 100%" />
        <el-button :loading="busy" style="margin-top: 8px" @click="emit('adjust', task.id, actStart, actEnd)">保存纠时</el-button>
      </el-card>

      <el-alert v-if="task.dispatchStatus === 3" type="success" :closable="false" title="任务已完工，仅可纠正实际时间" style="margin-top: 12px" />
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { GanttTask } from '@/types/order'

const props = defineProps<{ modelValue: boolean; task: GanttTask | null; busy?: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  start: [string, string]
  finish: [string, string]
  progress: [string, number]
  adjust: [string, string, string]
}>()

const actStart = ref('')
const actEnd = ref('')
const prog = ref(0)

watch(
  () => props.task,
  (t) => {
    actStart.value = t?.actualStartTime ?? ''
    actEnd.value = t?.actualEndTime ?? ''
    prog.value = t?.progress ?? 0
  },
  { immediate: true },
)
</script>

<style scoped>
.sheet-progress { margin: 16px 0; display: flex; flex-direction: column; gap: 6px; }
.sheet-card { margin-top: 12px; }
.sheet-card__title { font-weight: 600; margin-bottom: 8px; }
</style>
