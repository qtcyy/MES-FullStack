import { useEffect, useMemo } from 'react'
import { useMenuStore } from '@/stores/menuStore'
import { toReactRoute } from '@/utils/urlMap'
import type { TreeVO, SysMenu } from '@/types/menu'

/** 任意登录用户都可访问的白名单 */
const WHITELIST = ['/welcome', '/403']

/**
 * 应用内已注册的页面路由全集(须与 router.tsx 保持一致)。
 * 用于区分「已注册但无权 → 403」与「路径不存在 → 由 NotFound 处理」。
 */
export const APP_ROUTES = new Set<string>([
  '/welcome',
  '/system/user', '/system/role', '/system/menu', '/system/dict', '/system/department', '/system/team',
  '/basedata/component', '/basedata/materile', '/basedata/device-group', '/basedata/process-unit',
  '/basedata/warehouse', '/basedata/oper', '/basedata/manager', '/basedata/manager-item',
  '/technology/flow', '/technology/product-bom', '/technology/process-flow',
  '/technology/process-content', '/technology/process-query',
  '/order/production', '/order/dispatch', '/order/gantt',
  '/inventory/receipt', '/inventory/outbound', '/inventory/query', '/inventory/manual-inbound',
  '/workflow/category', '/workflow/model', '/workflow/form', '/workflow/definition',
  '/digitization/simulation', '/digitization/plan',
])

/** 纯函数:由菜单树派生当前用户可访问的 SPA 路由集合(含白名单) */
export function computeAllowedRoutes(
  menuInfo: Record<string, TreeVO<SysMenu>> | null,
): Set<string> {
  const acc = new Set<string>(WHITELIST)
  const walk = (nodes: TreeVO<SysMenu>[]) => {
    for (const n of nodes) {
      const r = toReactRoute(n.url)
      if (r) acc.add(r)
      if (n.children?.length) walk(n.children)
    }
  }
  if (menuInfo) walk(Object.values(menuInfo))
  return acc
}

/** 守卫用:确保菜单已加载,并返回 { loaded, allowed } */
export function useAllowedRoutes(): { loaded: boolean; allowed: Set<string> } {
  const loaded = useMenuStore((s) => s.loaded)
  const menuInfo = useMenuStore((s) => s.menuInfo)
  const fetchMenuTree = useMenuStore((s) => s.fetchMenuTree)

  useEffect(() => {
    if (!loaded) fetchMenuTree()
  }, [loaded, fetchMenuTree])

  const allowed = useMemo(() => computeAllowedRoutes(menuInfo), [menuInfo])
  return { loaded, allowed }
}
