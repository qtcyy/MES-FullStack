/** 节点语义配色（方向 A：语义鲜明 / 填充色）。详见 spec §3。 */
export type ThemeMode = 'light' | 'dark'
export interface NodeColor {
  stroke: string
  fill: string
}

type Category = 'start' | 'end' | 'task' | 'gateway'

const PALETTE: Record<Category, Record<ThemeMode, NodeColor>> = {
  start: {
    light: { stroke: '#059669', fill: '#d1fae5' },
    dark: { stroke: '#34d399', fill: 'rgba(16,185,129,.18)' },
  },
  end: {
    light: { stroke: '#e11d48', fill: '#ffe4e6' },
    dark: { stroke: '#fb7185', fill: 'rgba(244,63,94,.18)' },
  },
  task: {
    light: { stroke: '#2563eb', fill: '#dbeafe' },
    dark: { stroke: '#60a5fa', fill: 'rgba(59,130,246,.20)' },
  },
  gateway: {
    light: { stroke: '#d97706', fill: '#fef3c7' },
    dark: { stroke: '#fbbf24', fill: 'rgba(245,158,11,.18)' },
  },
}

/** 连线描边色（中性灰） */
export const FLOW_STROKE: Record<ThemeMode, string> = {
  light: '#64748b',
  dark: '#7c8699',
}

function categoryOf(type: string): Category | null {
  if (type === 'bpmn:StartEvent') return 'start'
  if (type === 'bpmn:EndEvent') return 'end'
  if (type.includes('Gateway')) return 'gateway'
  if (type.includes('Task')) return 'task'
  return null
}

/** 按节点类型 + 主题返回语义配色；未覆盖类型返回 null（交回默认渲染）。 */
export function colorFor(type: string | undefined, mode: ThemeMode): NodeColor | null {
  if (!type) return null
  const cat = categoryOf(type)
  return cat ? PALETTE[cat][mode] : null
}

/** 读取当前主题模式：html 带 .dark 类即暗色。 */
export function currentMode(): ThemeMode {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark'
  }
  return 'light'
}
