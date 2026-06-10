// 科技蓝大屏主题 —— 颜色 / 尺寸 / ECharts 公共样式的单一可信源
import type { CSSProperties } from 'react'

export const COLORS = {
  // 背景
  bgGradient: 'radial-gradient(ellipse at top, #0a2a52 0%, #061325 70%)',
  bgSolid: '#061325',
  // 主色
  primary: '#00d4ff', // 青蓝发光
  primaryDeep: '#1565c0', // 渐变底
  // 辅色
  cyan: '#3bc9db',
  green: '#51cf66',
  orange: '#f59f00',
  red: '#f03e3e',
  purple: '#9775fa',
  // 文字
  text: '#c5e4ff',
  textSub: '#7fb5e0',
  label: '#5ad8ff',
  // 面板
  panelBg: 'rgba(20, 60, 110, 0.35)',
  panelBorder: '#1e5a9e',
  axis: '#2d4a6e',
} as const

// 面板外框基础样式（PanelFrame 使用）
export const panelBaseStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  background: COLORS.panelBg,
  border: `1px solid ${COLORS.panelBorder}`,
  borderRadius: 6,
  boxShadow: 'inset 0 0 18px rgba(30,144,255,0.18)',
  overflow: 'hidden',
  minHeight: 0,
}

// ECharts 坐标轴公共样式 —— 避免各图表重复
export function axisStyle(): Record<string, unknown> {
  return {
    axisLine: { lineStyle: { color: COLORS.axis } },
    axisLabel: { color: COLORS.textSub, fontSize: 11 },
    splitLine: { lineStyle: { color: COLORS.axis, opacity: 0.25 } },
    axisTick: { show: false },
  }
}

// 生成竖向渐变（柱状/面积常用）
export function vGradient(from: string, to: string) {
  return {
    type: 'linear' as const,
    x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0, color: from },
      { offset: 1, color: to },
    ],
  }
}
