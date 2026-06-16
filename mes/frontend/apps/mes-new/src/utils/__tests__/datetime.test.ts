import { describe, it, expect } from 'vitest'
import { toDatetimeLocal, fromDatetimeLocal } from '../datetime'

describe('toDatetimeLocal', () => {
  it('后端字符串→datetime-local(取到分钟)', () => {
    expect(toDatetimeLocal('2026-06-16 08:30:00')).toBe('2026-06-16T08:30')
  })
  it('空值返回空串', () => {
    expect(toDatetimeLocal()).toBe('')
    expect(toDatetimeLocal('')).toBe('')
  })
  it('非法格式返回空串', () => {
    expect(toDatetimeLocal('abc')).toBe('')
  })
})

describe('fromDatetimeLocal', () => {
  it('datetime-local→后端字符串(补秒)', () => {
    expect(fromDatetimeLocal('2026-06-16T08:30')).toBe('2026-06-16 08:30:00')
  })
  it('已带秒则保留', () => {
    expect(fromDatetimeLocal('2026-06-16T08:30:45')).toBe('2026-06-16 08:30:45')
  })
  it('空/非法返回空串', () => {
    expect(fromDatetimeLocal()).toBe('')
    expect(fromDatetimeLocal('xyz')).toBe('')
  })
})
