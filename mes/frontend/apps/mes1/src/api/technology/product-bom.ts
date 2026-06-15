import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { ProductBom, ProductBomItem } from '@/types/common'

export function page(params: PageParams & { productCodeLike?: string; nodeNameLike?: string }) {
  return client.post('/technology/product-bom/page', params) as Promise<PageResult<ProductBom>>
}

export function tree() {
  return client.get('/technology/product-bom/tree') as Promise<ProductBom[]>
}

export function getTree(id: string) {
  return client.get(`/technology/product-bom/tree/${id}`) as Promise<ProductBom[]>
}

export function addOrUpdate(record: Record<string, unknown>) {
  return client.post('/technology/product-bom/add-or-update', record, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function deleteBom(id: string) {
  return client.post('/technology/product-bom/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function lockBom(id: string) {
  return client.post('/technology/product-bom/lock', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function newVersion(id: string) {
  return client.post('/technology/product-bom/new-version', { id }, {
    headers: { 'Content-Type': 'application/json' },
  }) as Promise<string>
}

export function getItems(bomId: string) {
  return client.get(`/technology/product-bom/items/${bomId}`) as Promise<ProductBomItem[]>
}

export function addOrUpdateItem(record: Record<string, unknown>) {
  return client.post('/technology/product-bom/item/add-or-update', record, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function deleteItem(id: string) {
  return client.post('/technology/product-bom/item/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getProducts() {
  return client.get('/technology/product-bom/products') as Promise<{ id: string; materiel: string; materielDesc: string }[]>
}
