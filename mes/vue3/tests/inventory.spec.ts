import { describe, it, expect } from 'vitest'
import {
  receiptStatusMeta,
  outboundStatusMeta,
  postStatusMeta,
  progressText,
  progressPercent,
  locationAvailability,
  locationOptionLabel,
  buildOccupancyMap,
  validateManualInbound,
  buildManualInboundPayload,
} from '@/utils/inventory'

describe('receiptStatusMeta', () => {
  it('pending → 待确认/warning', () => expect(receiptStatusMeta('pending')).toEqual({ label: '待确认', tag: 'warning' }))
  it('partial → 部分登账/primary', () => expect(receiptStatusMeta('partial')).toEqual({ label: '部分登账', tag: 'primary' }))
  it('completed → 已完成/success', () => expect(receiptStatusMeta('completed')).toEqual({ label: '已完成', tag: 'success' }))
  it('未知 → 原值/info', () => expect(receiptStatusMeta('x')).toEqual({ label: 'x', tag: 'info' }))
  it('空 → 占位符/info', () => expect(receiptStatusMeta(undefined)).toEqual({ label: '—', tag: 'info' }))
})

describe('outboundStatusMeta', () => {
  it('pending', () => expect(outboundStatusMeta('pending')).toEqual({ label: '待确认', tag: 'warning' }))
  it('partial → 部分出库', () => expect(outboundStatusMeta('partial')).toEqual({ label: '部分出库', tag: 'primary' }))
  it('completed', () => expect(outboundStatusMeta('completed')).toEqual({ label: '已完成', tag: 'success' }))
})

describe('postStatusMeta', () => {
  it('pending → 待登账', () => expect(postStatusMeta('pending')).toEqual({ label: '待登账', tag: 'warning' }))
  it('posted → 已登账', () => expect(postStatusMeta('posted')).toEqual({ label: '已登账', tag: 'success' }))
  it('未知 → info', () => expect(postStatusMeta(undefined)).toEqual({ label: '—', tag: 'info' }))
})

describe('progressText', () => {
  it('正常', () => expect(progressText(2, 5)).toBe('2/5'))
  it('缺省补 0', () => expect(progressText(undefined, undefined)).toBe('0/0'))
})

describe('progressPercent', () => {
  it('四舍五入', () => expect(progressPercent(1, 3)).toBe(33))
  it('total<=0 不除零', () => expect(progressPercent(1, 0)).toBe(0))
})

describe('locationAvailability', () => {
  it('无占用 → empty', () => expect(locationAvailability(undefined, 'M1')).toBe('empty'))
  it('同物料 → same', () => expect(locationAvailability('M1', 'M1')).toBe('same'))
  it('他物料 → other', () => expect(locationAvailability('M2', 'M1')).toBe('other'))
})

describe('locationOptionLabel', () => {
  it('空闲', () => expect(locationOptionLabel('A-1', undefined, 'M1')).toBe('A-1 · 空闲'))
  it('可累加', () => expect(locationOptionLabel('A-1', 'M1', 'M1')).toBe('A-1 · 已存本物料·可累加'))
  it('被占', () => expect(locationOptionLabel('A-1', 'M2', 'M1')).toBe('A-1 · 已占 M2'))
})

describe('buildOccupancyMap', () => {
  it('locationId → materialCode', () => {
    const m = buildOccupancyMap([
      { locationId: 'L1', materialCode: 'M1', quantity: 5 },
      { locationId: 'L2', materialCode: 'M2', quantity: 3 },
    ])
    expect(m).toEqual({ L1: 'M1', L2: 'M2' })
  })
  it('忽略无 locationId 与 0 量', () => {
    const m = buildOccupancyMap([
      { locationId: undefined, materialCode: 'M1', quantity: 5 },
      { locationId: 'L2', materialCode: 'M2', quantity: 0 },
    ])
    expect(m).toEqual({})
  })
  it('同库位取首个占用者', () => {
    const m = buildOccupancyMap([
      { locationId: 'L1', materialCode: 'M1', quantity: 5 },
      { locationId: 'L1', materialCode: 'M9', quantity: 1 },
    ])
    expect(m).toEqual({ L1: 'M1' })
  })
})

describe('validateManualInbound', () => {
  it('物料编码必填', () => expect(validateManualInbound({})).toBe('请输入物料编码'))
  it('库房必填', () => expect(validateManualInbound({ materialCode: 'M' })).toBe('请选择库房'))
  it('库位必填', () => expect(validateManualInbound({ materialCode: 'M', warehouseId: 'W' })).toBe('请选择库位'))
  it('数量须为正', () => expect(validateManualInbound({ materialCode: 'M', warehouseId: 'W', locationId: 'L', quantity: 0 })).toBe('数量须为正数'))
  it('合法 → null', () => expect(validateManualInbound({ materialCode: 'M', warehouseId: 'W', locationId: 'L', quantity: 2 })).toBeNull())
})

describe('buildManualInboundPayload', () => {
  it('trim + 数值化 + 缺省空串', () => {
    expect(buildManualInboundPayload({ materialCode: ' M1 ', warehouseId: 'W', locationId: 'L', quantity: '3' as unknown as number }))
      .toEqual({ materialCode: 'M1', materialDesc: '', unit: '', warehouseId: 'W', locationId: 'L', quantity: 3 })
  })
})
