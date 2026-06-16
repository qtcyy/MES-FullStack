import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { Materiel } from '@/types/basedata'
import type { SpProductBom, BomTreeNode, SpProductBomItem } from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface ProductBomPageParams extends PageParams {
  productCodeLike?: string
  nodeNameLike?: string
}

/** 根节点分页(form 编码;后端 /page 无 @RequestBody) */
export function productBomPage(params: ProductBomPageParams) {
  return http.post<PageResult<SpProductBom>>('/technology/product-bom/page', params)
}

/** 全量树(Map 树,含 children + itemCount) */
export function productBomTree() {
  return http.get<BomTreeNode[]>('/technology/product-bom/tree')
}

/** 新增/更新节点(@RequestBody JSON)→ 节点 id */
export function productBomSave(body: Partial<SpProductBom>) {
  return http.post<string>('/technology/product-bom/add-or-update', body, JSON_HEADERS)
}

/** 删除节点(级联;JSON {id}——@RequestBody Map,不能 form) */
export function productBomDelete(id: string) {
  return http.post<null>('/technology/product-bom/delete', { id }, JSON_HEADERS)
}

/** 锁定整树(JSON {id}) */
export function productBomLock(id: string) {
  return http.post<null>('/technology/product-bom/lock', { id }, JSON_HEADERS)
}

/** 创建新版本(JSON {id})→ 新根 id */
export function productBomNewVersion(id: string) {
  return http.post<string>('/technology/product-bom/new-version', { id }, JSON_HEADERS)
}

/** 查某 BOM 下物料行(sortOrder 升序) */
export function productBomItems(bomId: string) {
  return http.get<SpProductBomItem[]>(`/technology/product-bom/items/${encodeURIComponent(bomId)}`)
}

/** 新增/更新物料行(@RequestBody JSON)→ item id */
export function productBomItemSave(body: Partial<SpProductBomItem>) {
  return http.post<string>('/technology/product-bom/item/add-or-update', body, JSON_HEADERS)
}

/** 删除物料行(JSON {id}) */
export function productBomItemDelete(id: string) {
  return http.post<null>('/technology/product-bom/item/delete', { id }, JSON_HEADERS)
}

/** 产品物料下拉(后端已过滤 matType=产品 且未删) */
export function productBomProducts() {
  return http.get<Materiel[]>('/technology/product-bom/products')
}
