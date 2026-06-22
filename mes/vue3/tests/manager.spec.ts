import { describe, it, expect } from 'vitest'
import {
  parseMustFill,
  validateManagerForm,
  buildUpsertPayload,
  moveRow,
} from '@/utils/manager'
import type { SpTableManager, SpTableManagerItem } from '@/types/manager'

describe('parseMustFill', () => {
  it('Y/y/1 → true,其余 → false', () => {
    expect(parseMustFill('Y')).toBe(true)
    expect(parseMustFill('y')).toBe(true)
    expect(parseMustFill('1')).toBe(true)
    expect(parseMustFill('0')).toBe(false)
    expect(parseMustFill('N')).toBe(false)
    expect(parseMustFill(undefined)).toBe(false)
  })
})

describe('validateManagerForm', () => {
  const header = (p: Partial<SpTableManager> = {}): SpTableManager => ({ tableName: 'sp_demo', tableDesc: '演示', ...p })
  const rows = (): SpTableManagerItem[] => [{ field: 'code', fieldDesc: '编码' }]

  it('齐全 → null', () => {
    expect(validateManagerForm(header(), rows())).toBeNull()
  })
  it('表名空 → 报错', () => {
    expect(validateManagerForm(header({ tableName: '  ' }), rows())).toContain('表名')
  })
  it('明细为空 → 报错', () => {
    expect(validateManagerForm(header(), [])).toContain('字段')
  })
  it('字段名为空 → 报错', () => {
    expect(validateManagerForm(header(), [{ field: ' ', fieldDesc: 'x' }])).toContain('字段名')
  })
  it('字段名重复 → 报错', () => {
    expect(
      validateManagerForm(header(), [
        { field: 'code', fieldDesc: 'a' },
        { field: 'code', fieldDesc: 'b' },
      ]),
    ).toContain('重复')
  })
})

describe('buildUpsertPayload', () => {
  it('mustFill 归一为 "1"/"0"、按序生成 sortNum(从1)、剥 item id', () => {
    const out = buildUpsertPayload(
      { tableName: 'sp_demo', tableDesc: '演示' },
      [
        { id: 'old1', field: 'code', fieldDesc: '编码', mustFill: 'Y' },
        { id: 'old2', field: 'name', fieldDesc: '名称', mustFill: '0' },
      ],
    )
    expect(out.tableName).toBe('sp_demo')
    expect(out.id).toBeUndefined()
    expect(out.isDeleted).toBe('0')
    expect(out.spTableManagerItems).toEqual([
      { field: 'code', fieldDesc: '编码', mustFill: '1', sortNum: 1 },
      { field: 'name', fieldDesc: '名称', mustFill: '0', sortNum: 2 },
    ])
  })
  it('编辑(传 existingId)→ 表头带 id', () => {
    const out = buildUpsertPayload({ tableName: 'sp_demo', tableDesc: 'x' }, [{ field: 'code', fieldDesc: '编码' }], 'H1')
    expect(out.id).toBe('H1')
  })
})

describe('moveRow', () => {
  const r = (): SpTableManagerItem[] => [
    { field: 'a', fieldDesc: 'A' },
    { field: 'b', fieldDesc: 'B' },
    { field: 'c', fieldDesc: 'C' },
  ]
  it('下移', () => {
    expect(moveRow(r(), 0, 'down').map((x) => x.field)).toEqual(['b', 'a', 'c'])
  })
  it('上移', () => {
    expect(moveRow(r(), 2, 'up').map((x) => x.field)).toEqual(['a', 'c', 'b'])
  })
  it('越界返回原序', () => {
    expect(moveRow(r(), 0, 'up').map((x) => x.field)).toEqual(['a', 'b', 'c'])
    expect(moveRow(r(), 2, 'down').map((x) => x.field)).toEqual(['a', 'b', 'c'])
  })
})
