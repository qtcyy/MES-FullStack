/**
 * Maps old FreeMarker backend URLs to new React Router paths.
 * The backend menu tree returns URLs like /admin/sys/user/list-ui,
 * but the React SPA uses routes like /system/user.
 */

// Old URL → New Route
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
  '/technology/bom/list-ui': '/technology/bom',
  '/basedata/flow/list-ui': '/technology/flow',
  '/basedata/flow/process/list-ui': '/technology/flowprocess',
  '/order/release/list-ui': '/order/production',
  '/digitization/plan/plan-ui': '/digitization/plan',
  '/digital/simulation/list-ui': '/digitization/simulation',
}

/**
 * Convert an old FreeMarker URL to a new React route.
 * Returns undefined for non-navigable URLs (e.g., "#", empty, javascript:void).
 */
export function toReactRoute(oldUrl: string | undefined): string | undefined {
  if (!oldUrl || oldUrl === '#' || oldUrl.startsWith('javascript:')) return undefined
  return URL_MAP[oldUrl] || oldUrl
}

/**
 * Given a React route, find the corresponding old URL (for reverse lookup).
 * Used to match the current route back to a menu key.
 */
export function toOldUrl(route: string): string | undefined {
  for (const [old, next] of Object.entries(URL_MAP)) {
    if (next === route) return old
  }
  return undefined
}
