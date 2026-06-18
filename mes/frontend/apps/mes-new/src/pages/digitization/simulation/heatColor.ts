/** 空库位/无数据色 */
const EMPTY_COLOR = '#6b7280'

/** 在库量热力梯度停靠点：占比 → [r,g,b]（深蓝→青→黄→橙→红） */
const STOPS: [number, [number, number, number]][] = [
  [0, [30, 64, 175]],
  [0.25, [6, 182, 212]],
  [0.5, [234, 179, 8]],
  [0.75, [249, 115, 22]],
  [1, [220, 38, 38]],
]

/** 按在库量相对全局最大值返回热力色；qty<=0 或 globalMax<=0 → 灰 */
export function heatColor(qty: number, globalMax: number): string {
  if (!(qty > 0) || !(globalMax > 0)) return EMPTY_COLOR
  const r = Math.max(0, Math.min(1, qty / globalMax))
  let i = 0
  while (i < STOPS.length - 1 && r > STOPS[i + 1][0]) i++
  const [t0, c0] = STOPS[i]
  const [t1, c1] = STOPS[Math.min(i + 1, STOPS.length - 1)]
  const f = t1 === t0 ? 0 : (r - t0) / (t1 - t0)
  const ch = (k: number) => Math.round(c0[k] + (c1[k] - c0[k]) * f)
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`
}
