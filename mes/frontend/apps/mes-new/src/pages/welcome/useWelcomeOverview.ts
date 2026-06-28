import { useQuery$ } from '@/http/hooks'
import { fetchOverview } from '@/api/digitization/dashboard'
import { resolveOverview } from './welcomeData'
import type { DashboardOverview } from '@/types/digitization'

export interface WelcomeOverviewResult {
  overview: DashboardOverview | undefined
  loading: boolean
  isFallback: boolean
}

/** 工作台总览取数:成功用真实,失败回退 mock,加载中 overview=undefined */
export function useWelcomeOverview(): WelcomeOverviewResult {
  const { data, loading, error } = useQuery$(['welcome', 'overview'], () => fetchOverview())
  const { overview, isFallback } = resolveOverview(data, error)
  return { overview, loading: loading && !overview, isFallback }
}
