import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/lib/motion'

interface StaggerProps {
  children: ReactNode
  className?: string
}

/** 容器：子项按 staggerChildren 梯级入场 */
export function Stagger({ children, className }: StaggerProps) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  )
}

/** 子项：须作为 Stagger 的直接子节点 */
export function StaggerItem({ children, className }: StaggerProps) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  )
}
