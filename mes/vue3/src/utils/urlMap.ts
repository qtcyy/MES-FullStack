/** 后端 FreeMarker *-list-ui → 干净 SPA 路由 */
const URL_MAP: Record<string, string> = {
  '/admin/welcome-ui': '/welcome',
  '/admin/sys/user/list-ui': '/system/user',
  '/admin/sys/role/list-ui': '/system/role',
  '/admin/sys/menu/list-ui': '/system/menu',
  '/admin/sys/dict/list-ui': '/system/dict',
  '/admin/sys/department/list-ui': '/system/department',
  '/admin/sys/team/list-ui': '/system/team',
  '/basedata/materile/list-ui': '/basedata/materile',
  '/basedata/device/list-ui': '/basedata/device',
  '/basedata/component/list-ui': '/basedata/component',
  '/basedata/device-group/list-ui': '/basedata/device-group',
  '/basedata/warehouse/list-ui': '/basedata/warehouse',
  '/basedata/process-unit/list-ui': '/basedata/process-unit',
  '/basedata/manager/list-ui': '/basedata/manager',
  '/basedata/manager/item/list-ui': '/basedata/manager-item',
  '/basedata/flow/process/list-ui': '/technology/flow',
  '/basedata/sp-oper/list-ui': '/technology/oper',
  '/technology/product-bom/list-ui': '/technology/product-bom',
  '/technology/bom-flow/list-ui': '/technology/bom-flow',
  '/technology/process-content': '/technology/process-content',
  '/technology/process-query': '/technology/process-query',
  '/order/release/list-ui': '/order/release',
  '/order/dispatch': '/order/dispatch',
  '/order/gantt': '/order/gantt',
  '/digitization/plan/plan-ui': '/digitization/dashboard',
  '/digital/simulation/list-ui': '/digitization/simulation',
  '/workflow/category/list-ui': '/workflow/category',
  '/workflow/form/list-ui': '/workflow/form',
  '/workflow/definition/list-ui': '/workflow/definition',
  '/workflow/model/list-ui': '/workflow/model',
}

/** 不可导航(#/空/javascript:)→ undefined;已知→映射;未知→原样 */
export function toSpaRoute(url?: string): string | undefined {
  if (!url || url === '#' || url.trim() === '' || url.startsWith('javascript:')) return undefined
  return URL_MAP[url] ?? url
}
