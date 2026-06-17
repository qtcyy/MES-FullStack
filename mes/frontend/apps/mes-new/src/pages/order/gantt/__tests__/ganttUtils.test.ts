import { describe, it, expect } from 'vitest'
import {
  parseDay, getDisplayStatus, computeRange, daysBetween, timeToX,
  groupByResource, groupByOrder, enumerateDays, taskBars, DAY_MS,
  pxToDays, shiftPlanByDays,
} from '../ganttUtils'
import type { GanttTask } from '@/types/order'

function task(over: Partial<GanttTask>): GanttTask {
  return {
    id: 't', orderId: 'o', orderCode: 'GD', materiel: 'M', qty: 1, orderType: 'P', orderStatue: 2,
    operId: 'op', operName: '装配', teamId: 'team', teamName: '班组', userId: 'u', userName: '张三',
    dispatchStatus: 1, ...over,
  }
}
const NOW = parseDay('2026-06-17')!

describe('parseDay', () => {
  it('解析 yyyy-MM-dd', () => { expect(parseDay('2026-06-10')).toBe(new Date(2026, 5, 10).getTime()) })
  it('忽略时间后缀', () => { expect(parseDay('2026-06-10 08:30:00')).toBe(new Date(2026, 5, 10).getTime()) })
  it('空/非法 → null', () => {
    expect(parseDay('')).toBeNull()
    expect(parseDay(undefined)).toBeNull()
    expect(parseDay('abc')).toBeNull()
    expect(parseDay('2026-13-40')).toBeNull()
  })
})

describe('getDisplayStatus', () => {
  it('有实际完工 → completed', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-10', actualEndTime: '2026-06-12' }), NOW)).toBe('completed')
  })
  it('已开工且未超期 → inProgress', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-15', planEndTime: '2026-06-18' }), NOW)).toBe('inProgress')
  })
  it('已开工且计划完工早于今天 → overdue', () => {
    expect(getDisplayStatus(task({ actualStartTime: '2026-06-15', planEndTime: '2026-06-16' }), NOW)).toBe('overdue')
  })
  it('未开工 → notStarted', () => {
    expect(getDisplayStatus(task({ planStartTime: '2026-06-18', planEndTime: '2026-06-20' }), NOW)).toBe('notStarted')
  })
})

describe('daysBetween & timeToX', () => {
  it('同一天 → 0', () => {
    const d = parseDay('2026-06-10')!
    expect(daysBetween(d, d)).toBe(0)
    expect(timeToX(d, d, 44)).toBe(0)
  })
  it('相隔2天 × 44px = 88', () => {
    const a = parseDay('2026-06-10')!
    const b = parseDay('2026-06-12')!
    expect(daysBetween(a, b)).toBe(2)
    expect(timeToX(b, a, 44)).toBe(88)
  })
})

describe('computeRange', () => {
  it('min-1天 .. max+1天', () => {
    const tasks = [
      task({ planStartTime: '2026-06-10', planEndTime: '2026-06-15' }),
      task({ planStartTime: '2026-06-12', planEndTime: '2026-06-20' }),
    ]
    const r = computeRange(tasks, NOW)
    expect(r.startMs).toBe(parseDay('2026-06-09'))
    expect(r.endMs).toBe(parseDay('2026-06-21'))
  })
  it('空 → now ± 3天', () => {
    const r = computeRange([], NOW)
    expect(r.startMs).toBe(NOW - 3 * DAY_MS)
    expect(r.endMs).toBe(NOW + 3 * DAY_MS)
  })
})

describe('groupByResource', () => {
  it('按 班组→作业员 分组,保持出现顺序', () => {
    const tasks = [
      task({ id: 'a', teamId: 'T1', teamName: '班A', userId: 'U1', userName: '宋' }),
      task({ id: 'b', teamId: 'T1', teamName: '班A', userId: 'U1', userName: '宋' }),
      task({ id: 'c', teamId: 'T1', teamName: '班A', userId: 'U2', userName: '猴' }),
      task({ id: 'd', teamId: 'T2', teamName: '班B', userId: 'U3', userName: '明' }),
    ]
    const g = groupByResource(tasks)
    expect(g.map(x => x.label)).toEqual(['班A', '班B'])
    expect(g[0].rows.map(r => r.label)).toEqual(['宋', '猴'])
    expect(g[0].rows[0].tasks.map(t => t.id)).toEqual(['a', 'b'])
  })
})

