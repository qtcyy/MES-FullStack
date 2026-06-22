import { describe, it, expect } from 'vitest'
import {
  validateWarehouse,
  buildWarehousePayload,
  locationGridSummary,
  dimensionsChanged,
} from '@/utils/warehouse'

describe('validateWarehouse', () => {
  it('code/name 必填', () => {
    expect(validateWarehouse({ code: '', name: '', groups: 1, rows: 1, layers: 1, columns: 1 })).toContain('库房编码必填')
    expect(validateWarehouse({ code: 'W1', name: '', groups: 1, rows: 1, layers: 1, columns: 1 })).toContain('库房名称必填')
  })
  it('维度须为 ≥1 整数', () => {
    expect(validateWarehouse({ code: 'W1', name: '库', groups: 0, rows: 1, layers: 1, columns: 1 })).toContain('组须为 ≥1 的整数')
    expect(validateWarehouse({ code: 'W1', name: '库', groups: 1, rows: 1, layers: 1, columns: 1.5 })).toContain('列须为 ≥1 的整数')
  })
  it('齐全 → 空数组', () => {
    expect(validateWarehouse({ code: 'W1', name: '库', groups: 2, rows: 3, layers: 2, columns: 4 })).toEqual([])
  })
})

describe('buildWarehousePayload', () => {
  it('维度强制 Number,保留 id,剥空串', () => {
    expect(
      buildWarehousePayload({ id: 'x', code: 'W1', name: '库', type: '', groups: 2, rows: 3, layers: 2, columns: 4, descr: undefined }),
    ).toEqual({ id: 'x', code: 'W1', name: '库', groups: 2, rows: 3, layers: 2, columns: 4 })
  })
  it('字符串维度被规整为 number', () => {
    const p = buildWarehousePayload({ code: 'W1', name: '库', groups: '2' as unknown as number, rows: 1, layers: 1, columns: 1 })
    expect(p.groups).toBe(2)
    expect(typeof p.groups).toBe('number')
  })
})

describe('locationGridSummary', () => {
  it('计算总数与标签', () => {
    expect(locationGridSummary({ groups: 2, rows: 3, layers: 2, columns: 4 })).toEqual({
      total: 48,
      label: '2组 × 3排 × 2层 × 4列 = 48',
    })
  })
  it('缺省维度按 0 处理', () => {
    expect(locationGridSummary({}).total).toBe(0)
  })
})

describe('dimensionsChanged', () => {
  it('新建(无旧记录)→ true', () => {
    expect(dimensionsChanged(null, { groups: 1, rows: 1, layers: 1, columns: 1 })).toBe(true)
  })
  it('维度全等 → false', () => {
    expect(dimensionsChanged({ groups: 2, rows: 3, layers: 2, columns: 4 }, { groups: 2, rows: 3, layers: 2, columns: 4 })).toBe(false)
  })
  it('任一维度不同 → true', () => {
    expect(dimensionsChanged({ groups: 2, rows: 3, layers: 2, columns: 4 }, { groups: 2, rows: 3, layers: 2, columns: 5 })).toBe(true)
  })
})
