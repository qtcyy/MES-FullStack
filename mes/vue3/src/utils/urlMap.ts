/** 后端 FreeMarker *-list-ui → 干净 SPA 路由 */
const URL_MAP: Record<string, string> = {
  '/admin/welcome-ui': '/welcome',
  '/admin/sys/user/list-ui': '/system/user',
  '/admin/sys/role/list-ui': '/system/role',
  '/admin/sys/menu/list-ui': '/system/menu',
  '/admin/sys/dict/list-ui': '/system/dict',
  '/admin/sys/department/list-ui': '/system/department',
  '/basedata/materile/list-ui': '/basedata/materile',
  '/basedata/flow/process/list-ui': '/technology/flow',
  '/basedata/sp-oper/list-ui': '/technology/oper',
  '/technology/product-bom/list-ui': '/technology/product-bom',
  '/technology/bom-flow/list-ui': '/technology/bom-flow',
  '/order/release/list-ui': '/order/release',
  '/order/dispatch': '/order/dispatch',
  '/order/gantt': '/order/gantt',
  '/digitization/plan/plan-ui': '/digitization/dashboard',
}

/** 不可导航(#/空/javascript:)→ undefined;已知→映射;未知→原样 */
export function toSpaRoute(url?: string): string | undefined {
  if (!url || url === '#' || url.trim() === '' || url.startsWith('javascript:')) return undefined
  return URL_MAP[url] ?? url
}
