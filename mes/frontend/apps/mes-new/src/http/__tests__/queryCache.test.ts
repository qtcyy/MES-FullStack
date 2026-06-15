import { describe, it, expect, beforeEach } from 'vitest'
import {
  serializeKey,
  setCache,
  getCache,
  subscribeRefetch,
  invalidate,
  clearAll,
} from '@/http/queryCache'

beforeEach(() => clearAll())

describe('serializeKey', () => {
  it('稳定序列化', () => {
    expect(serializeKey(['sys', 'user', { current: 1 }])).toBe(
      JSON.stringify(['sys', 'user', { current: 1 }]),
    )
  })
})

describe('data cache', () => {
  it('存取数据', () => {
    setCache('k', { a: 1 })
    expect(getCache('k')).toEqual({ a: 1 })
  })
})

describe('invalidate(prefix) 触发匹配前缀的 refetcher', () => {
  it('只调用前缀匹配的订阅者', () => {
    const calls: string[] = []
    subscribeRefetch('["sys","user",1]', () => calls.push('user'))
    subscribeRefetch('["sys","role",1]', () => calls.push('role'))
    invalidate('["sys","user"')
    expect(calls).toEqual(['user'])
  })

  it('取消订阅后不再触发', () => {
    const calls: string[] = []
    const unsub = subscribeRefetch('["k"]', () => calls.push('k'))
    unsub()
    invalidate('["k"')
    expect(calls).toEqual([])
  })
})
