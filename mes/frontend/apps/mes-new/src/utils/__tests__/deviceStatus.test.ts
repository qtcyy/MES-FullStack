import { describe, it, expect } from 'vitest'
import { deviceStatusMeta, deriveGroupStatusMeta } from '../deviceStatus'

describe('deviceStatusMeta', () => {
  it('0 → 空闲', () => { expect(deviceStatusMeta('0').label).toBe('空闲') })
  it('1 → 运行中', () => { expect(deviceStatusMeta('1').label).toBe('运行中') })
  it('2 → 维修中', () => { expect(deviceStatusMeta('2').label).toBe('维修中') })
  it('3 → 报废', () => { expect(deviceStatusMeta('3').label).toBe('报废') })
  it('未知值 → 原值', () => { expect(deviceStatusMeta('9').label).toBe('9') })
  it('空值 → —', () => { expect(deviceStatusMeta(undefined).label).toBe('—') })
})

describe('deriveGroupStatusMeta 主徽标优先级', () => {
  it('有运行中 → 占用中', () => {
    expect(deriveGroupStatusMeta({ runningCount: 1, repairCount: 1, idleCount: 1 }).meta.label).toBe('占用中')
  })
  it('无运行有维修 → 维修中', () => {
    expect(deriveGroupStatusMeta({ repairCount: 1, idleCount: 2 }).meta.label).toBe('维修中')
  })
  it('仅空闲 → 空闲', () => {
    expect(deriveGroupStatusMeta({ idleCount: 3 }).meta.label).toBe('空闲')
  })
  it('仅报废 → 报废', () => {
    expect(deriveGroupStatusMeta({ scrapCount: 2 }).meta.label).toBe('报废')
  })
  it('全空/无成员 → 无设备', () => {
    expect(deriveGroupStatusMeta({}).meta.label).toBe('无设备')
  })
})

describe('deriveGroupStatusMeta 明细', () => {
  it('只显示非零项,顺序 运行·维修·空闲·报废', () => {
    expect(deriveGroupStatusMeta({ runningCount: 1, repairCount: 1, idleCount: 1 }).detail).toBe('运行1·维修1·空闲1')
  })
  it('含报废', () => {
    expect(deriveGroupStatusMeta({ runningCount: 2, scrapCount: 1 }).detail).toBe('运行2·报废1')
  })
  it('全空闲', () => {
    expect(deriveGroupStatusMeta({ idleCount: 3 }).detail).toBe('空闲3')
  })
  it('无成员 → 空串', () => {
    expect(deriveGroupStatusMeta({}).detail).toBe('')
  })
})
