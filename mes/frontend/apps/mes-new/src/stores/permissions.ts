import type { TreeVO, SysMenu } from '@/types/menu'

/** 递归遍历菜单树,收集所有非空 permission */
export function collectPermissions(
  tree: Record<string, TreeVO<SysMenu>>,
): Set<string> {
  const perms = new Set<string>()
  const walk = (node: TreeVO<SysMenu>) => {
    if (node.permission) perms.add(node.permission)
    node.children?.forEach(walk)
  }
  for (const key in tree) walk(tree[key])
  return perms
}
