import { useEffect, useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { COLORS } from './theme'

function useClock(): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  const w = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} 周${w} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

const sideStyle: CSSProperties = {
  flex: 1,
  color: COLORS.textSub,
  fontSize: 'clamp(12px, 0.85vw, 15px)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

export default function DashboardHeader() {
  const clock = useClock()
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 24px',
        position: 'relative',
      }}
    >
      <div style={sideStyle}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.green, boxShadow: `0 0 8px ${COLORS.green}` }} />
        系统运行中
      </div>

      <h1
        style={{
          margin: 0,
          flexShrink: 0,
          fontSize: 'clamp(20px, 1.8vw, 34px)',
          fontWeight: 700,
          letterSpacing: 4,
          color: '#eaf6ff',
          textShadow: '0 0 18px rgba(0,212,255,0.8), 0 0 4px rgba(0,212,255,0.9)',
          background: 'linear-gradient(180deg, #eaf6ff 0%, #5ad8ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        ◈ MES 生产指挥中心 ◈
      </h1>

      <div style={{ ...sideStyle, justifyContent: 'flex-end' }}>{clock}</div>

      {/* 底部装饰渐变线 */}
      <span
        style={{
          position: 'absolute',
          left: '10%',
          right: '10%',
          bottom: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
        }}
      />
    </motion.div>
  )
}
