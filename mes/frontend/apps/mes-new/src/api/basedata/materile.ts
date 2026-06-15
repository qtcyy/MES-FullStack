// apps/mes-new/src/api/basedata/materile.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { Materiel } from '@/types/basedata'

export interface MaterilePageParams extends PageParams {
  materielLike?: string
  materielDescLike?: string
}

export function materilePage(params: MaterilePageParams) {
  return http.post<PageResult<Materiel>>('/basedata/materile/page', params)
}

/** add-or-update 为 form 编码(后端无 @RequestBody);新建不传 materiel(后端自动生成);删除=软删传 deleted='1' */
export function materileAddOrUpdate(record: Partial<Materiel>) {
  return http.post<void>('/basedata/materile/add-or-update', record)
}
