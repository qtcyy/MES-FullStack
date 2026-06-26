import { describe, it, expect } from 'vitest'
import { pointerFraction } from './usePointerParallax'

const rect = { left: 0, top: 0, width: 200, height: 100 } as DOMRect

describe('pointerFraction', () => {
  it('中心点返回 (0, 0)', () => {
    const { fx, fy } = pointerFraction(100, 50, rect)
    expect(fx).toBeCloseTo(0)
    expect(fy).toBeCloseTo(0)
  })

  it('右下角返回 (0.5, 0.5)', () => {
    const { fx, fy } = pointerFraction(200, 100, rect)
    expect(fx).toBeCloseTo(0.5)
    expect(fy).toBeCloseTo(0.5)
  })

  it('左上角返回 (-0.5, -0.5)', () => {
    const { fx, fy } = pointerFraction(0, 0, rect)
    expect(fx).toBeCloseTo(-0.5)
    expect(fy).toBeCloseTo(-0.5)
  })

  it('超出边界时裁剪到 [-0.5, 0.5]', () => {
    const { fx, fy } = pointerFraction(400, -100, rect)
    expect(fx).toBeCloseTo(0.5)
    expect(fy).toBeCloseTo(-0.5)
  })

  it('width 为 0 时不返回 NaN', () => {
    const zero = { left: 0, top: 0, width: 0, height: 0 } as DOMRect
    const { fx, fy } = pointerFraction(10, 10, zero)
    expect(fx).toBe(0)
    expect(fy).toBe(0)
  })
})
