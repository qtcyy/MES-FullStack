import { describe, it, expect } from 'vitest'
import {
  greetingByHour, deriveRecentVisits, resolveOverview, buildQuickActions,
} from './welcomeData'
import { MOCK_OVERVIEW } from './welcomeMock'
import type { TabItem } from '@/stores/appStore'
import type { DashboardOverview } from '@/types/digitization'

const tab = (path: string, title: string): TabItem => ({ key: path, path, title, closable: true })

describe('greetingByHour', () => {
  it('按时段返回问候语', () => {
    expect(greetingByHour(3)).toBe('夜深了')
    expect(greetingByHour(8)).toBe('早上好')
    expect(greetingByHour(10)).toBe('上午好')
    expect(greetingByHour(13)).toBe('中午好')
    expect(greetingByHour(16)).toBe('下午好')
    expect(greetingByHour(21)).toBe('晚上好')
  })
})

describe('deriveRecentVisits', () => {
  it('排除首页与当前页,最新在前', () => {
    const tabs = [
      tab('/welcome', '工作台'),
      tab('/system/user', '用户管理'),
      tab('/order/production', '生产订单'),
      tab('/basedata/materile', '物料管理'),
    ]
    const r = deriveRecentVisits(tabs, '/basedata/materile')
    expect(r.map((v) => v.path)).toEqual(['/order/production', '/system/user'])
  })

  it('限制数量', () => {
    const tabs = Array.from({ length: 10 }, (_, i) => tab(`/p/${i}`, `P${i}`))
    expect(deriveRecentVisits(tabs, '/none', 3)).toHaveLength(3)
  })
})

describe('resolveOverview', () => {
  it('有 data → 用真实', () => {
    const data = MOCK_OVERVIEW
    expect(resolveOverview(data, null)).toEqual({ overview: data, isFallback: false })
  })
  it('无 data 有 error → 回退 mock', () => {
    const r = resolveOverview(undefined, new Error('x'))
    expect(r.isFallback).toBe(true)
    expect(r.overview).toBe(MOCK_OVERVIEW)
  })
  it('无 data 无 error → undefined(加载中)', () => {
    expect(resolveOverview(undefined, null)).toEqual({ overview: undefined, isFallback: false })
  })
})

describe('buildQuickActions', () => {
  it('只保留 allowed 中的入口', () => {
    const allowed = new Set(['/order/production', '/technology/flow'])
    const actions = buildQuickActions(allowed)
    expect(actions.length).toBeGreaterThan(0)
    expect(actions.every((a) => allowed.has(a.to))).toBe(true)
  })
  it('空集合 → 空数组', () => {
    expect(buildQuickActions(new Set())).toEqual([])
  })
})

// 类型自检:resolveOverview 接受 DashboardOverview | undefined
const _typecheck: DashboardOverview | undefined = resolveOverview(undefined, null).overview
void _typecheck
