import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { COLORS } from './theme'
import { useCountUp } from './useCountUp'
import type { KpiDatum } from './mockData'

interface KpiCardProps {
  datum: KpiDatum
  index: number
}

const cardStyle: CSSProperties = {
  flex: 1,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 4,
  padding: '10px 18px',
  background: 'linear-gradient(135deg, rgba(20,60,110,0.5), rgba(10,30,60,0.3))',
  border: `1px solid ${COLORS.panelBorder}`,
  borderRadius: 8,
  boxShadow: 'inset 0 0 16px rgba(30,144,255,0.15)',
  overflow: 'hidden',
}

export default function KpiCard({ datum, index }: KpiCardProps) {
  const display = useCountUp(datum.value, datum.decimals)
  const up = datum.trend === 'up'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: 'inset 0 0 16px rgba(30,144,255,0.25), 0 0 14px rgba(0,212,255,0.3)' }}
      style={cardStyle}
    >
      {/* 左侧色条 */}
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: datum.color, boxShadow: `0 0 10px ${datum.color}` }} />

      <span style={{ color: COLORS.textSub, fontSize: 'clamp(11px, 0.8vw, 14px)', letterSpacing: 1 }}>
        {datum.label}
      </span>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontSize: 'clamp(22px, 2vw, 40px)',
            fontWeight: 700,
            color: datum.color,
            textShadow: `0 0 14px ${datum.color}99`,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {datum.decimals > 0 ? display.toFixed(datum.decimals) : display.toLocaleString()}
        </span>
        <span style={{ color: COLORS.textSub, fontSize: 'clamp(11px, 0.8vw, 14px)' }}>{datum.unit}</span>
      </div>

      <span style={{ fontSize: 'clamp(10px, 0.75vw, 13px)', color: up ? COLORS.green : COLORS.red }}>
        {up ? '▲' : '▼'} {datum.delta} <span style={{ color: COLORS.textSub }}>同比</span>
      </span>
    </motion.div>
  )
}
