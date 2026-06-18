import { describe, it, expect } from 'vitest'
import { heatColor } from '../heatColor'

const EMPTY = '#6b7280'

describe('heatColor', () => {
  it('空库位/非正数量 → 灰', () => {
    expect(heatColor(0, 100)).toBe(EMPTY)
    expect(heatColor(-5, 100)).toBe(EMPTY)
  })
  it('globalMax<=0 → 灰', () => {
    expect(heatColor(10, 0)).toBe(EMPTY)
  })
  it('满载(qty=max) → 红', () => {
    expect(heatColor(100, 100)).toBe('rgb(220, 38, 38)')
  })
  it('超过 max → 钳到红', () => {
    expect(heatColor(200, 100)).toBe('rgb(220, 38, 38)')
  })
  it('半载(0.5) → 黄', () => {
    expect(heatColor(50, 100)).toBe('rgb(234, 179, 8)')
  })
  it('1/4 载(0.25) → 青', () => {
    expect(heatColor(25, 100)).toBe('rgb(6, 182, 212)')
  })
})
