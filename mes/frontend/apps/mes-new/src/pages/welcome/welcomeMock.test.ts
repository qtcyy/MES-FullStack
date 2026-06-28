import { describe, it, expect } from 'vitest'
import { MOCK_OVERVIEW, MOCK_TODOS, MOCK_ANNOUNCEMENTS } from './welcomeMock'

describe('welcomeMock', () => {
  it('MOCK_OVERVIEW 含完整 overview 字段', () => {
    expect(Object.keys(MOCK_OVERVIEW.kpi)).toEqual(
      expect.arrayContaining(['orderCount', 'deviceCount', 'materielCount', 'flowCount']),
    )
    expect(MOCK_OVERVIEW.orderStatus.length).toBeGreaterThan(0)
    expect(MOCK_OVERVIEW.deviceStatus.length).toBeGreaterThan(0)
    expect(MOCK_OVERVIEW.orderType.length).toBeGreaterThan(0)
    expect(MOCK_OVERVIEW.monthlyTrend.length).toBeGreaterThan(0)
  })

  it('待办/公告非空且字段齐全', () => {
    expect(MOCK_TODOS.length).toBeGreaterThan(0)
    expect(MOCK_TODOS[0]).toHaveProperty('type')
    expect(MOCK_ANNOUNCEMENTS[0]).toHaveProperty('tag')
  })
})
