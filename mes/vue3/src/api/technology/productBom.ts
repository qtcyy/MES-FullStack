import { http } from '@/api/request'
import type {
  SpProductBom,
  BomTreeNode,
  SpProductBomItem,
  ProductBomPageReq,
  IPage,
} from '@/types/technology'
import type { SpMaterile } from '@/types/basedata'

/** 根节点分页(form 编码) */
export const productBomPage = (req: ProductBomPageReq) =>
  http.post<IPage<SpProductBom>>('/technology/product-bom/page', req)

/** 全量 BOM 森林(GET) */
export const productBomTree = () =>
  http.get<BomTreeNode[]>('/technology/product-bom/tree')

/** 新增/更新节点(JSON),返回节点 id */
export const productBomSave = (dto: Partial<SpProductBom>) =>
  http.post<string>('/technology/product-bom/add-or-update', dto, true)

/** 级联删除节点(JSON) */
export const productBomDelete = (id: string) =>
  http.post<void>('/technology/product-bom/delete', { id }, true)

/** 锁定整树(JSON) */
export const productBomLock = (id: string) =>
  http.post<void>('/technology/product-bom/lock', { id }, true)

/** 派生新版本(JSON),返回新根 id */
export const productBomNewVersion = (id: string) =>
  http.post<string>('/technology/product-bom/new-version', { id }, true)

/** 取节点行项目(GET) */
export const productBomItems = (bomId: string) =>
  http.get<SpProductBomItem[]>(`/technology/product-bom/items/${bomId}`)

/** 新增/更新行项目(JSON),返回 item id */
export const productBomItemSave = (dto: Partial<SpProductBomItem>) =>
  http.post<string>('/technology/product-bom/item/add-or-update', dto, true)

/** 删除行项目(JSON) */
export const productBomItemDelete = (id: string) =>
  http.post<void>('/technology/product-bom/item/delete', { id }, true)

/** 产品类型物料下拉(GET,根节点选产品) */
export const productBomProducts = () =>
  http.get<SpMaterile[]>('/technology/product-bom/products')
