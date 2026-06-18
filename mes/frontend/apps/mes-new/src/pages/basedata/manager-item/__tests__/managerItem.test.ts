import { describe, it, expect } from 'vitest'
import {
  buildColumnMetas,
  emptyRow,
  validateRow,
  buildRowPayload,
} from '../managerItemUtils'
import type { SpTableManagerItem } from '@/types/manager'

const item = (field: string, fieldDesc = field, mustFill = '0'): SpTableManagerItem => ({
  field,
  fieldDesc,
  mustFill,
  sortNum: 1,
})

describe('buildColumnMetas', () => {
  it('保留顺序并映射 fieldDesc/required', () => {
    const metas = buildColumnMetas([item('a', '甲', '1'), item('b', '乙', '0')])
    expect(metas).toEqual([
      { field: 'a', fieldDesc: '甲', required: true },
      { field: 'b', fieldDesc: '乙', required: false },
    ])
  })
  it('fieldDesc 为空回退 field', () => {
    expect(buildColumnMetas([item('code', '')])[0].fieldDesc).toBe('code')
  })
  it('遗留 Y 视为必填', () => {
    expect(buildColumnMetas([item('a', '甲', 'Y')])[0].required).toBe(true)
  })
})

describe('emptyRow', () => {
  it('每个字段初始化为空串', () => {
    expect(emptyRow([item('a'), item('b')])).toEqual({ a: '', b: '' })
  })
})

describe('validateRow', () => {
  it('必填字段为空(含纯空白)→ 报错', () => {
    const r = validateRow([item('a', '甲', '1')], { a: '  ' })
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('甲不能为空')
  })
  it('必填已填 + 非必填空 → ok', () => {
    const r = validateRow([item('a', '甲', '1'), item('b', '乙', '0')], { a: 'x', b: '' })
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
  })
  it('多个必填字段均空 → 收集多条错误', () => {
    const r = validateRow(
      [item('a', '甲', '1'), item('b', '乙', '1')],
      { a: '', b: '' },
    )
    expect(r.ok).toBe(false)
    expect(r.errors).toHaveLength(2)
    expect(r.errors).toContain('甲不能为空')
    expect(r.errors).toContain('乙不能为空')
  })
})

describe('buildRowPayload', () => {
  it('新增:平铺 js* + 字段 trim,无 id', () => {
    const p = buildRowPayload('sp_bom', 't1', [item('materiel_desc')], { materiel_desc: '  螺丝  ' })
    expect(p).toEqual({ jsTableName: 'sp_bom', jsTableNameId: 't1', materiel_desc: '螺丝' })
    expect('id' in p).toBe(false)
  })
  it('编辑:带 id', () => {
    const p = buildRowPayload('sp_bom', 't1', [item('materiel_desc')], { materiel_desc: 'x' }, 'row-9')
    expect(p.id).toBe('row-9')
  })
})
