import { useEffect, useState } from 'react'

/**
 * 轮播高亮 hook：每隔 intervalMs 让 activeIndex 在 [0, count) 间循环。
 * count<=0 时不启动定时器。
 */
export function useRotatingHighlight(count: number, intervalMs = 2800): number {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (count <= 0) return
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % count)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [count, intervalMs])

  return activeIndex
}
