import { http } from '@/api/request'
import type { DashboardOverview } from '@/types/digitization'

/** 大屏总览(GET,只读聚合;响应已解包为业务数据) */
export const dashboardOverview = () =>
  http.get<DashboardOverview>('/digitization/dashboard/overview')
