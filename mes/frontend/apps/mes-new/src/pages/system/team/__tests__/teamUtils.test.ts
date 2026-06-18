import { describe, it, expect } from 'vitest'
import { WEEKDAYS, parseWorkdays, formatWorkdays, workdaysLabel } from '../teamUtils'

describe('WEEKDAYS', () => {
  it('含周一至周日共 7 项,值为 1..7', () => {
    expect(WEEKDAYS).toHaveLength(7)
    expect(WEEKDAYS.map((w) => w.value)).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    expect(WEEKDAYS[0].label).toBe('周一')
    expect(WEEKDAYS[6].label).toBe('周日')
  })
})

describe('parseWorkdays', () => {
  it('空/undefined → []', () => {
    expect(parseWorkdays(undefined)).toEqual([])
    expect(parseWorkdays('')).toEqual([])
  })
  it('CSV 拆分并去空白与空段,保序', () => {
    expect(parseWorkdays('3, 1 ,2')).toEqual(['3', '1', '2'])
    expect(parseWorkdays('1,,2,')).toEqual(['1', '2'])
  })
})

describe('formatWorkdays', () => {
  it('空/undefined → 空串', () => {
    expect(formatWorkdays(undefined)).toBe('')
    expect(formatWorkdays([])).toBe('')
  })
  it('数值升序、去重、过滤非法值', () => {
    expect(formatWorkdays(['3', '1', '2'])).toBe('1,2,3')
    expect(formatWorkdays(['2', '2', '1'])).toBe('1,2')
    expect(formatWorkdays(['8', '0', 'x', '5'])).toBe('5')
  })
})

describe('workdaysLabel', () => {
  it('空 → "-"', () => {
    expect(workdaysLabel(undefined)).toBe('-')
    expect(workdaysLabel('')).toBe('-')
  })
  it('CSV → 中文星期(升序,空格连接)', () => {
    expect(workdaysLabel('1,2,3,4,5')).toBe('周一 周二 周三 周四 周五')
    expect(workdaysLabel('7,6')).toBe('周六 周日')
  })
  it('忽略非法值', () => {
    expect(workdaysLabel('1,9,2')).toBe('周一 周二')
  })
})

describe('parse↔format 往返', () => {
  it('format(parse(csv)) 归一化为升序去重', () => {
    expect(formatWorkdays(parseWorkdays('3,1,2'))).toBe('1,2,3')
    expect(formatWorkdays(parseWorkdays('5,5,1'))).toBe('1,5')
  })
})
