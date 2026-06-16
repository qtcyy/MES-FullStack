/** 旧 FreeMarker 后端 URL → 新 React Router 路由 */
const URL_MAP: Record<string, string> = {
  '/admin/welcome-ui': '/welcome',
  '/admin/sys/user/list-ui': '/system/user',
  '/admin/sys/role/list-ui': '/system/role',
  '/admin/sys/menu/list-ui': '/system/menu',
  '/admin/sys/dict/list-ui': '/system/dict',
  '/admin/sys/department/list-ui': '/system/department',
  '/admin/sys/team/list-ui': '/system/team',
  '/basedata/materile/list-ui': '/basedata/materile',
  '/basedata/manager/list-ui': '/basedata/manager',
  '/basedata/manager/item/list-ui': '/basedata/manager-item',
  '/basedata/device-group/list-ui': '/basedata/device-group',
  '/basedata/process-unit/list-ui': '/basedata/process-unit',
  '/basedata/warehouse/list-ui': '/basedata/warehouse',
  '/basedata/component/list-ui': '/basedata/component',
  '/technology/bom/list-ui': '/technology/bom',
  '/basedata/flow/list-ui': '/technology/flow',
  // 菜单「工艺路线管理」(sp_sys_menu#151)指向工序编排页(= 本系统的工艺路线列表/编排)
  '/basedata/flow/process/list-ui': '/technology/flow',
  // 菜单「工序信息定义」(sp_sys_menu#113, url=/technology/oper)指向工序基础数据页
  '/technology/oper': '/basedata/oper',
  '/order/release/list-ui': '/order/production',
  '/digitization/plan/plan-ui': '/digitization/plan',
  '/digital/simulation/list-ui': '/digitization/simulation',
}

/** 转换后端 url 为 SPA 路由;不可导航(#、空、javascript:)返回 undefined */
export function toReactRoute(oldUrl: string | undefined): string | undefined {
  if (!oldUrl || oldUrl === '#' || oldUrl.startsWith('javascript:')) return undefined
  return URL_MAP[oldUrl] || oldUrl
}
