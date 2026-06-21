<template>
  <div class="gantt" :style="{ '--day-w': dayW + 'px', '--label-w': labelW + 'px' }">
    <!-- 时间轴 -->
    <div class="gantt__axis" :style="{ paddingLeft: labelW + 'px', width: labelW + days.length * dayW + 'px' }">
      <div v-for="d in days" :key="d" class="gantt__day">{{ fmtDay(d) }}</div>
    </div>

    <div class="gantt__body" :style="{ width: labelW + days.length * dayW + 'px' }">
      <!-- 今日红线 -->
      <div class="gantt__today" :style="{ left: labelW + timeToX(floorNow, rangeStart, dayW) + dayW / 2 + 'px' }" />

      <template v-for="g in groups" :key="g.id">
        <div class="gantt__group">
          <span class="gantt__group-label">{{ g.label }}</span>
          <el-tag v-if="g.tag" size="small" type="info">{{ g.tag }}</el-tag>
        </div>
        <div v-for="row in g.rows" :key="row.id" class="gantt__row">
          <div class="gantt__row-label">
            <div>{{ row.label }}</div>
            <small v-if="row.sub">{{ row.sub }}</small>
          </div>
          <div class="gantt__track" :style="{ width: days.length * dayW + 'px' }">
            <template v-for="t in row.tasks" :key="t.id">
              <!-- 计划条（可拖拽） -->
              <div
                v-if="planBar(t)"
                class="gantt__bar gantt__bar--plan"
                :style="planBar(t)!"
                :title="planTitle(t)"
                @pointerdown="(e) => onPointerDown(e, t)"
              >
                <span class="gantt__handle gantt__handle--l" />
                <span class="gantt__handle gantt__handle--r" />
              </div>
              <!-- 实际条（点击开抽屉） -->
              <div
                v-if="actualBar(t)"
                class="gantt__bar gantt__bar--actual"
                :class="`is-${statusOf(t)}`"
                :style="actualBar(t)!"
                :title="actualTitle(t)"
                @click="emit('task-click', t)"
              >
                <span class="gantt__bar-progress" :style="{ width: (t.progress ?? 0) + '%' }" />
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import {
  computeRange, enumerateDays, timeToX, parseDay, floorDay, daysBetween,
  getDisplayStatus, pxToDays, shiftPlanByDays,
  type GanttGroup, type DragMode,
} from '@/utils/gantt'
import type { GanttTask } from '@/types/order'

const props = defineProps<{ groups: GanttGroup[]; tasks: GanttTask[]; nowMs: number }>()
const emit = defineEmits<{
  'task-click': [GanttTask]
  reschedule: [GanttTask, { planStartTime?: string; planEndTime?: string }]
}>()

const dayW = 44
const labelW = 176
const floorNow = computed(() => floorDay(props.nowMs))

const range = computed(() => computeRange(props.tasks, props.nowMs))
const rangeStart = computed(() => range.value.startMs)
const days = computed(() => enumerateDays(range.value.startMs, range.value.endMs))

