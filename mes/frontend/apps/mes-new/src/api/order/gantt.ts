import { http } from '@/http/client'
import type { GanttTask, GanttQueryParams } from '@/types/order'

/** 拉取甘特图任务(只读聚合);默认 form-encoded,后端 GanttQueryReq 绑定 */
export function fetchGanttTasks(params: GanttQueryParams = {}) {
  return http.post<GanttTask[]>('/order/gantt/tasks', params)
}
