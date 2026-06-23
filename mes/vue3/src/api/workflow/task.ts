import { http } from '@/api/request'
import type { WorkflowTask, WorkflowEvent } from '@/types/plan'

export const taskTodo = () => http.post<WorkflowTask[]>('/workflow/task/todo', {})
export const taskClaim = (taskId: string) => http.post<void>('/workflow/task/claim', { taskId })
export const taskComplete = (taskId: string, comment: string) =>
  http.post<void>('/workflow/task/complete', { taskId, comment })
export const taskReject = (taskId: string, comment: string) =>
  http.post<void>('/workflow/task/reject', { taskId, comment })
export const taskHistory = (instanceId: string) =>
  http.get<WorkflowEvent[]>(`/workflow/task/history/${instanceId}`)
