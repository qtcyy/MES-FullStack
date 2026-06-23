import { http } from '@/api/request'
import type {
  SpProcessContent,
  SpProcessEquipment,
  SpProcessDocumentVO,
  ProcessContentDetail,
  ProcessContentListItem,
  SpProductBom,
  SpProductBomItem,
} from '@/types/technology'

const BASE = '/technology/process-content'

// ---- 读 ----
export const pcProducts = () => http.get<SpProductBom[]>(`${BASE}/products`)
export const pcList = (rootId: string) =>
  http.get<ProcessContentListItem[]>(`${BASE}/list/${encodeURIComponent(rootId)}`)
export const pcGet = (bomId: string) =>
  http.get<ProcessContentDetail>(`${BASE}/get/${encodeURIComponent(bomId)}`)
export const pcBomItems = (bomId: string) =>
  http.get<SpProductBomItem[]>(`${BASE}/bom-items/${encodeURIComponent(bomId)}`)

// ---- 写(JSON)----
export const pcSave = (content: SpProcessContent) => http.post<string>(`${BASE}/save`, content, true)
export const pcComplete = (id: string) =>
  http.post<void>(`${BASE}/complete/${encodeURIComponent(id)}`, {}, true)
export const pcEquipmentSave = (eq: SpProcessEquipment) =>
  http.post<string>(`${BASE}/equipment/save`, eq, true)
export const pcEquipmentDelete = (id: string) =>
  http.post<void>(`${BASE}/equipment/delete`, { id }, true)
export const pcDocumentSave = (doc: Partial<SpProcessDocumentVO>) =>
  http.post<string>(`${BASE}/document/save`, doc, true)
export const pcDocumentDelete = (id: string) =>
  http.post<void>(`${BASE}/document/delete`, { id }, true)

// ---- 上传(multipart)----
export const pcUploadImage = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return http.upload<{ key: string; url: string }>(`${BASE}/upload-image`, form)
}
export const pcUploadDocument = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return http.upload<{ key: string; url: string; name: string }>(`${BASE}/upload-document`, form)
}
