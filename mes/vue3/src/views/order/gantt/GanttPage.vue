<template>
  <PageContainer>
    <div class="gantt-toolbar">
      <el-input v-model="filters.orderCode" placeholder="工单编号" clearable style="width: 180px" @keyup.enter="reload" />
      <el-select v-model="filters.teamId" placeholder="全部班组" clearable style="width: 180px">
        <el-option v-for="t in teams" :key="t.id" :label="t.name" :value="t.id" />
      </el-select>
      <el-button type="primary" @click="reload">查询</el-button>
      <el-radio-group v-model="view" style="margin-left: auto">
        <el-radio-button value="resource">资源视角</el-radio-button>
        <el-radio-button value="order">订单视角</el-radio-button>
      </el-radio-group>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-empty v-else-if="!filtered.length" description="暂无甘特任务" />
    <GanttChart
      v-else
      :groups="groups"
      :tasks="filtered"
      :now-ms="nowMs"
      @task-click="onTaskClick"
      @reschedule="onReschedule"
    />

    <TaskDetailSheet
      v-model="sheetVisible"
      :task="activeTask"
      :busy="busy"
      @start="onStart"
      @finish="onFinish"
      @progress="onProgress"
      @adjust="onAdjust"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import GanttChart from './GanttChart.vue'
import TaskDetailSheet from './TaskDetailSheet.vue'
import { useRequest } from '@/composables/useRequest'
import { ganttTasks, ganttReschedule, ganttStart, ganttFinish, ganttProgress, ganttActual } from '@/api/order/gantt'
import { dispatchTeams } from '@/api/order/dispatch'
import { groupByResource, groupByOrder } from '@/utils/gantt'
import type { GanttTask, SpTeamOption } from '@/types/order'

const nowMs = Date.now()
const view = ref<'resource' | 'order'>('resource')
const filters = reactive({ orderCode: '', teamId: '' })

const { data: taskData, loading, run } = useRequest(() => ganttTasks(), { immediate: true })
const allTasks = computed<GanttTask[]>(() => taskData.value ?? [])

const teams = ref<SpTeamOption[]>([])
dispatchTeams().then((t) => (teams.value = t)).catch(() => {})

const filtered = computed(() =>
  allTasks.value.filter(
    (t) =>
      (!filters.orderCode || (t.orderCode ?? '').includes(filters.orderCode)) &&
      (!filters.teamId || t.teamId === filters.teamId),
  ),
)
const groups = computed(() => (view.value === 'resource' ? groupByResource(filtered.value) : groupByOrder(filtered.value)))

function reload() { run() }

// 详情抽屉
const sheetVisible = ref(false)
const activeId = ref<string | null>(null)
const activeTask = computed(() => filtered.value.find((t) => t.id === activeId.value) ?? null)
const busy = ref(false)
function onTaskClick(t: GanttTask) { activeId.value = t.id; sheetVisible.value = true }

async function withBusy(fn: () => Promise<void>, okMsg: string) {
  busy.value = true
  try { await fn(); ElMessage.success(okMsg); run() } finally { busy.value = false }
}

async function onReschedule(t: GanttTask, body: { planStartTime?: string; planEndTime?: string }) {
  if (!body.planStartTime || !body.planEndTime) return
  await withBusy(() => ganttReschedule({ id: t.id, planStartTime: body.planStartTime!, planEndTime: body.planEndTime! }), '改期成功')
}
async function onStart(id: string, actualStartTime: string) {
  await withBusy(() => ganttStart({ id, actualStartTime: actualStartTime || undefined }), '已记录开工')
  sheetVisible.value = false
}
async function onFinish(id: string, actualEndTime: string) {
  await withBusy(() => ganttFinish({ id, actualEndTime: actualEndTime || undefined }), '已记录完工')
  sheetVisible.value = false
}
async function onProgress(id: string, progress: number) {
  await withBusy(() => ganttProgress({ id, progress }), '进度已更新')
}
async function onAdjust(id: string, actualStartTime: string, actualEndTime: string) {
  await withBusy(() => ganttActual({ id, actualStartTime: actualStartTime || undefined, actualEndTime: actualEndTime || undefined }), '纠时成功')
}
</script>

<style scoped>
.gantt-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
</style>
