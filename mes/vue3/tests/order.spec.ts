import { describe, it, expect } from 'vitest'
import {
  buildOrderPayload,
  validateOrder,
  orderTypeLabel,
  orderStatusMeta,
  buildDispatchPayload,
  validateDispatch,
} from '@/utils/order'

describe('buildOrderPayload', () => {
  it('剥空串、qty 数值化、保留 id', () => {
    const p = buildOrderPayload({ id: 'o1', orderCode: 'OD1', qty: '5' as unknown as number, orderDescription: '', orderType: 'P', materiel: 'M1' })
    expect(p).toEqual({ id: 'o1', orderCode: 'OD1', qty: 5, orderType: 'P', materiel: 'M1' })
  })
  it('新增无 id', () => {
    const p = buildOrderPayload({ orderCode: 'OD2', qty: 1, orderType: 'A', materiel: 'M2' })
    expect(p.id).toBeUndefined()
  })
})

describe('validateOrder', () => {
  it('编码必填', () => { expect(validateOrder({ qty: 1, orderType: 'P', materiel: 'M' })).toBe('请输入工单编号') })
  it('数量须为正', () => { expect(validateOrder({ orderCode: 'O', qty: 0, orderType: 'P', materiel: 'M' })).toBe('数量须为正整数') })
  it('类型必填', () => { expect(validateOrder({ orderCode: 'O', qty: 1, materiel: 'M' })).toBe('请选择工单类型') })
  it('物料必填', () => { expect(validateOrder({ orderCode: 'O', qty: 1, orderType: 'P' })).toBe('请选择物料') })
  it('合法返回空串', () => { expect(validateOrder({ orderCode: 'O', qty: 1, orderType: 'P', materiel: 'M' })).toBe('') })
})

describe('orderTypeLabel', () => {
  it('映射 P/A/F', () => {
    expect(orderTypeLabel('P')).toBe('量产')
    expect(orderTypeLabel('A')).toBe('验证')
    expect(orderTypeLabel('F')).toBe('返工')
    expect(orderTypeLabel('X')).toBe('X')
  })
})

describe('orderStatusMeta', () => {
  it('0→待派工 warning', () => { expect(orderStatusMeta(0)).toEqual({ label: '待派工', tag: 'warning' }) })
  it('3→已结束 success', () => { expect(orderStatusMeta(3)).toEqual({ label: '已结束', tag: 'success' }) })
  it('未知→info', () => { expect(orderStatusMeta(9).tag).toBe('info') })
})

describe('buildDispatchPayload', () => {
  it('组装 orderIds + 剥空可选项', () => {
    const p = buildDispatchPayload(['a', 'b'], { teamId: 't1', userId: 'u1', laborHours: 8, planStartTime: '', remark: '' })
    expect(p).toEqual({ orderIds: ['a', 'b'], teamId: 't1', userId: 'u1', laborHours: 8 })
  })
})

describe('validateDispatch', () => {
  it('未选工单', () => { expect(validateDispatch([], { teamId: 't', userId: 'u', laborHours: 8 })).toBe('请至少选择一张工单') })
  it('未选班组', () => { expect(validateDispatch(['a'], { teamId: '', userId: 'u', laborHours: 8 })).toBe('请选择班组') })
  it('未选作业员', () => { expect(validateDispatch(['a'], { teamId: 't', userId: '', laborHours: 8 })).toBe('请选择作业员') })
  it('工时须为正', () => { expect(validateDispatch(['a'], { teamId: 't', userId: 'u', laborHours: 0 })).toBe('工时须大于 0') })
  it('合法空串', () => { expect(validateDispatch(['a'], { teamId: 't', userId: 'u', laborHours: 8 })).toBe('') })
})
