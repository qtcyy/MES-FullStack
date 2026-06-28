export type AccentName = 'blue' | 'cyan' | 'violet' | 'amber' | 'emerald'

export interface Accent {
  /** 主色:图标、强调条、图表主色 */
  color: string
  /** 浅色 tint 背景:图标底 */
  bg: string
}

export const ACCENTS: Record<AccentName, Accent> = {
  blue: { color: '#2f7cff', bg: 'rgba(47,124,255,0.10)' },
  cyan: { color: '#36e0ff', bg: 'rgba(54,224,255,0.12)' },
  violet: { color: '#7c5cff', bg: 'rgba(124,92,255,0.12)' },
  amber: { color: '#ff9f43', bg: 'rgba(255,159,67,0.14)' },
  emerald: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

/** 取强调色,缺失兜底 blue */
export function getAccent(name: AccentName): Accent {
  return ACCENTS[name] ?? ACCENTS.blue
}
