import { http } from '@/http/client'
import type {
  GanttTask, GanttQueryParams,
  GanttRescheduleReq, GanttStartReq, GanttFinishReq, GanttProgressReq, GanttActualReq,
} from '@/types/order'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 拉取甘特图任务(只读聚合);默认 form-encoded,后端 GanttQueryReq 绑定 */
export function fetchGanttTasks(params: GanttQueryParams = {}) {
  return http.post<GanttTask[]>('/order/gantt/tasks', params)
}

/** 拖拽改期(JSON) */
export function rescheduleTask(body: GanttRescheduleReq) {
  return http.post<void>('/order/gantt/reschedule', body, JSON_HEADERS)
}

/** 记录开工(JSON);actualStartTime 省略则后端默认当前时间 */
export function startTask(body: GanttStartReq) {
  return http.post<void>('/order/gantt/start', body, JSON_HEADERS)
}

/** 记录完工(JSON);actualEndTime 省略则后端默认当前时间 */
export function finishTask(body: GanttFinishReq) {
  return http.post<void>('/order/gantt/finish', body, JSON_HEADERS)
}

/** 更新进度(JSON) */
export function updateTaskProgress(body: GanttProgressReq) {
  return http.post<void>('/order/gantt/progress', body, JSON_HEADERS)
}

/** 手动修正实际时间(JSON) */
export function adjustTaskActual(body: GanttActualReq) {
  return http.post<void>('/order/gantt/actual', body, JSON_HEADERS)
}
