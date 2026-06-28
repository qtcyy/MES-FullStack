import { describe, it, expect } from 'vitest'
import { ACCENTS, getAccent } from './accents'

describe('accents', () => {
  it('包含 5 个强调色,主色均为合法 hex', () => {
    const names = Object.keys(ACCENTS)
    expect(names).toHaveLength(5)
    for (const n of names) {
      expect(ACCENTS[n as keyof typeof ACCENTS].color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('getAccent 返回对应项', () => {
    expect(getAccent('blue').color).toBe('#2f7cff')
    expect(getAccent('emerald').color).toBe('#10b981')
  })

  it('getAccent 对未知名兜底 blue', () => {
    expect(getAccent('nope' as never).color).toBe('#2f7cff')
  })
})
