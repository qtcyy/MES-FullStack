import { describe, it, expect } from 'vitest'
import { toSpaRoute } from '@/utils/urlMap'

describe('toSpaRoute', () => {
  it('已知后端 url 翻译为干净路由', () => {
    expect(toSpaRoute('/admin/sys/user/list-ui')).toBe('/system/user')
    expect(toSpaRoute('/admin/sys/dict/list-ui')).toBe('/system/dict')
    expect(toSpaRoute('/admin/sys/role/list-ui')).toBe('/system/role')
    expect(toSpaRoute('/admin/sys/menu/list-ui')).toBe('/system/menu')
    expect(toSpaRoute('/admin/sys/department/list-ui')).toBe('/system/department')
    expect(toSpaRoute('/admin/welcome-ui')).toBe('/welcome')
  })
  it('未知 url 原样返回', () => {
    expect(toSpaRoute('/welcome')).toBe('/welcome')
  })
  it('不可导航 → undefined', () => {
    expect(toSpaRoute('#')).toBeUndefined()
    expect(toSpaRoute('')).toBeUndefined()
    expect(toSpaRoute(undefined)).toBeUndefined()
    expect(toSpaRoute('javascript:void(0)')).toBeUndefined()
  })
})
