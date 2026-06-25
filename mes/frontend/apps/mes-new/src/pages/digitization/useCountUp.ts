import { useEffect, useRef, useState } from 'react'

/** 数字从上次值缓动滚动到 target;返回当前显示值。尊重 prefers-reduced-motion:直接返回目标值。 */
export function useCountUp(target: number, durationMs = 1200): number {
  const [val, setVal] = useState(0)
  const fromRef = useRef(0)
  const reduce =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduce) return // 减少动效:不做 rAF 动画,直接由下方 return 返回 target
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(from + (target - from) * eased)
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, reduce])

  return reduce ? target : val
}
