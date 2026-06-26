import type { BomFlowNodeVO, BomFlowTreeNode, FlowOperItem } from '@/types/technology'

/** 扁平 list 响应 → 树:按 bomNode.parentId 建父子,同级按 sortOrder 升序,bomNode 字段展平到顶层 */
export function buildBomNodeTree(items: BomFlowNodeVO[]): BomFlowTreeNode[] {
  const map = new Map<string, BomFlowTreeNode>()
  for (const it of items) {
    map.set(it.bomNode.id, {
      ...it.bomNode,
      bomFlow: it.bomFlow ?? null,
      flow: it.flow ?? null,
      opers: it.opers ?? [],
      children: [],
    })
  }
  const roots: BomFlowTreeNode[] = []
  for (const it of items) {
    const node = map.get(it.bomNode.id)!
    const pid = it.bomNode.parentId
    if (pid && map.has(pid)) map.get(pid)!.children.push(node)
    else roots.push(node)
  }
  const sortRec = (ns: BomFlowTreeNode[]) => {
    ns.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    ns.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

/** 可绑/换/解的前提:根、现有绑定、节点三者均未锁定 */
export function canWriteBomFlow(rootStatus?: string, bindStatus?: string, nodeStatus?: string): boolean {
  return rootStatus !== 'locked' && (bindStatus ?? 'draft') !== 'locked' && nodeStatus !== 'locked'
}

/** 组装 bind 入参:剥空白备注 */
export function buildBindPayload(
  bomId: string,
  flowId: string,
  remark?: string,
): { bomId: string; flowId: string; remark?: string } {
  const out: { bomId: string; flowId: string; remark?: string } = { bomId, flowId }
  if (remark && remark.trim()) out.remark = remark.trim()
  return out
}

/** 工序链预览行:序号/工序描述/首末道标记 */
export interface OperPreviewRow {
  seq: number
  operDesc: string
  mark: string
}
export function flowOperRows(opers?: FlowOperItem[]): OperPreviewRow[] {
  if (!opers || opers.length === 0) return []
  return opers.map((it, i) => ({
    seq: it.relation.sortNum ?? i + 1,
    operDesc: it.oper?.operDesc || it.relation.oper || '',
    mark: it.relation.operType === 'firstOper' ? '首道' : it.relation.operType === 'lastOper' ? '末道' : '',
  }))
}
