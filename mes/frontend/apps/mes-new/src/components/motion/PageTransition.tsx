import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DUR, EASE } from '@/lib/motion'

interface PageTransitionProps {
  /** 路由 key（通常 location.pathname）；变化时重挂载并重放入场 */
  routeKey: string
  children: ReactNode
}

/**
 * 路由切换时的 fade-slide 入场动画。
 * 用 key 触发重挂载实现 enter-only（不用 AnimatePresence exit，规避 Outlet
 * 在退出/进入间显示同一内容的 stale 问题）。
 */
export default function PageTransition({ routeKey, children }: PageTransitionProps) {
  const reduce = useReducedMotion()
  if (reduce) return <div className="h-full">{children}</div>
  return (
    <motion.div
      key={routeKey}
      className="h-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out }}
    >
      {children}
    </motion.div>
  )
}
