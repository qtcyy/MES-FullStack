import type { MenuInfo, TreeVO, SysMenu } from '@/types/menu'

type MenuMap = MenuInfo['menuInfo']

/** 递归收集菜单树中所有非空 permission 字符串 */
export function collectPermissions(menuInfo: MenuMap | null): Set<string> {
  const set = new Set<string>()
  if (!menuInfo) return set
  const walk = (node: TreeVO<SysMenu>) => {
    // permission 可能是逗号分隔的多个权限(与后端 ShiroRealm 的 split 行为一致)
    if (node.permission) {
      node.permission.split(',').forEach((p) => {
        const t = p.trim()
        if (t) set.add(t)
      })
    }
    node.children?.forEach(walk)
  }
  Object.values(menuInfo).forEach(walk)
  return set
}

/** 拍平出所有带有效 url(非 '#'/空)的菜单叶子,用于路由匹配/快捷入口 */
export function flattenMenu(menuInfo: MenuMap | null): TreeVO<SysMenu>[] {
  const out: TreeVO<SysMenu>[] = []
  if (!menuInfo) return out
  const walk = (node: TreeVO<SysMenu>) => {
    if (node.url && node.url !== '#' && node.url.trim() !== '') out.push(node)
    node.children?.forEach(walk)
  }
  Object.values(menuInfo).forEach(walk)
  return out
}