describe('groupByOrder', () => {
  it('按 订单→工序 分组,工序按计划开始排序并带序号', () => {
    const tasks = [
      task({ id: 'a', orderId: 'O1', orderCode: 'GD1', operName: '测试', planStartTime: '2026-06-13' }),
      task({ id: 'b', orderId: 'O1', orderCode: 'GD1', operName: '装配', planStartTime: '2026-06-10' }),
    ]
    const g = groupByOrder(tasks)
    expect(g).toHaveLength(1)
    expect(g[0].label).toBe('GD1')
    expect(g[0].rows.map(r => r.label)).toEqual(['① 装配', '② 测试'])
    expect(g[0].rows[0].tasks[0].id).toBe('b')
  })
})

describe('enumerateDays', () => {
  it('枚举闭区间每一天(含首尾),且全部落在本地午夜', () => {
    const days = enumerateDays(parseDay('2026-06-09')!, parseDay('2026-06-12')!)
    expect(days).toEqual([
      parseDay('2026-06-09'), parseDay('2026-06-10'), parseDay('2026-06-11'), parseDay('2026-06-12'),
    ])
  })
  it('start==end → 单日', () => {
    const d = parseDay('2026-06-10')!
    expect(enumerateDays(d, d)).toEqual([d])
  })
})

describe('taskBars', () => {
  const RS = parseDay('2026-06-09')!

  it('计划+实际双条像素盒(完工)', () => {
    const t = task({ planStartTime: '2026-06-10', planEndTime: '2026-06-12', actualStartTime: '2026-06-10', actualEndTime: '2026-06-13' })
    const b = taskBars(t, RS, 44, NOW)
    expect(b.plan).toEqual({ left: 44, width: 132 })   // left=1天, width=(2+1)天
    expect(b.actual).toEqual({ left: 44, width: 176 })  // width=(3+1)天
  })
  it('单日任务宽度=1天', () => {
    const b = taskBars(task({ planStartTime: '2026-06-10', planEndTime: '2026-06-10' }), RS, 44, NOW)
    expect(b.plan).toEqual({ left: 44, width: 44 })
  })
  it('进行中(无实际完工)实际条延伸到今天', () => {
    const t = task({ planStartTime: '2026-06-15', planEndTime: '2026-06-18', actualStartTime: '2026-06-15' })
    const b = taskBars(t, RS, 44, NOW)
    expect(b.actual).toEqual({ left: 264, width: 132 }) // 06-15..floor(06-17)=(2+1)天
  })
  it('脏数据 planEnd<planStart → 计划条 clamp 为非负(M-1)', () => {
    const b = taskBars(task({ planStartTime: '2026-06-15', planEndTime: '2026-06-10' }), RS, 44, NOW)
    expect(b.plan).toEqual({ left: 264, width: 44 })
    expect(b.plan!.width).toBeGreaterThan(0)
  })
})

describe('pxToDays', () => {
  it('四舍五入到天', () => {
    expect(pxToDays(0, 44)).toBe(0)
    expect(pxToDays(44, 44)).toBe(1)
    expect(pxToDays(21, 44)).toBe(0)   // <半天 → 0
    expect(pxToDays(23, 44)).toBe(1)   // >半天 → 1
    expect(pxToDays(-44, 44)).toBe(-1)
  })
})

describe('shiftPlanByDays', () => {
  const base = (over: Partial<GanttTask> = {}) =>
    task({ planStartTime: '2026-06-10', planEndTime: '2026-06-12', ...over })

  it('move 平移两端,保持工期', () => {
    expect(shiftPlanByDays(base(), 2, 'move')).toEqual({ planStartTime: '2026-06-12', planEndTime: '2026-06-14' })
  })
  it('move 保留时分秒后缀', () => {
    const r = shiftPlanByDays(base({ planStartTime: '2026-06-10 08:30:00', planEndTime: '2026-06-12 17:00:00' }), 1, 'move')
    expect(r).toEqual({ planStartTime: '2026-06-11 08:30:00', planEndTime: '2026-06-13 17:00:00' })
  })
  it('move 负 delta', () => {
    expect(shiftPlanByDays(base(), -1, 'move')).toEqual({ planStartTime: '2026-06-09', planEndTime: '2026-06-11' })
  })
  it('resize-start 只动开始', () => {
    expect(shiftPlanByDays(base(), 1, 'resize-start')).toEqual({ planStartTime: '2026-06-11', planEndTime: '2026-06-12' })
  })
  it('resize-start clamp 不越过结束(最多到同一天)', () => {
    expect(shiftPlanByDays(base(), 5, 'resize-start')).toEqual({ planStartTime: '2026-06-12', planEndTime: '2026-06-12' })
  })
  it('resize-end 只动结束', () => {
    expect(shiftPlanByDays(base(), 2, 'resize-end')).toEqual({ planStartTime: '2026-06-10', planEndTime: '2026-06-14' })
  })
  it('resize-end clamp 不早于开始', () => {
    expect(shiftPlanByDays(base(), -5, 'resize-end')).toEqual({ planStartTime: '2026-06-10', planEndTime: '2026-06-10' })
  })
})
