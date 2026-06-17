import { http } from '@/http/client'
import type { DashboardOverview } from '@/types/digitization'

/** 数字化大屏总览(只读聚合) */
export function fetchOverview() {
  return http.get<DashboardOverview>('/digitization/dashboard/overview')
}
