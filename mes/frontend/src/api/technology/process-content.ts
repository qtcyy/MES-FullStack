import client from '../client'

export function getByBomId(bomId: string) { return client.get(`/technology/process-content/get/${bomId}`) }
export function listByProduct(productBomRootId: string) { return client.get(`/technology/process-content/list/${productBomRootId}`) }
export function getProducts() { return client.get('/technology/process-content/products') }
export function getBomItems(bomId: string) { return client.get(`/technology/process-content/bom-items/${bomId}`) }

export function save(record: Record<string, unknown>) {
  return client.post('/technology/process-content/save', record, { headers: { 'Content-Type': 'application/json' } })
}
export function complete(id: string) { return client.post(`/technology/process-content/complete/${id}`) }

export function saveEquipment(record: Record<string, unknown>) {
  return client.post('/technology/process-content/equipment/save', record, { headers: { 'Content-Type': 'application/json' } })
}
export function deleteEquipment(id: string) {
  return client.post('/technology/process-content/equipment/delete', { id }, { headers: { 'Content-Type': 'application/json' } })
}
export function saveDocument(record: Record<string, unknown>) {
  return client.post('/technology/process-content/document/save', record, { headers: { 'Content-Type': 'application/json' } })
}
export function deleteDocument(id: string) {
  return client.post('/technology/process-content/document/delete', { id }, { headers: { 'Content-Type': 'application/json' } })
}

export function uploadImage(file: File) {
  const fd = new FormData(); fd.append('file', file)
  return client.post('/technology/process-content/upload-image', fd)
}
export function uploadDocument(file: File) {
  const fd = new FormData(); fd.append('file', file)
  return client.post('/technology/process-content/upload-document', fd)
}
