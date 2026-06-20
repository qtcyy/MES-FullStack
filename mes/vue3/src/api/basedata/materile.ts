import { http } from '@/api/request'
import type { SpMaterile, MaterilePageReq, IPage } from '@/types/basedata'

export const materilePage = (req: MaterilePageReq) =>
  http.post<IPage<SpMaterile>>('/basedata/materile/page', req)

export const materileGetById = (id: string) =>
  http.get<SpMaterile>('/basedata/materile/get-by-id', { id })

export const materileAddOrUpdate = (dto: Partial<SpMaterile>) =>
  http.post<string>('/basedata/materile/add-or-update', dto)

export const materileDelete = (id: string) =>
  http.post<string>('/basedata/materile/delete', { id })

/** 上传物料图片,返回 { url } */
export const materileUploadImage = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return http.upload<{ url: string }>('/basedata/materile/upload-image', form)
}
