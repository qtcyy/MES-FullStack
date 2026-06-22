import { describe, it, expect } from 'vitest'
import {
  validateDevice,
  buildDevicePayload,
  validateComponent,
  buildComponentPayload,
  validateGroup,
  buildGroupPayload,
  excludeSelected,
  diffMembers,
  deviceToTransferItem,
} from '@/utils/device'

describe('validateDevice', () => {
  it('code/name 必填', () => {
    expect(validateDevice({ code: '', name: '' })).toContain('设备编码必填')
    expect(validateDevice({ code: 'D1', name: '' })).toContain('设备名称必填')
  })
  it('齐全 → 空数组', () => {
    expect(validateDevice({ code: 'D1', name: '车床' })).toEqual([])
  })
})

describe('buildDevicePayload', () => {
  it('剥空串字段、保留 id', () => {
    expect(buildDevicePayload({ id: 'x', code: 'D1', name: '车床', model: '', specs: undefined })).toEqual({
      id: 'x',
      code: 'D1',
      name: '车床',
    })
  })
  it('无 id 不带 id 键', () => {
    expect(buildDevicePayload({ code: 'D1', name: '车床' })).toEqual({ code: 'D1', name: '车床' })
  })
})

describe('validateComponent', () => {
  it('code/name 必填', () => {
    expect(validateComponent({ code: '', name: 'x' })).toContain('零部件编码必填')
    expect(validateComponent({ code: 'C1', name: '' })).toContain('零部件名称必填')
  })
  it('齐全 → 空数组', () => expect(validateComponent({ code: 'C1', name: '螺栓' })).toEqual([]))
})

describe('buildComponentPayload', () => {
  it('剥空串、保留 id', () =>
    expect(buildComponentPayload({ id: 'c', code: 'C1', name: '螺栓', descr: '' })).toEqual({
      id: 'c',
      code: 'C1',
      name: '螺栓',
    }))
})

describe('validateGroup', () => {
  it('code/name 必填', () => {
    expect(validateGroup({ code: '', name: 'g' })).toContain('编组编码必填')
    expect(validateGroup({ code: 'G1', name: '' })).toContain('编组名称必填')
  })
  it('齐全 → 空数组', () => expect(validateGroup({ code: 'G1', name: '组1' })).toEqual([]))
})

describe('buildGroupPayload', () => {
  it('剥空串、保留 id', () =>
    expect(buildGroupPayload({ id: 'g', code: 'G1', name: '组1', descr: '' })).toEqual({
      id: 'g',
      code: 'G1',
      name: '组1',
    }))
})

describe('excludeSelected', () => {
  it('剔除已选 id', () => {
    const all = [{ id: '1' }, { id: '2' }, { id: '3' }]
    expect(excludeSelected(all, new Set(['2'])).map((d) => d.id)).toEqual(['1', '3'])
  })
})

describe('diffMembers', () => {
  it('计算新增与移除', () => {
    expect(diffMembers(['a', 'b'], ['b', 'c'])).toEqual({ added: ['c'], removed: ['a'] })
  })
  it('无变化 → 空', () => expect(diffMembers(['a'], ['a'])).toEqual({ added: [], removed: [] }))
})

describe('deviceToTransferItem', () => {
  it('映射 id/name/code', () => {
    expect(deviceToTransferItem({ id: '1', code: 'D1', name: '车床' })).toEqual({
      id: '1',
      primary: '车床',
      secondary: 'D1',
    })
  })
  it('缺省兜底', () => {
    expect(deviceToTransferItem({ id: '1' })).toEqual({ id: '1', primary: '', secondary: '' })
  })
})
