export interface Weekday {
  value: string
  label: string
}

/** 周一(1)..周日(7) */
export const WEEKDAYS: Weekday[] = [
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
  { value: '7', label: '周日' },
]

const LABEL_MAP: Record<string, string> = Object.fromEntries(
  WEEKDAYS.map((w) => [w.value, w.label]),
)

const isValidDay = (v: string): boolean => /^[1-7]$/.test(v)

/** CSV "3, 1 ,2" → ['3','1','2']:去空白、去空段、保序 */
export function parseWorkdays(csv?: string): string[] {
  if (!csv) return []
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** ['3','1','2'] → "1,2,3":过滤非法值、去重、数值升序;空 → '' */
export function formatWorkdays(days?: string[]): string {
  if (!days || days.length === 0) return ''
  const uniq = Array.from(new Set(days.map((d) => d.trim()).filter(isValidDay)))
  uniq.sort((a, b) => Number(a) - Number(b))
  return uniq.join(',')
}

/** CSV → "周一 周二 周三"(升序、空格连接);空/全非法 → '-' */
export function workdaysLabel(csv?: string): string {
  const labels = parseWorkdays(csv)
    .filter(isValidDay)
    .sort((a, b) => Number(a) - Number(b))
    .map((v) => LABEL_MAP[v])
  return labels.length > 0 ? labels.join(' ') : '-'
}
