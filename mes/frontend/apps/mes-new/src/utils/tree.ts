// apps/mes-new/src/utils/tree.ts

export type WithChildren<T> = T & { children: WithChildren<T>[] }

/** 扁平(含 parentId)列表 → 嵌套树;parentId 为空或不命中任何节点者作为根 */
export function buildTree<T extends { id: string; parentId?: string }>(
  items: T[],
): WithChildren<T>[] {
  const map = new Map<string, WithChildren<T>>()
  const roots: WithChildren<T>[] = []
  items.forEach((item) => map.set(item.id, { ...item, children: [] }))
  items.forEach((item) => {
    const node = map.get(item.id)!
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export interface SelectTreeNode {
  id: string
  name: string
  children?: SelectTreeNode[]
}

export interface SelectOption {
  value: string
  label: string
}

/** 树 → 带缩进 label 的下拉项;excludeId 排除该节点及其子孙 */
export function flattenTreeForSelect(
  nodes: SelectTreeNode[],
  opts: { excludeId?: string } = {},
): SelectOption[] {
  const out: SelectOption[] = []
  const walk = (list: SelectTreeNode[], depth: number) => {
    for (const n of list) {
      if (opts.excludeId && n.id === opts.excludeId) continue
      out.push({ value: n.id, label: `${'　'.repeat(depth)}${n.name}` })
      if (n.children?.length) walk(n.children, depth + 1)
    }
  }
  walk(nodes, 0)
  return out
}

export interface CheckTreeNode {
  id: string
  children?: CheckTreeNode[]
}

export type CheckState = 'checked' | 'unchecked' | 'indeterminate'

/** 节点自身 + 全部子孙 id */
export function collectSelfAndDescendantIds(node: CheckTreeNode): string[] {
  const ids = [node.id]
  node.children?.forEach((c) => ids.push(...collectSelfAndDescendantIds(c)))
  return ids
}

/** 依据 checked 集合推导节点勾选态:叶子看是否在集合;父由子推导(全选/全不选/半选) */
export function getCheckState(node: CheckTreeNode, checked: Set<string>): CheckState {
  if (!node.children || node.children.length === 0) {
    return checked.has(node.id) ? 'checked' : 'unchecked'
  }
  const states = node.children.map((c) => getCheckState(c, checked))
  if (states.every((s) => s === 'checked')) return 'checked'
  if (states.every((s) => s === 'unchecked')) return 'unchecked'
  return 'indeterminate'
}

/** 切换节点:当前 checked 则清除自身+子孙,否则添加自身+子孙 */
export function toggleNode(node: CheckTreeNode, checked: Set<string>): Set<string> {
  const next = new Set(checked)
  const ids = collectSelfAndDescendantIds(node)
  if (getCheckState(node, checked) === 'checked') {
    ids.forEach((id) => next.delete(id))
  } else {
    ids.forEach((id) => next.add(id))
  }
  return next
}

/** 提交用授权集:所有非 unchecked 的节点 id(含半选祖先),保证菜单树可渲染 */
export function collectGrantedIds(nodes: CheckTreeNode[], checked: Set<string>): string[] {
  const out: string[] = []
  const walk = (list: CheckTreeNode[]) => {
    for (const n of list) {
      if (getCheckState(n, checked) === 'unchecked') continue
      out.push(n.id)
      walk(n.children ?? [])
    }
  }
  walk(nodes)
  return out
}
