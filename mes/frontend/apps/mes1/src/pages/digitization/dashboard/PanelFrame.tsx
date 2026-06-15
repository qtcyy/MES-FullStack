import type { ReactNode, CSSProperties } from 'react'
import { motion } from 'motion/react'
import { COLORS, panelBaseStyle } from './theme'

interface PanelFrameProps {
  title: string
  children: ReactNode
  delay?: number // 错峰入场延迟（秒）
  style?: CSSProperties // 额外样式（如 flex 比例）
}

const titleBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderBottom: `1px solid rgba(94,216,255,0.25)`,
  flexShrink: 0,
}

const titleTextStyle: CSSProperties = {
  color: COLORS.label,
  fontSize: 'clamp(13px, 0.95vw, 17px)',
  fontWeight: 600,
  letterSpacing: 1,
  textShadow: '0 0 8px rgba(30,144,255,0.6)',
}

export default function PanelFrame({ title, children, delay = 0, style }: PanelFrameProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      whileHover={{ boxShadow: 'inset 0 0 18px rgba(30,144,255,0.25), 0 0 16px rgba(0,212,255,0.35)' }}
      style={{ ...panelBaseStyle, ...style }}
    >
      {/* 四角科技边角 */}
      <span className="dash-corner tl" />
      <span className="dash-corner tr" />
      <span className="dash-corner bl" />
      <span className="dash-corner br" />
      {/* 顶部流光扫描 */}
      <span className="dash-scan" />

      {/* 标题条 */}
      <div style={titleBarStyle}>
        <span
          style={{
            width: 4,
            height: 16,
            borderRadius: 2,
            background: COLORS.primary,
            boxShadow: `0 0 8px ${COLORS.primary}`,
          }}
        />
        <span style={titleTextStyle}>{title}</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'flex', gap: 4 }}>
          <i style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.primary, display: 'inline-block', boxShadow: `0 0 6px ${COLORS.primary}` }} />
          <i style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,212,255,0.4)', display: 'inline-block' }} />
          <i style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,212,255,0.2)', display: 'inline-block' }} />
        </span>
      </div>

      {/* 图表 body —— min-height:0 是 flex 嵌套 ECharts 不塌陷的关键 */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', padding: 6 }}>
        {children}
      </div>
    </motion.div>
  )
}
