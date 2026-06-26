import { describe, it, expect } from 'vitest'
import { advance } from '@/utils/typewriter'

describe('advance', () => {
  it('每次推进 step 个字符', () => {
    expect(advance(0, 100, 5)).toBe(5)
    expect(advance(5, 100, 5)).toBe(10)
  })

  it('不超过目标长度', () => {
    expect(advance(98, 100, 5)).toBe(100)
  })

  it('已达目标则保持', () => {
    expect(advance(100, 100, 5)).toBe(100)
  })

  it('目标缩短（新一轮回复）时夹到目标', () => {
    expect(advance(50, 10, 5)).toBe(10)
  })
})
