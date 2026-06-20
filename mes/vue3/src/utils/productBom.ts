import type { BomTreeNode, SpProductBom, SpProductBomItem } from '@/types/technology'
import type { SpMaterile } from '@/types/basedata'

export type NodeMode = 'create-root' | 'add-child' | 'edit'

/** 在单棵树内深搜指定 id 节点 */
export function findBomNode(root: BomTreeNode, id: string): BomTreeNode | undefined {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const hit = findBomNode(child, id)
    if (hit) return hit
  }
  return undefined
}

/** 从森林按 id 取子树(根或任意层) */
export function pickBomSubtree(forest: BomTreeNode[], id: string): BomTreeNode | undefined {
  for (const root of forest) {
    const hit = findBomNode(root, id)
    if (hit) return hit
  }
  return undefined
}

/** 锁定后只读:status !== 'locked' 可写 */
export function canWriteBom(status?: string): boolean {
  return status !== 'locked'
}

/** 组装节点 add-or-update 提交体:剥空串、sortOrder 数值化、按 mode 带 parentId/id */
export function buildBomNodePayload(
  form: Partial<SpProductBom>,
  ctx: { mode: NodeMode; parentId?: string },
): Partial<SpProductBom> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === '') continue
    out[k] = v
  }
  if (out.sortOrder !== undefined) out.sortOrder = Number(out.sortOrder)
  if (ctx.mode === 'add-child' && ctx.parentId) out.parentId = ctx.parentId
  // create-root 不带 parentId;edit 由 form.id 提供 id;均不主动塞 level/version(后端推导)
  return out as Partial<SpProductBom>
}

/** 校验节点表单 */
export function validateBomNode(form: Partial<SpProductBom>, mode: NodeMode): string | null {
  if (!form.nodeName || !form.nodeName.trim()) return '请输入节点名称'
  if (mode === 'create-root' && (!form.productCode || !form.productCode.trim())) {
    return '请选择产品物料'
  }
  return null
}

/** 组装行项目 add-or-update 提交体:quantity 数值化、unit/itemType 兜底 */
export function buildBomItemPayload(form: Partial<SpProductBomItem>): Partial<SpProductBomItem> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === '') continue
    out[k] = v
  }
  out.itemType = (out.itemType as string) || 'material'
  out.unit = (out.unit as string) || '个'
  if (out.quantity !== undefined) out.quantity = Number(out.quantity)
  if (out.sortOrder !== undefined) out.sortOrder = Number(out.sortOrder)
  return out as Partial<SpProductBomItem>
}

/** 校验行项目表单 */
export function validateBomItem(form: Partial<SpProductBomItem>): string | null {
  if (!form.materialCode || !form.materialCode.trim()) return '请选择物料'
  const q = Number(form.quantity)
  if (!Number.isFinite(q) || q <= 0) return '用量必须大于 0'
  return null
}

/** 物料 → 行项目字段(materiel→materialCode,unit 兜底 '个') */
export function materielToItem(
  m: SpMaterile,
): Pick<SpProductBomItem, 'materialCode' | 'materialDesc' | 'unit'> {
  return {
    materialCode: m.materiel ?? '',
    materialDesc: m.materielDesc,
    unit: m.unit ?? '个',
  }
}
