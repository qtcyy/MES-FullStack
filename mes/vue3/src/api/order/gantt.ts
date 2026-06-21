import { http } from '@/api/request'
import type { GanttTask, GanttQueryParams, GanttReschedule, GanttStart, GanttFinish, GanttProgress, GanttActual } from '@/types/order'

/** 甘特任务（form，只读聚合） */
export const ganttTasks = (params: GanttQueryParams = {}) =>
  http.post<GanttTask[]>('/order/gantt/tasks', params)

/** 拖拽改期（JSON） */
export const ganttReschedule = (body: GanttReschedule) =>
  http.post<void>('/order/gantt/reschedule', body, true)

/** 记录开工（JSON，空时间后端取 now） */
export const ganttStart = (body: GanttStart) =>
  http.post<void>('/order/gantt/start', body, true)

/** 记录完工（JSON） */
export const ganttFinish = (body: GanttFinish) =>
  http.post<void>('/order/gantt/finish', body, true)

/** 更新进度（JSON） */
export const ganttProgress = (body: GanttProgress) =>
  http.post<void>('/order/gantt/progress', body, true)

/** 纠正实际时间（JSON） */
export const ganttActual = (body: GanttActual) =>
  http.post<void>('/order/gantt/actual', body, true)
