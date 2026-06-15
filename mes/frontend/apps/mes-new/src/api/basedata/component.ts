// apps/mes-new/src/api/basedata/component.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpComponent } from '@/types/basedata'

export interface ComponentPageParams extends PageParams {
  name?: string
  code?: string
}

export function componentPage(params: ComponentPageParams) {
  return http.post<PageResult<SpComponent>>('/basedata/component/page', params)
}

/** add-or-update 为 form 编码(后端无 @RequestBody) */
export function componentAddOrUpdate(record: Partial<SpComponent>) {
  return http.post<void>('/basedata/component/add-or-update', record)
}

/** delete 为 JSON(后端 @RequestBody Map),显式设 json 头跳过表单化 */
export function componentDelete(id: string) {
  return http.post<void>('/basedata/component/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}
