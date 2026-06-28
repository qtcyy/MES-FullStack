import type { TabItem } from '@/stores/appStore'
import type { DashboardOverview } from '@/types/digitization'
import { MOCK_OVERVIEW } from './welcomeMock'

/** 按小时返回问候语 */
export function greetingByHour(hour: number): string {
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export interface RecentVisit {
  path: string
  title: string
  icon?: string
}

/**
 * 从标签历史派生最近访问:
 * 排除首页与当前页;标签数组末尾为最新,故取末 limit 条再反转(最新在前)。
 */
export function deriveRecentVisits(
  tabs: TabItem[],
  currentPath: string,
  limit = 6,
): RecentVisit[] {
  return tabs
    .filter((t) => t.path !== '/welcome' && t.path !== currentPath)
    .slice(-limit)
    .reverse()
    .map((t) => ({ path: t.path, title: t.title, icon: t.icon }))
}

/**
 * overview 取数结果归一:
 * - 有 data → 用真实(isFallback=false)
 * - 无 data 但有 error → 用 mock(isFallback=true)
 * - 否则 undefined(仍在加载)
 */
export function resolveOverview(
  data: DashboardOverview | undefined,
  error: unknown,
): { overview: DashboardOverview | undefined; isFallback: boolean } {
  if (data) return { overview: data, isFallback: false }
  if (error) return { overview: MOCK_OVERVIEW, isFallback: true }
  return { overview: undefined, isFallback: false }
}

export interface QuickAction {
  label: string
  to: string
  /** iconMap 的语义 key */
  icon: string
}

/** 候选快捷入口(to 必须是真实已注册路由) */
const QUICK_ACTIONS: QuickAction[] = [
  { label: '生产订单', to: '/order/production', icon: 'schedule' },
  { label: '物料管理', to: '/basedata/materile', icon: 'gold' },
  { label: '工艺路线', to: '/technology/flow', icon: 'branches' },
  { label: '设备管理', to: '/basedata/device', icon: 'tool' },
  { label: '作业派工', to: '/order/dispatch', icon: 'team' },
  { label: '生产甘特图', to: '/order/gantt', icon: 'schedule' },
  { label: '工艺查询', to: '/technology/process-query', icon: 'file-text' },
  { label: '用户管理', to: '/system/user', icon: 'user' },
]

/** 过滤出当前用户可访问的快捷入口 */
export function buildQuickActions(allowed: Set<string>): QuickAction[] {
  return QUICK_ACTIONS.filter((a) => allowed.has(a.to))
}
