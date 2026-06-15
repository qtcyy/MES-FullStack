import { describe, it, expect } from 'vitest'
import { buildFormBody, shouldFormEncode } from '@/http/formBody'

describe('buildFormBody', () => {
  it('将普通对象转为 URLSearchParams', () => {
    const p = buildFormBody({ current: 1, size: 10, nameLike: '张' })
    expect(p.get('current')).toBe('1')
    expect(p.get('size')).toBe('10')
    expect(p.get('nameLike')).toBe('张')
  })

  it('跳过 undefined / null', () => {
    const p = buildFormBody({ a: 1, b: undefined, c: null })
    expect(p.has('b')).toBe(false)
    expect(p.has('c')).toBe(false)
    expect(p.get('a')).toBe('1')
  })

  it('数组用重复键展开', () => {
    const p = buildFormBody({ sysRoleIds: ['r1', 'r2'] })
    expect(p.getAll('sysRoleIds')).toEqual(['r1', 'r2'])
  })
})

describe('shouldFormEncode', () => {
  it('普通对象且非 json 头 → true', () => {
    expect(shouldFormEncode({ a: 1 }, '')).toBe(true)
  })
  it('显式 application/json → false', () => {
    expect(shouldFormEncode({ a: 1 }, 'application/json')).toBe(false)
  })
  it('FormData / URLSearchParams / null → false', () => {
    expect(shouldFormEncode(new FormData(), '')).toBe(false)
    expect(shouldFormEncode(new URLSearchParams(), '')).toBe(false)
    expect(shouldFormEncode(null, '')).toBe(false)
  })
})
