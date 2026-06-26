import { describe, it, expect } from 'vitest'
import {
  parseDay, daysBetween, getDisplayStatus, computeRange, enumerateDays,
  timeToX, pxToDays, shiftPlanByDays, groupByResource, groupByOrder,
} from '@/utils/gantt'
import type { GanttTask } from '@/types/order'

const task = (o: Partial<GanttTask>): GanttTask => ({
  id: 'd1', orderId: 'o1', orderCode: 'OD1', dispatchStatus: 1, ...o,
})
const D = (s: string) => parseDay(s)!

describe('parseDay', () => {
  it('解析到本地 00:00 毫秒', () => {
    const ms = parseDay('2026-06-21 13:30:00')!
    const d = new Date(ms)
    expect(d.getHours()).toBe(0)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5)
    expect(d.getDate()).toBe(21)
  })
  it('空值返回 null', () => { expect(parseDay(undefined)).toBeNull(); expect(parseDay('')).toBeNull() })
  it('月份/日越界返回 null', () => {
    expect(parseDay('2026-13-01')).toBeNull()
    expect(parseDay('2026-06-32')).toBeNull()
  })
})

describe('daysBetween', () => {
  it('整天差', () => { expect(daysBetween(D('2026-06-21'), D('2026-06-24'))).toBe(3) })
})

describe('getDisplayStatus', () => {
  const now = D('2026-06-21')
  it('有实际完工=completed', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-10', actualEndTime: '2026-06-12' }), now)).toBe('completed')
  })
  it('已开工未逾期=inProgress', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-20', planEndTime: '2026-06-25' }), now)).toBe('inProgress')
  })
  it('已开工且今日超计划结束=overdue', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-10', planEndTime: '2026-06-15' }), now)).toBe('overdue')
  })
  it('未开工=notStarted', () => {
    expect(getDisplayStatus(task({ planStartTime: '2026-06-22', planEndTime: '2026-06-25' }), now)).toBe('notStarted')
  })
  it('已开工且今日恰为截止日=inProgress(当天不算逾期)', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-10', planEndTime: '2026-06-21' }), now)).toBe('inProgress')
  })
})

describe('computeRange', () => {
  it('空任务回退到 now±3 天', () => {
    const now = D('2026-06-21')
    const r = computeRange([], now)
    expect(daysBetween(r.startMs, now)).toBe(3)
    expect(daysBetween(now, r.endMs)).toBe(3)
  })
  it('覆盖全部计划/实际边界', () => {
    const now = D('2026-06-21')
    const r = computeRange([task({ planStartTime: '2026-06-10', planEndTime: '2026-06-15' })], now)
    expect(r.startMs).toBeLessThanOrEqual(D('2026-06-10'))
    expect(r.endMs).toBeGreaterThanOrEqual(D('2026-06-15'))
  })
})

describe('enumerateDays', () => {
  it('逐天枚举闭区间', () => {
    const days = enumerateDays(D('2026-06-21'), D('2026-06-23'))
    expect(days.length).toBe(3)
    expect(days[0]).toBe(D('2026-06-21'))
  })
})

describe('timeToX', () => {
  it('按天宽换算 x', () => {
    expect(timeToX(D('2026-06-23'), D('2026-06-21'), 44)).toBe(88)
  })
})

describe('pxToDays', () => {
  it('像素按天宽四舍五入', () => {
    expect(pxToDays(88, 44)).toBe(2)
    expect(pxToDays(60, 44)).toBe(1)
  })
})

describe('shiftPlanByDays', () => {
  const t = task({ planStartTime: '2026-06-21 08:30:00', planEndTime: '2026-06-23 17:00:00' })
  it('move 平移两端、保留时分秒', () => {
    const r = shiftPlanByDays(t, 2, 'move')
    expect(r.planStartTime).toBe('2026-06-23 08:30:00')
    expect(r.planEndTime).toBe('2026-06-25 17:00:00')
  })
  it('resize-end 只移结束', () => {
    const r = shiftPlanByDays(t, 1, 'resize-end')
    expect(r.planStartTime).toBe('2026-06-21 08:30:00')
    expect(r.planEndTime).toBe('2026-06-24 17:00:00')
  })
  it('resize-start 只移开始', () => {
    const r = shiftPlanByDays(t, 1, 'resize-start')
    expect(r.planStartTime).toBe('2026-06-22 08:30:00')
    expect(r.planEndTime).toBe('2026-06-23 17:00:00')
  })
  it('resize-end 不得越过开始(至少留1天)', () => {
    const r = shiftPlanByDays(t, -10, 'resize-end')
    expect(daysBetween(parseDay(r.planStartTime!)!, parseDay(r.planEndTime!)!)).toBeGreaterThanOrEqual(1)
  })
})

describe('groupByResource', () => {
  it('班组→作业员两层，保持插入序', () => {
    const groups = groupByResource([
      task({ id: 'a', teamId: 't1', teamName: '班A', userId: 'u1', userName: '张' }),
      task({ id: 'b', teamId: 't1', teamName: '班A', userId: 'u1', userName: '张' }),
      task({ id: 'c', teamId: 't2', teamName: '班B', userId: 'u2', userName: '李' }),
    ])
    expect(groups.length).toBe(2)
    expect(groups[0].label).toBe('班A')
    expect(groups[0].rows.length).toBe(1)
    expect(groups[0].rows[0].tasks.length).toBe(2)
  })
})

describe('groupByOrder', () => {
  it('订单→工序，按 planStartTime 排序', () => {
    const groups = groupByOrder([
      task({ id: 'a', orderId: 'o1', orderCode: 'OD1', operName: '工序2', planStartTime: '2026-06-22' }),
      task({ id: 'b', orderId: 'o1', orderCode: 'OD1', operName: '工序1', planStartTime: '2026-06-20' }),
    ])
    expect(groups.length).toBe(1)
    expect(groups[0].rows[0].tasks[0].operName).toBe('工序1')
  })
})
