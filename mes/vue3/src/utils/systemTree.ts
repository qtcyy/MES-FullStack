export interface HasIdParent { id: string; parentId: string }
export type Tree<T> = T & { children?: Tree<T>[] }

/** 平铺列表→树;rootId 默认 '0' */
export function buildTree<T extends HasIdParent>(flat: T[], rootId = '0'): Tree<T>[] {
  const map = new Map<string, Tree<T>>()
  flat.forEach((n) => map.set(n.id, { ...n }))
  const roots: Tree<T>[] = []
  map.forEach((node) => {
    if (node.parentId === rootId || !map.has(node.parentId)) roots.push(node) // 真根或孤儿(父不在集合)都作根
    else (map.get(node.parentId)!.children ??= []).push(node)
  })
  return roots
}

/** 自身 + 全部后代 id(tree-select 排除自身防环) */
export function collectSubtreeIds<T extends HasIdParent>(flat: T[], targetId: string): Set<string> {
  const childrenOf = new Map<string, string[]>()
  flat.forEach((n) => {
    if (!childrenOf.has(n.parentId)) childrenOf.set(n.parentId, [])
    childrenOf.get(n.parentId)!.push(n.id)
  })
  const out = new Set<string>()
  const stack = [targetId]
  while (stack.length) {
    const id = stack.pop()!
    if (out.has(id)) continue
    out.add(id)
    ;(childrenOf.get(id) ?? []).forEach((c) => stack.push(c))
  }
  return out
}

/** 角色权限树:勾选 + 半选,去重 */
export function mergeCheckedMenuIds(checked: string[], halfChecked: string[]): string[] {
  return [...new Set([...checked, ...halfChecked])]
}

/** 用户表单提交裁剪:编辑且密码空→剔除 password */
export function buildUserPayload(form: Record<string, unknown>, isEdit: boolean): Record<string, unknown> {
  const out = { ...form }
  if (isEdit && (!out.password || String(out.password).trim() === '')) delete out.password
  return out
}

/** 字典两级拆分:类型(parentId==='0')+ 按类型 id 分组的项 */
export function partitionDict<T extends HasIdParent>(rows: T[]): { types: T[]; itemsByType: Record<string, T[]> } {
  const types: T[] = []
  const itemsByType: Record<string, T[]> = {}
  rows.forEach((r) => {
    if (r.parentId === '0') types.push(r)
    else (itemsByType[r.parentId] ??= []).push(r)
  })
  return { types, itemsByType }
}
