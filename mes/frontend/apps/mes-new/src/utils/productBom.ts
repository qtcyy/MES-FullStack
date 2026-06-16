import type { Materiel } from '@/types/basedata'
import type { BomTreeNode, SpProductBom, SpProductBomItem } from '@/types/technology'

/** 把选中的产品物料映射成物料行字段(materiel→materialCode 拼写转换) */
export function materielToItem(
  m: Materiel,
): Pick<SpProductBomItem, 'materialCode' | 'materialDesc' | 'unit'> {
  return {
    materialCode: m.materiel,
    materialDesc: m.materielDesc,
    unit: m.unit ?? '个',
  }
}

/** 从 /tree 全量结果里按根 id 取出该根的子树节点(深度优先) */
export function pickRootSubtree(tree: BomTreeNode[], rootId: string): BomTreeNode | undefined {
  for (const node of tree) {
    if (node.id === rootId) return node
    const hit = pickRootSubtree(node.children ?? [], rootId)
    if (hit) return hit
  }
  return undefined
}

/** 任意「带 bomNode 的扁平项」附加 children 后的树节点 */
export type BomNodeTree<T> = T & { children: BomNodeTree<T>[] }

/**
 * 把后端返回的扁平 {bomNode,...} 数组按 parentId 重建为树,兄弟按 sortOrder 升序。
 * 用于 D(BomFlowNodeVO)与 E(ProcessContentNodeVO)的左侧 TreeDataTable。
 */
export function buildBomNodeTree<T extends { bomNode: SpProductBom }>(items: T[]): BomNodeTree<T>[] {
  const byId = new Map<string, BomNodeTree<T>>()
  for (const it of items) byId.set(it.bomNode.id, { ...it, children: [] })
  const roots: BomNodeTree<T>[] = []
  for (const it of items) {
    const node = byId.get(it.bomNode.id)!
    const pid = it.bomNode.parentId
    if (pid && byId.has(pid)) byId.get(pid)!.children.push(node)
    else roots.push(node)
  }
  const sortRec = (arr: BomNodeTree<T>[]) => {
    arr.sort((a, b) => (a.bomNode.sortOrder ?? 0) - (b.bomNode.sortOrder ?? 0))
    arr.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}
