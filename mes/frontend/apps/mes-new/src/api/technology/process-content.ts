import { http } from '@/http/client'
import type {
  SpProductBom,
  SpProductBomItem,
  ProcessContentNodeVO,
  ProcessContentDetailVO,
  SpProcessContent,
  SpProcessEquipment,
  SpProcessDocument,
} from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 上传端点(供 MultiImageUpload / ProcessDocumentUpload 直接走 FormData) */
export const PROCESS_UPLOAD_IMAGE_URL = '/technology/process-content/upload-image'
export const PROCESS_UPLOAD_DOCUMENT_URL = '/technology/process-content/upload-document'

export function processContentProducts() {
  return http.get<SpProductBom[]>('/technology/process-content/products')
}
export function processContentList(rootId: string) {
  return http.get<ProcessContentNodeVO[]>(`/technology/process-content/list/${encodeURIComponent(rootId)}`)
}
export function processContentGet(bomId: string) {
  return http.get<ProcessContentDetailVO>(`/technology/process-content/get/${encodeURIComponent(bomId)}`)
}
export function processContentBomItems(bomId: string) {
  return http.get<SpProductBomItem[]>(`/technology/process-content/bom-items/${encodeURIComponent(bomId)}`)
}
export function processContentSave(body: Partial<SpProcessContent>) {
  return http.post<string>('/technology/process-content/save', body, JSON_HEADERS)
}
export function processContentComplete(id: string) {
  return http.post<null>(`/technology/process-content/complete/${encodeURIComponent(id)}`, {}, JSON_HEADERS)
}
export function processEquipmentSave(body: Partial<SpProcessEquipment>) {
  return http.post<string>('/technology/process-content/equipment/save', body, JSON_HEADERS)
}
export function processEquipmentDelete(id: string) {
  return http.post<null>('/technology/process-content/equipment/delete', { id }, JSON_HEADERS)
}
export function processDocumentSave(body: Partial<SpProcessDocument>) {
  return http.post<string>('/technology/process-content/document/save', body, JSON_HEADERS)
}
export function processDocumentDelete(id: string) {
  return http.post<null>('/technology/process-content/document/delete', { id }, JSON_HEADERS)
}
