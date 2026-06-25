import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DUR, EASE } from '@/lib/motion'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
}

/** 淡入 + 上移的单元素入场；reduced-motion 下渲染静态内容 */
export default function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out, delay }}
    >
      {children}
    </motion.div>
  )
}
