import { describe, it, expect } from 'vitest'
import { isResult, BusinessError } from '@/http/result'

describe('isResult', () => {
  it('识别 Result 形状', () => {
    expect(isResult({ code: 0, data: 1, msg: 'ok' })).toBe(true)
  })
  it('非 Result 返回 false', () => {
    expect(isResult({ records: [] })).toBe(false)
    expect(isResult(null)).toBe(false)
    expect(isResult('text')).toBe(false)
  })
})

describe('BusinessError', () => {
  it('携带 code 与 message', () => {
    const e = new BusinessError(500, '出错了')
    expect(e.code).toBe(500)
    expect(e.message).toBe('出错了')
    expect(e).toBeInstanceOf(Error)
  })
})
