import { describe, it, expect } from 'vitest'
import { buildMaterilePayload, resolveDictLabel, toDictOptions } from '@/utils/materile'
import type { SpSysDict } from '@/types/basedata'

const dicts: SpSysDict[] = [
  { id: '1', name: '成品', value: 'FG', type: 'material_type' },
  { id: '2', name: '半成品', value: 'PG', type: 'material_type' },
]

describe('buildMaterilePayload', () => {
  it('剥除 undefined/空串噪声', () => {
    const p = buildMaterilePayload({ materielDesc: '描述', model: '', size: undefined, matType: 'FG' })
    expect(p).toEqual({ materielDesc: '描述', matType: 'FG', deleted: '0' })
  })
  it('保留 id 与已填字段,默认 deleted=0', () => {
    const p = buildMaterilePayload({ id: 'x1', materielDesc: 'd', matType: 'PG' })
    expect(p.id).toBe('x1')
    expect(p.deleted).toBe('0')
  })
  it('已有 deleted 不覆盖', () => {
    const p = buildMaterilePayload({ materielDesc: 'd', deleted: '1' })
    expect(p.deleted).toBe('1')
  })
  it('leadTime/safetyStock 数值化(字符串→数字)', () => {
    const p = buildMaterilePayload({ materielDesc: 'd', leadTime: '3' as unknown as number, safetyStock: 0 })
    expect(p.leadTime).toBe(3)
    expect(p.safetyStock).toBe(0)
  })
})

describe('resolveDictLabel', () => {
  it('命中字典返回 name', () => {
    expect(resolveDictLabel('FG', dicts)).toBe('成品')
  })
  it('未命中兜底返回原值', () => {
    expect(resolveDictLabel('零件', dicts)).toBe('零件')
  })
  it('空值返回空串', () => {
    expect(resolveDictLabel(undefined, dicts)).toBe('')
    expect(resolveDictLabel('', dicts)).toBe('')
  })
  it('空字典兜底返回原值', () => {
    expect(resolveDictLabel('FG', [])).toBe('FG')
  })
})

describe('toDictOptions', () => {
  it('字典数组转下拉选项', () => {
    expect(toDictOptions(dicts)).toEqual([
      { label: '成品', value: 'FG' },
      { label: '半成品', value: 'PG' },
    ])
  })
  it('空数组返回空', () => {
    expect(toDictOptions([])).toEqual([])
  })
})