function fmtDay(ms: number): string {
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function statusOf(t: GanttTask) { return getDisplayStatus(t, props.nowMs) }

// 拖拽预览覆盖：taskId → deltaDays + mode
const dragId = ref<string | null>(null)
const dragMode = ref<DragMode>('move')
const dragDelta = ref(0)
let startX = 0
let activeEl: HTMLElement | null = null

function detachMove() {
  activeEl?.removeEventListener('pointermove', onMove)
  activeEl = null
}
function resetDrag() {
  dragId.value = null
  dragDelta.value = 0
}

function effective(t: GanttTask): GanttTask {
  if (dragId.value === t.id && dragDelta.value !== 0) {
    const s = shiftPlanByDays(t, dragDelta.value, dragMode.value)
    return { ...t, ...s }
  }
  return t
}

function planBar(t0: GanttTask): Record<string, string> | null {
  const t = effective(t0)
  const ps = parseDay(t.planStartTime); const pe = parseDay(t.planEndTime)
  if (ps === null || pe === null) return null
  const x = timeToX(ps, rangeStart.value, dayW)
  const w = (daysBetween(ps, pe) + 1) * dayW
  return { left: x + 'px', width: w + 'px' }
}
function actualBar(t: GanttTask): Record<string, string> | null {
  const as = parseDay(t.actualStartTime)
  if (as === null) return null
  const end = parseDay(t.actualEndTime) ?? floorNow.value
  const x = timeToX(as, rangeStart.value, dayW)
  const w = (daysBetween(as, end) + 1) * dayW
  return { left: x + 'px', width: w + 'px' }
}
function planTitle(t: GanttTask) { return `计划 ${t.planStartTime ?? '?'} ~ ${t.planEndTime ?? '?'}` }
function actualTitle(t: GanttTask) { return `实际 ${t.actualStartTime ?? '?'} ~ ${t.actualEndTime ?? '进行中'}（${t.progress ?? 0}%）` }

function onPointerDown(e: PointerEvent, t: GanttTask) {
  e.stopPropagation()
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const off = e.clientX - rect.left
  dragMode.value = off < 8 ? 'resize-start' : off > rect.width - 8 ? 'resize-end' : 'move'
  dragId.value = t.id
  dragDelta.value = 0
  startX = e.clientX
  activeEl = el
  el.setPointerCapture(e.pointerId)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', (ev) => onUp(ev, t), { once: true })
  el.addEventListener('pointercancel', onCancel, { once: true })
}
function onMove(e: PointerEvent) {
  dragDelta.value = pxToDays(e.clientX - startX, dayW)
}
function onCancel() {
  detachMove()
  resetDrag()
}
function onUp(_e: PointerEvent, t: GanttTask) {
  detachMove()
  const delta = dragDelta.value
  const mode = dragMode.value
  resetDrag()
  if (delta === 0) { emit('task-click', t); return }
  emit('reschedule', t, shiftPlanByDays(t, delta, mode))
}

onUnmounted(() => detachMove())
</script>

<style scoped>
.gantt { overflow-x: auto; font-size: 12px; }
.gantt__axis { display: flex; position: sticky; top: 0; z-index: 3; background: var(--el-bg-color); border-bottom: 1px solid var(--el-border-color); }
.gantt__day { width: var(--day-w); flex: 0 0 var(--day-w); text-align: center; color: var(--el-text-color-secondary); padding: 4px 0; }
.gantt__body { position: relative; }
.gantt__today { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--el-color-danger); z-index: 2; }
.gantt__group { display: flex; align-items: center; gap: 8px; height: 30px; padding-left: 8px; background: var(--el-fill-color-light); font-weight: 600; position: sticky; left: 0; z-index: 2; }
.gantt__row { display: flex; height: 40px; border-bottom: 1px solid var(--el-border-color-lighter); }
.gantt__row-label { width: var(--label-w); flex: 0 0 var(--label-w); padding: 4px 8px; position: sticky; left: 0; background: var(--el-bg-color); z-index: 1; border-right: 1px solid var(--el-border-color-lighter); }
.gantt__row-label small { color: var(--el-text-color-secondary); }
.gantt__track { position: relative; }
.gantt__bar { position: absolute; height: 14px; border-radius: 4px; }
.gantt__bar--plan { top: 4px; background: var(--el-color-info-light-5); cursor: grab; }
.gantt__bar--actual { top: 20px; height: 16px; overflow: hidden; cursor: pointer; background: var(--el-color-info); }
.gantt__bar--actual.is-notStarted { background: var(--el-color-info); }
.gantt__bar--actual.is-inProgress { background: var(--el-color-warning); }
.gantt__bar--actual.is-overdue { background: var(--el-color-danger); }
.gantt__bar--actual.is-completed { background: var(--el-color-success); }
.gantt__bar-progress { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(255,255,255,0.35); }
.gantt__handle { position: absolute; top: 0; bottom: 0; width: 6px; cursor: ew-resize; }
.gantt__handle--l { left: 0; }
.gantt__handle--r { right: 0; }
</style>
