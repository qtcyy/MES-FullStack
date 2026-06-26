import { useEffect, useRef, useState } from 'react'

export interface Fraction { fx: number; fy: number }

const clamp = (n: number) => Math.max(-0.5, Math.min(0.5, n))

/** 把指针坐标归一化为相对元素中心的比例 [-0.5, 0.5]（纯函数，便于单测） */
export function pointerFraction(clientX: number, clientY: number, rect: DOMRect): Fraction {
  const fx = rect.width ? clamp((clientX - rect.left) / rect.width - 0.5) : 0
  const fy = rect.height ? clamp((clientY - rect.top) / rect.height - 0.5) : 0
  return { fx, fy }
}

/** 是否禁用视差：尊重 reduced-motion 偏好 + 触屏设备 */
function parallaxDisabled(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  )
}

/**
 * 鼠标视差 hook：返回 ref 与归一化的 fx/fy（调用方自行放大倍数）。
 * 用 requestAnimationFrame 节流，禁用条件下恒为 0。
 */
export function usePointerParallax<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [frac, setFrac] = useState<Fraction>({ fx: 0, fy: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el || parallaxDisabled()) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setFrac(pointerFraction(e.clientX, e.clientY, el.getBoundingClientRect()))
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return { ref, ...frac }
}
