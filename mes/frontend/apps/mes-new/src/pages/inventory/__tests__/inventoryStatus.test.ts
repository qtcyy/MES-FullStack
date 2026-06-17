import { describe, it, expect } from 'vitest'
import {
  receiptStatusMeta,
  outboundStatusMeta,
  postStatusMeta,
  progressText,
  progressPercent,
  locationAvailability,
  locationOptionLabel,
} from '../inventoryStatus'

describe('receiptStatusMeta', () => {
  it('pending → 待确认', () => { expect(receiptStatusMeta('pending').label).toBe('待确认') })
  it('partial → 部分登账', () => { expect(receiptStatusMeta('partial').label).toBe('部分登账') })
  it('completed → 已完成', () => { expect(receiptStatusMeta('completed').label).toBe('已完成') })
  it('未知值 → 原值', () => { expect(receiptStatusMeta('foo').label).toBe('foo') })
  it('空值 → —', () => { expect(receiptStatusMeta(undefined).label).toBe('—') })
})

describe('outboundStatusMeta', () => {
  it('pending → 待确认', () => { expect(outboundStatusMeta('pending').label).toBe('待确认') })
  it('partial → 部分出库', () => { expect(outboundStatusMeta('partial').label).toBe('部分出库') })
  it('completed → 已完成', () => { expect(outboundStatusMeta('completed').label).toBe('已完成') })
  it('空值 → —', () => { expect(outboundStatusMeta(undefined).label).toBe('—') })
})

describe('postStatusMeta', () => {
  it('pending → 待登账', () => { expect(postStatusMeta('pending').label).toBe('待登账') })
  it('posted → 已登账', () => { expect(postStatusMeta('posted').label).toBe('已登账') })
  it('空值 → —', () => { expect(postStatusMeta(undefined).label).toBe('—') })
})

describe('progressText', () => {
  it('正常', () => { expect(progressText(3, 8)).toBe('3/8') })
  it('空值按 0', () => { expect(progressText(undefined, undefined)).toBe('0/0') })
})

describe('progressPercent', () => {
  it('3/8 → 38', () => { expect(progressPercent(3, 8)).toBe(38) })
  it('total 0 → 0(不除零)', () => { expect(progressPercent(0, 0)).toBe(0) })
  it('全部完成 → 100', () => { expect(progressPercent(8, 8)).toBe(100) })
})

describe('locationAvailability', () => {
  it('无占用 → empty', () => { expect(locationAvailability(undefined, 'PART-001')).toBe('empty') })
  it('空串占用 → empty', () => { expect(locationAvailability('', 'PART-001')).toBe('empty') })
  it('同物料 → same', () => { expect(locationAvailability('PART-001', 'PART-001')).toBe('same') })
  it('他物料 → other', () => { expect(locationAvailability('PART-007', 'PART-001')).toBe('other') })
})

describe('locationOptionLabel', () => {
  it('空闲', () => { expect(locationOptionLabel('1-0101', undefined, 'PART-001')).toBe('1-0101 · 空闲') })
  it('可累加', () => { expect(locationOptionLabel('1-0101', 'PART-001', 'PART-001')).toBe('1-0101 · 已存本物料·可累加') })
  it('已占他物料', () => { expect(locationOptionLabel('1-0102', 'PART-007', 'PART-001')).toBe('1-0102 · 已占 PART-007') })
})
