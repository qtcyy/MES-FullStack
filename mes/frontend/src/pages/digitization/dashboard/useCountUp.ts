import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion/react'

/**
 * 数字滚动增长 hook。
 * @param target   目标值
 * @param decimals 小数位
 * @param duration 动画时长（秒）
 * @returns 当前显示值（已按 decimals 取整/截断）
 */
export function useCountUp(target: number, decimals = 0, duration = 1.2): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const controls = animate(fromRef.current, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        fromRef.current = v
        setValue(v)
      },
    })
    return () => controls.stop()
  }, [target, duration])

  return decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value)
}
