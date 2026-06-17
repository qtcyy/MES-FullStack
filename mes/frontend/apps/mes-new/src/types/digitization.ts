/** 名称-数值项(饼/柱图) */
export interface NameValue {
  name: string
  value: number
}

/** 月度趋势点;month 为 yyyy-MM */
export interface MonthlyTrendPoint {
  month: string
  orderCount: number
  totalQty: number
  completedCount: number
}

/** 顶部 KPI 计数 */
export interface DashboardKpi {
  orderCount: number
  deviceCount: number
  materielCount: number
  flowCount: number
}

/** 大屏总览聚合(对应后端 DashboardOverviewVO) */
export interface DashboardOverview {
  kpi: DashboardKpi
  orderStatus: NameValue[]
  deviceStatus: NameValue[]
  orderType: NameValue[]
  monthlyTrend: MonthlyTrendPoint[]
}
