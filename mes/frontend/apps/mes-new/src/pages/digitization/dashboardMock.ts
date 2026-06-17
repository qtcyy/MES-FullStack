import type { NameValue } from '@/types/digitization'

/** 演示:设备综合效率 OEE(%) */
export const mockOeeValue = 87.2

/** 演示:良品率/不良率 12 月趋势 */
export const mockQuality: { months: string[]; yieldRate: number[]; defectRate: number[] } = {
  months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  yieldRate: [97.2, 97.8, 98.1, 97.5, 98.4, 98.0, 98.6, 98.2, 98.9, 98.5, 99.0, 98.7],
  defectRate: [2.8, 2.2, 1.9, 2.5, 1.6, 2.0, 1.4, 1.8, 1.1, 1.5, 1.0, 1.3],
}

/** 演示:各车间产量 */
export const mockWorkshop: NameValue[] = [
  { name: '冲压', value: 180 },
  { name: '焊接', value: 145 },
  { name: '涂装', value: 168 },
  { name: '总装', value: 205 },
  { name: '机加', value: 132 },
]
