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
