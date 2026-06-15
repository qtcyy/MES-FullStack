import { describe, it, expect } from 'vitest'
import { toReactRoute } from '@/utils/urlMap'

describe('toReactRoute', () => {
  it('映射已知后端 url 到 SPA 路由', () => {
    expect(toReactRoute('/admin/sys/user/list-ui')).toBe('/system/user')
    expect(toReactRoute('/admin/welcome-ui')).toBe('/welcome')
  })
  it('未知 url 原样返回', () => {
    expect(toReactRoute('/foo/bar')).toBe('/foo/bar')
  })
  it('不可导航 url 返回 undefined', () => {
    expect(toReactRoute('#')).toBeUndefined()
    expect(toReactRoute(undefined)).toBeUndefined()
    expect(toReactRoute('javascript:void(0)')).toBeUndefined()
  })
})
