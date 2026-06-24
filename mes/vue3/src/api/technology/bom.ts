import { http } from '@/api/request'
import type { SpBom, BomPageReq, IPage } from '@/types/technology'

/** 工艺 BOM 分页(后端 SpBomReq 按表单参数绑定,默认表单编码) */
export const bomPage = (req: BomPageReq) =>
  http.post<IPage<SpBom>>('/technology/bom/page', req)

export const bomGet = (id: string) =>
  http.get<SpBom>('/technology/bom/get-by-id', { id })

/** 新增/修改(后端 SpBom 表单绑定) */
export const bomAddOrUpdate = (dto: Partial<SpBom>) =>
  http.post<void>('/technology/bom/add-or-update', dto)

/** 删除(后端 SpBom 表单绑定,取 id) */
export const bomDelete = (id: string) =>
  http.post<void>('/technology/bom/delete', { id })
