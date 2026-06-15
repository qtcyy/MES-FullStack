// apps/mes-new/src/api/system/dept.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SysDepartment } from '@/types/system'

export interface DeptPageParams extends PageParams {
  nameLike?: string
}

export function deptPage(params: DeptPageParams) {
  return http.post<PageResult<SysDepartment>>('/admin/sys/department/page', params)
}

/** 新增/编辑;删除走此接口设 isDeleted='1'(软删除) */
export function deptAddOrUpdate(record: SysDepartment) {
  return http.post<void>('/admin/sys/department/add-or-update', record)
}
