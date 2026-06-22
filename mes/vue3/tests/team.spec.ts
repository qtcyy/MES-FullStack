import { describe, it, expect } from 'vitest'
import {
  parseWorkdays,
  formatWorkdays,
  workdaysLabel,
  validateTeam,
  buildTeamPayload,
  teamUserToTransferItem,
  teamToTransferItem,
} from '@/utils/team'

describe('parseWorkdays', () => {
  it('CSV → 数组,去空白去空段保序', () => {
    expect(parseWorkdays('3, 1 ,2')).toEqual(['3', '1', '2'])
  })
  it('空/undefined → []', () => {
    expect(parseWorkdays('')).toEqual([])
    expect(parseWorkdays(undefined)).toEqual([])
  })
})

describe('formatWorkdays', () => {
  it('数组 → CSV,过滤非法/去重/数值升序', () => {
    expect(formatWorkdays(['3', '1', '2', '1', '9'])).toBe('1,2,3')
  })
  it('空 → 空串', () => {
    expect(formatWorkdays([])).toBe('')
    expect(formatWorkdays(undefined)).toBe('')
  })
})

describe('workdaysLabel', () => {
  it('CSV → 中文升序空格连接', () => {
    expect(workdaysLabel('2,1')).toBe('周一 周二')
  })
  it('空/全非法 → -', () => {
    expect(workdaysLabel('')).toBe('-')
    expect(workdaysLabel('9,0')).toBe('-')
  })
})

describe('validateTeam', () => {
  it('code/name 必填', () => {
    expect(validateTeam({ code: '', name: '' })).toContain('班组代码必填')
    expect(validateTeam({ code: 'BZ', name: '' })).toContain('班组名称必填')
  })
  it('齐全 → []', () => {
    expect(validateTeam({ code: 'BZ', name: '班组1' })).toEqual([])
  })
})

describe('buildTeamPayload', () => {
  it('workdays 数组转 CSV、剥空串、保留 id', () => {
    expect(
      buildTeamPayload({ id: 'x', code: 'BZ', name: '班组1', startTime: '08:00', endTime: '', workdays: ['2', '1'], descr: undefined }),
    ).toEqual({ id: 'x', code: 'BZ', name: '班组1', startTime: '08:00', workdays: '1,2' })
  })
  it('空 workdays 不出现在 payload', () => {
    expect(buildTeamPayload({ code: 'BZ', name: '班组1', workdays: [] })).toEqual({ code: 'BZ', name: '班组1' })
  })
})

describe('teamUserToTransferItem', () => {
  it('primary=name, secondary=username', () => {
    expect(teamUserToTransferItem({ id: 'u1', name: '张三', username: 'zs' })).toEqual({
      id: 'u1',
      primary: '张三',
      secondary: 'zs',
    })
  })
})

describe('teamToTransferItem', () => {
  it('primary=name, secondary=code', () => {
    expect(teamToTransferItem({ id: 't1', name: '班组1', code: 'BZ001' })).toEqual({
      id: 't1',
      primary: '班组1',
      secondary: 'BZ001',
    })
  })
})
