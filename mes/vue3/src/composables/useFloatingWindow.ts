import { reactive, ref, computed, onUnmounted } from 'vue'
import {
  clampToViewport,
  resizeGeometry,
  type Geometry,
  type ResizeDir,
  type SizeConstraints,
} from '@/utils/floatingWindow'

/**
 * 浮动窗交互状态机：持有响应式 geometry，提供拖拽 / 八方向缩放的 pointer 处理。
 * geometry 在调用方（AiAssistant）持有 → 开关期间位置/尺寸保留。
 */
export function useFloatingWindow(initial: Geometry, constraints: SizeConstraints) {
  const geom = reactive<Geometry>({ ...initial })
  const dragging = ref(false)

  const style = computed(() => ({
    left: `${geom.x}px`,
    top: `${geom.y}px`,
    width: `${geom.w}px`,
    height: `${geom.h}px`,
  }))

  /** 启动一次拖动会话：记录指针起点，move 时回调累计位移，up 时清理监听 */
  function beginSession(e: PointerEvent, onMove: (dx: number, dy: number) => void) {
    e.preventDefault()
    dragging.value = true
    const startX = e.clientX
    const startY = e.clientY
    const move = (ev: PointerEvent) => onMove(ev.clientX - startX, ev.clientY - startY)
    const up = () => {
      dragging.value = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function startDrag(e: PointerEvent) {
    const base = { x: geom.x, y: geom.y, w: geom.w, h: geom.h }
    beginSession(e, (dx, dy) => {
      const next = clampToViewport(
        { x: base.x + dx, y: base.y + dy, w: base.w, h: base.h },
        window.innerWidth,
        window.innerHeight,
      )
      geom.x = next.x
      geom.y = next.y
    })
  }

  function startResize(e: PointerEvent, dir: ResizeDir) {
    e.stopPropagation()
    const base = { x: geom.x, y: geom.y, w: geom.w, h: geom.h }
    beginSession(e, (dx, dy) => {
      const next = resizeGeometry(base, dir, dx, dy, constraints, window.innerWidth, window.innerHeight)
      geom.x = next.x
      geom.y = next.y
      geom.w = next.w
      geom.h = next.h
    })
  }

  onUnmounted(() => {
    dragging.value = false
  })

  return { geom, dragging, style, startDrag, startResize }
}
