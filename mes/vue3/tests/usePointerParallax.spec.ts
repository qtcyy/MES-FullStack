import { describe, it, expect, vi, afterEach } from 'vitest'
import { pointerFraction, parallaxDisabled } from '@/composables/usePointerParallax'

describe('pointerFraction', () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 }

  it('画面正中返回 0,0', () => {
    expect(pointerFraction(100, 50, rect)).toEqual({ fx: 0, fy: 0 })
  })

  it('左上角返回 -0.5,-0.5', () => {
    expect(pointerFraction(0, 0, rect)).toEqual({ fx: -0.5, fy: -0.5 })
  })

  it('右下角返回 0.5,0.5', () => {
    expect(pointerFraction(200, 100, rect)).toEqual({ fx: 0.5, fy: 0.5 })
  })

  it('计算时减去元素自身偏移', () => {
    expect(
      pointerFraction(150, 80, { left: 100, top: 60, width: 100, height: 40 }),
    ).toEqual({ fx: 0, fy: 0 })
  })

  it('零尺寸 rect 时返回 0,0 不抛错', () => {
    expect(pointerFraction(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({
      fx: 0,
      fy: 0,
    })
  })
})

describe('parallaxDisabled', () => {
  afterEach(() => vi.unstubAllGlobals())

  function stubMatchMedia(map: Record<string, boolean>) {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: !!map[q] }))
  }

  it('无 matchMedia(如 SSR)时禁用', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(parallaxDisabled()).toBe(true)
  })

  it('prefers-reduced-motion 时禁用', () => {
    stubMatchMedia({ '(prefers-reduced-motion: reduce)': true })
    expect(parallaxDisabled()).toBe(true)
  })

  it('触屏(coarse pointer)时禁用', () => {
    stubMatchMedia({ '(pointer: coarse)': true })
    expect(parallaxDisabled()).toBe(true)
  })

  it('精确指针且未要求减少动效时启用', () => {
    stubMatchMedia({})
    expect(parallaxDisabled()).toBe(false)
  })
})
