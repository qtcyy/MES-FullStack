import type { Materiel } from '@/types/basedata'
import type { BomTreeNode, SpProductBomItem } from '@/types/technology'

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
