/** 浮动窗几何纯函数 */

export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface Geometry {
  x: number
  y: number
  w: number
  h: number
}

export interface SizeConstraints {
  minW: number
  minH: number
  maxW: number
  maxH: number
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi)
}

/** 把窗口约束在视口内：先夹宽高，再夹位置使其完全可见 */
export function clampToViewport(geom: Geometry, vw: number, vh: number): Geometry {
  const w = clamp(geom.w, 0, vw)
  const h = clamp(geom.h, 0, vh)
  const x = clamp(geom.x, 0, Math.max(0, vw - w))
  const y = clamp(geom.y, 0, Math.max(0, vh - h))
  return { x, y, w, h }
}

/**
 * 按方向缩放：对侧边锚定（拖西边则右边固定、拖北边则底边固定），
 * 夹在 min/max 之间，最后 clampToViewport 兜底。
 * dx/dy 为相对拖拽起点 start 的累计位移。
 */
export function resizeGeometry(
  start: Geometry,
  dir: ResizeDir,
  dx: number,
  dy: number,
  c: SizeConstraints,
  vw: number,
  vh: number,
): Geometry {
  let { x, y, w, h } = start
  const right = start.x + start.w
  const bottom = start.y + start.h

  if (dir.includes('e')) {
    w = clamp(start.w + dx, c.minW, c.maxW)
  }
  if (dir.includes('w')) {
    w = clamp(start.w - dx, c.minW, c.maxW)
    x = right - w
  }
  if (dir.includes('s')) {
    h = clamp(start.h + dy, c.minH, c.maxH)
  }
  if (dir.includes('n')) {
    h = clamp(start.h - dy, c.minH, c.maxH)
    y = bottom - h
  }

  return clampToViewport({ x, y, w, h }, vw, vh)
}
