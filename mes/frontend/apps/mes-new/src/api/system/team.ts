import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpTeam } from '@/types/process-unit'

export interface TeamPageParams extends PageParams {
  name?: string
  code?: string
}

/** 全量班组(分页),用于工艺单元绑定候选 */
export function teamPage(params: TeamPageParams) {
  return http.post<PageResult<SpTeam>>('/admin/sys/team/page', params)
}
