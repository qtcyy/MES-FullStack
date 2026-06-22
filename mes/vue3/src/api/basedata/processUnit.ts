import { http } from '@/api/request'
import type { SpProcessUnit, ProcessUnitPageReq } from '@/types/processUnit'
import type { IPage } from '@/types/basedata'

/** 分页(form) */
export const processUnitPage = (req: ProcessUnitPageReq) =>
  http.post<IPage<SpProcessUnit>>('/basedata/process-unit/page', req)

/** 单个(GET) */
export const processUnitGetById = (id: string) =>
  http.get<SpProcessUnit>(`/basedata/process-unit/${encodeURIComponent(id)}`)

/** 新增/编辑(JSON @RequestBody) */
export const processUnitAddOrUpdate = (dto: Partial<SpProcessUnit>) =>
  http.post<string>('/basedata/process-unit/add-or-update', dto, true)

/** 软删(JSON @RequestBody) */
export const processUnitDelete = (id: string) =>
  http.post<void>('/basedata/process-unit/delete', { id }, true)
