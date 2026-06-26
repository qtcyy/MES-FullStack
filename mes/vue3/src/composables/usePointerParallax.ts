import { ref, type Ref } from 'vue'

/** 把指针位置换算成相对画面中心的偏移(范围 [-0.5, 0.5]),纯函数便于单测 */
export function pointerFraction(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { fx: number; fy: number } {
  if (rect.width <= 0 || rect.height <= 0) return { fx: 0, fy: 0 }
  return {
    fx: (clientX - rect.left) / rect.width - 0.5,
    fy: (clientY - rect.top) / rect.height - 0.5,
  }
}

/** 是否应禁用视差:无 matchMedia / 要求减少动效 / 触屏 */
export function parallaxDisabled(): boolean {
  const mm = typeof globalThis !== 'undefined' ? globalThis.matchMedia : undefined
  if (typeof mm !== 'function') return true
  return mm('(prefers-reduced-motion: reduce)').matches || mm('(pointer: coarse)').matches
}

/**
 * 鼠标视差 composable:把容器内的指针移动换算成 fx/fy(响应式),
 * 由组件决定把它放大成多少 px、作用到哪一层。自动尊重降级条件。
 */
export function usePointerParallax(target: Ref<HTMLElement | undefined>) {
  const fx = ref(0)
  const fy = ref(0)
  const disabled = parallaxDisabled()
  let raf = 0
  let pending: { x: number; y: number } | null = null

  function onPointerMove(e: MouseEvent) {
    if (disabled || !target.value) return
    pending = { x: e.clientX, y: e.clientY }
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const el = target.value
      if (!pending || !el) return
      const { fx: nx, fy: ny } = pointerFraction(pending.x, pending.y, el.getBoundingClientRect())
      fx.value = nx
      fy.value = ny
    })
  }

  function onPointerLeave() {
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    pending = null
    fx.value = 0
    fy.value = 0
  }

  return { fx, fy, disabled, onPointerMove, onPointerLeave }
}
