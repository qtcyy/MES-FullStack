import type { Variants } from 'motion/react'

/** 与 styles.css 的 --ease-* 对齐的缓动（cubic-bezier 控制点） */
export const EASE = {
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  out: [0, 0, 0.2, 1] as [number, number, number, number],
  spring: [0.16, 1, 0.3, 1] as [number, number, number, number],
}

/** 与 --dur-* 对齐的时长（秒，framer-motion 用秒） */
export const DUR = { fast: 0.16, base: 0.24, slow: 0.36 }

/** 容器：梯级编排子项 */
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
}

/** 配合 staggerContainer 的子项 */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } },
}
