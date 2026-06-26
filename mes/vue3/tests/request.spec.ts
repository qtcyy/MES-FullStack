// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { toFormUrlEncoded, unwrapResult } from '@/api/request'

describe('toFormUrlEncoded', () => {
  it('把平铺对象编码为 urlencoded 字符串', () => {
    expect(toFormUrlEncoded({ a: 1, b: 'x' })).toBe('a=1&b=x')
  })
  it('跳过 undefined/null 值', () => {
    expect(toFormUrlEncoded({ a: 1, b: undefined, c: null })).toBe('a=1')
  })
  it('对特殊字符进行 URL 编码', () => {
    expect(toFormUrlEncoded({ q: 'a b&c' })).toBe('q=a+b%26c')
  })
})

describe('toFormUrlEncoded 数组', () => {
  it('数组追加为重复键', () => {
    expect(toFormUrlEncoded({ a: 1, ids: ['x', 'y'] })).toBe('a=1&ids=x&ids=y')
  })
  it('数组内 null/undefined 元素跳过', () => {
    expect(toFormUrlEncoded({ ids: ['x', null, undefined, 'y'] })).toBe('ids=x&ids=y')
  })
})

describe('unwrapResult', () => {
  it('code=0 返回 data', () => {
    expect(unwrapResult({ code: 0, data: { id: '1' }, msg: 'ok' })).toEqual({ id: '1' })
  })
  it('code!=0 抛出携带 msg 的错误', () => {
    expect(() => unwrapResult({ code: 1, data: null, msg: '失败' })).toThrowError('失败')
  })
})
