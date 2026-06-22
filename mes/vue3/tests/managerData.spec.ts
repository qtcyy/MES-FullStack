import { describe, it, expect } from 'vitest'
import { buildColumns, emptyRow, validateRow, buildDataPayload } from '@/utils/managerData'
import type { SpTableManagerItem } from '@/types/manager'

const items: SpTableManagerItem[] = [
  { field: 'code', fieldDesc: '编码', sortNum: 2, mustFill: '1' },
  { field: 'name', fieldDesc: '名称', sortNum: 1, mustFill: '0' },
]

describe('buildColumns', () => {
  it('按 sortNum 升序映射 field/label', () => {
    expect(buildColumns(items)).toEqual([
      { field: 'name', label: '名称' },
      { field: 'code', label: '编码' },
    ])
  })
  it('fieldDesc 缺失退化为 field', () => {
    expect(buildColumns([{ field: 'x', fieldDesc: '' }])).toEqual([{ field: 'x', label: 'x' }])
  })
})

describe('emptyRow', () => {
  it('各字段初值空串', () => {
    expect(emptyRow(items)).toEqual({ code: '', name: '' })
  })
})

describe('validateRow', () => {
  it('必填(mustFill)字段空 → 报错', () => {
    expect(validateRow(items, { code: '', name: 'x' })).toContain('编码')
  })
  it('必填齐全 → null(非必填可空)', () => {
    expect(validateRow(items, { code: 'C1', name: '' })).toBeNull()
  })
})

describe('buildDataPayload', () => {
  it('平铺白名单字段 + jsTableName/jsTableNameId,新增不带 id', () => {
    expect(buildDataPayload(items, { code: 'C1', name: '产品', extra: 'x' }, 'sp_demo', 'T1')).toEqual({
      jsTableName: 'sp_demo',
      jsTableNameId: 'T1',
      code: 'C1',
      name: '产品',
    })
  })
  it('编辑(传 id)→ 带 id', () => {
    const out = buildDataPayload(items, { code: 'C1', name: '产品' }, 'sp_demo', 'T1', 'ROW9')
    expect(out.id).toBe('ROW9')
  })
})
