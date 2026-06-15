// apps/mes-new/src/api/system/dict.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SysDict } from '@/types/system'

export interface DictPageParams extends PageParams {
  nameLike?: string
}

export function dictPage(params: DictPageParams) {
  return http.post<PageResult<SysDict>>('/admin/sys/dict/page', params)
}

/** 新增/编辑;删除亦走此接口设 deleted='1'(软删除) */
export function dictAddOrUpdate(record: SysDict) {
  return http.post<void>('/admin/sys/dict/add-or-update', record)
}
