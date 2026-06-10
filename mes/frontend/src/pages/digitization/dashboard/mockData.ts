// 全部大屏 mock 数据集中于此，带 TS 类型 —— 将来接真实 API 只改本文件

export interface KpiDatum {
  key: string
  label: string
  value: number
  unit: string
  decimals: number
  trend: 'up' | 'down'
  delta: string // 同比，如 "+12.5%"
  color: string
}

export interface NameValue {
  name: string
  value: number
}

// ---- 顶部 KPI ----
export const kpis: KpiDatum[] = [
  { key: 'output', label: '本年总产量', value: 2265, unit: '万件', decimals: 0, trend: 'up', delta: '+12.5%', color: '#00d4ff' },
  { key: 'complete', label: '计划完成率', value: 95.6, unit: '%', decimals: 1, trend: 'up', delta: '+1.8%', color: '#51cf66' },
  { key: 'yield', label: '综合良品率', value: 98.4, unit: '%', decimals: 1, trend: 'up', delta: '+0.6%', color: '#3bc9db' },
  { key: 'oee', label: '设备综合效率', value: 87.2, unit: '%', decimals: 1, trend: 'down', delta: '-0.4%', color: '#f59f00' },
]

// ---- 年度趋势 ----
export const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
export const planData = [120, 135, 150, 165, 180, 200, 190, 210, 195, 220, 240, 260]
export const orderData = [110, 128, 142, 158, 172, 190, 185, 200, 188, 210, 230, 250]
export const completionRate = [91.7, 94.8, 94.7, 95.8, 95.6, 95.0, 97.4, 95.2, 96.4, 95.5, 95.8, 96.2]

// ---- 各工厂产量 ----
export const factories = ['一厂', '二厂', '三厂', '四厂', '五厂', '六厂', '七厂']
export const factoryOutput = [420, 380, 510, 460, 390, 530, 470]

// ---- 各车间产量 ----
export const workshops = ['冲压', '焊接', '涂装', '总装', '机加', '热处理', '电镀', '质检']
export const workshopOutput = [180, 220, 160, 310, 195, 140, 125, 200]

// ---- 良品率 / 不良率 ----
export const yieldRate = [97.2, 97.5, 97.8, 98.1, 97.9, 98.3, 98.5, 98.2, 98.4, 98.6, 98.7, 98.9]
export const defectRate = [2.8, 2.5, 2.2, 1.9, 2.1, 1.7, 1.5, 1.8, 1.6, 1.4, 1.3, 1.1]

// ---- 地区对比 ----
export const regionNorth: NameValue[] = [
  { name: '北京', value: 285 },
  { name: '天津', value: 210 },
  { name: '河北', value: 175 },
]
export const regionEast: NameValue[] = [
  { name: '上海', value: 320 },
  { name: '江苏', value: 290 },
  { name: '浙江', value: 260 },
]
export const regionSouth: NameValue[] = [
  { name: '广东', value: 350 },
  { name: '福建', value: 195 },
  { name: '广西', value: 120 },
]

// ---- 设备仪表盘 ----
export interface GaugeDatum {
  name: string
  value: number
  max: number
  color: string
}
export const gauges: GaugeDatum[] = [
  { name: '主轴转速', value: 78, max: 100, color: '#00d4ff' },
  { name: '产线速度', value: 72, max: 100, color: '#3bc9db' },
  { name: '能耗指数', value: 62, max: 100, color: '#51cf66' },
  { name: '水位', value: 83, max: 100, color: '#9775fa' },
]
