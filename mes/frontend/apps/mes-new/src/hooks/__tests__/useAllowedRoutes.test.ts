import { describe, it, expect } from 'vitest'
import { computeAllowedRoutes } from '@/hooks/useAllowedRoutes'
import type { TreeVO, SysMenu } from '@/types/menu'

function node(url: string | undefined, children?: TreeVO<SysMenu>[]): TreeVO<SysMenu> {
  return { id: url ?? 'x', name: url ?? 'x', url, children }
}

describe('computeAllowedRoutes', () => {
  it('始终包含白名单 /welcome 与 /403', () => {
    const set = computeAllowedRoutes(null)
    expect(set.has('/welcome')).toBe(true)
    expect(set.has('/403')).toBe(true)
  })

  it('递归收集菜单 url 映射后的 SPA 路由', () => {
    const menuInfo: Record<string, TreeVO<SysMenu>> = {
      system: node('#', [node('/admin/sys/user/list-ui')]),
    }
    const set = computeAllowedRoutes(menuInfo)
    expect(set.has('/system/user')).toBe(true)
    // 不可导航的占位 url(#)不纳入
    expect(set.has('#')).toBe(false)
  })

  it('未授权页面不在集合内', () => {
    const menuInfo: Record<string, TreeVO<SysMenu>> = {
      system: node('#', [node('/admin/sys/user/list-ui')]),
    }
    const set = computeAllowedRoutes(menuInfo)
    expect(set.has('/system/role')).toBe(false)
  })
})
