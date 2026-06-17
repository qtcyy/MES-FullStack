import { describe, it, expect } from 'vitest'
import {
  receiptStatusMeta,
  outboundStatusMeta,
  postStatusMeta,
  progressText,
  progressPercent,
} from '../inventoryStatus'

describe('receiptStatusMeta', () => {
  it('pending → 待确认', () => { expect(receiptStatusMeta('pending').label).toBe('待确认') })
  it('partial → 部分登账', () => { expect(receiptStatusMeta('partial').label).toBe('部分登账') })
  it('completed → 已完成', () => { expect(receiptStatusMeta('completed').label).toBe('已完成') })
  it('未知值 → 原值', () => { expect(receiptStatusMeta('foo').label).toBe('foo') })
  it('空值 → —', () => { expect(receiptStatusMeta(undefined).label).toBe('—') })
})

describe('outboundStatusMeta', () => {
  it('partial → 部分出库', () => { expect(outboundStatusMeta('partial').label).toBe('部分出库') })
  it('completed → 已完成', () => { expect(outboundStatusMeta('completed').label).toBe('已完成') })
})

describe('postStatusMeta', () => {
  it('pending → 待登账', () => { expect(postStatusMeta('pending').label).toBe('待登账') })
  it('posted → 已登账', () => { expect(postStatusMeta('posted').label).toBe('已登账') })
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
