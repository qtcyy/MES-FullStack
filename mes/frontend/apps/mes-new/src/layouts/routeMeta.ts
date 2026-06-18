import type { TreeVO, SysMenu } from '@/types/menu'
import { toReactRoute } from '@/utils/urlMap'

/** 已实现路由的标签/页头元信息(标题与可选图标) */
export const ROUTE_META: Record<string, { title: string; icon?: string }> = {
  '/welcome': { title: '工作台', icon: 'home' },
  // 系统管理
  '/system/user': { title: '用户管理', icon: 'user' },
  '/system/role': { title: '角色管理', icon: 'team' },
  '/system/menu': { title: '菜单管理', icon: 'menu' },
  '/system/dict': { title: '字典管理', icon: 'database' },
  '/system/department': { title: '部门管理', icon: 'apartment' },
  '/system/team': { title: '班组员工定义', icon: 'team' },
  // 基础数据
  '/basedata/component': { title: '元器件管理', icon: 'block' },
  '/basedata/materile': { title: '物料管理', icon: 'gold' },
  '/basedata/device-group': { title: '设备组管理', icon: 'cluster' },
  '/basedata/process-unit': { title: '工艺单元管理', icon: 'deployment-unit' },
  '/basedata/warehouse': { title: '仓库管理', icon: 'bank' },
  '/basedata/oper': { title: '工序管理', icon: 'tool' },
  // 工艺
  '/technology/flow': { title: '工艺路线管理', icon: 'branches' },
  '/technology/product-bom': { title: '产品BOM管理', icon: 'apartment' },
  '/technology/process-flow': { title: '工艺流程管理', icon: 'branches' },
  '/technology/process-content': { title: '工艺内容编制', icon: 'file-text' },
  '/technology/process-query': { title: '产品工艺查询', icon: 'file-text' },
  // 计划/订单
  '/order/production': { title: '生产订单', icon: 'schedule' },
  '/order/dispatch': { title: '作业派工', icon: 'team' },
  '/order/gantt': { title: '生产甘特图', icon: 'schedule' },
}

/** 在菜单树中按 SPA 路由反查菜单名(用于 ROUTE_META 未登记的路由兜底) */
function findMenuName(nodes: TreeVO<SysMenu>[] | undefined, path: string): string | undefined {
  if (!nodes) return undefined
  for (const n of nodes) {
    if (n.url && toReactRoute(n.url) === path) return n.name
    const hit = findMenuName(n.children, path)
    if (hit) return hit
  }
  return undefined
}

/**
 * 解析某路由的标签元信息。
 * 优先 ROUTE_META;其次从菜单树按路由反查名称;再兜底用路径末段。
 * 保证任意已导航路由都能记录标签,避免"未登记 → 静默不记录"。
 */
export function resolveTabMeta(
  path: string,
  menuInfo: Record<string, TreeVO<SysMenu>> | null,
): { title: string; icon?: string } {
  const meta = ROUTE_META[path]
  if (meta) return meta
  const name = menuInfo ? findMenuName(Object.values(menuInfo), path) : undefined
  if (name) return { title: name }
  const seg = path.split('/').filter(Boolean).pop()
  return { title: seg ?? path }
}
