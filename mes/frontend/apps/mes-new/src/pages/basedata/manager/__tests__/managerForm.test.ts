import { describe, it, expect } from 'vitest'
import {
  validateManagerForm,
  buildUpsertPayload,
  moveRow,
  parseMustFill,
  type FieldRow,
  type ManagerHeader,
} from '../managerFormUtils'

const header = (over: Partial<ManagerHeader> = {}): ManagerHeader => ({
  tableName: 'product',
  tableDesc: '产品表',
  permission: '',
  ...over,
})

const row = (field: string, fieldDesc: string, mustFill = false): FieldRow => ({
  key: `${field}-${fieldDesc}`,
  field,
  fieldDesc,
  mustFill,
})

describe('validateManagerForm', () => {
  it('合法:表名 + 至少一字段 + 无重复 → ok', () => {
    const r = validateManagerForm(header(), [row('product_code', '产品代码', true)])
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
  })
  it('表名空白 → 报错', () => {
    const r = validateManagerForm(header({ tableName: '   ' }), [row('a', 'A')])
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('表名不能为空')
  })
  it('无字段行 → 报错', () => {
    const r = validateManagerForm(header(), [])
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('至少需要一个字段')
  })
  it('字段名/显示名空 → 按行报错', () => {
    const r = validateManagerForm(header(), [row('', ''), row('b', '')])
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('第 1 行:字段名不能为空')
    expect(r.errors).toContain('第 1 行:显示名不能为空')
    expect(r.errors).toContain('第 2 行:显示名不能为空')
  })
  it('字段名重复(忽略大小写)→ 报错', () => {
    const r = validateManagerForm(header(), [row('Code', 'A'), row('code', 'B')])
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('重复'))).toBe(true)
  })
})

describe('moveRow', () => {
  const rows = [row('a', 'A'), row('b', 'B'), row('c', 'C')]
  it('上移', () => { expect(moveRow(rows, 1, -1).map((r) => r.field)).toEqual(['b', 'a', 'c']) })
  it('下移', () => { expect(moveRow(rows, 1, 1).map((r) => r.field)).toEqual(['a', 'c', 'b']) })
  it('首行上移越界 → 原引用', () => { expect(moveRow(rows, 0, -1)).toBe(rows) })
  it('末行下移越界 → 原引用', () => { expect(moveRow(rows, 2, 1)).toBe(rows) })
  it('不可变:返回新数组且不改原', () => {
    const out = moveRow(rows, 0, 1)
    expect(out).not.toBe(rows)
    expect(rows.map((r) => r.field)).toEqual(['a', 'b', 'c'])
  })
})

describe('buildUpsertPayload', () => {
  it('新增:无 id, mustFill 转码, sortNum 从 1 递增, isDeleted=0', () => {
    const p = buildUpsertPayload(header(), [
      row('product_code', '产品代码', true),
      row('product_name', '产品名称', false),
    ])
    expect(p.id).toBeUndefined()
    expect(p.isDeleted).toBe('0')
    expect(p.spTableManagerItems).toEqual([
      { field: 'product_code', fieldDesc: '产品代码', mustFill: '1', sortNum: 1 },
      { field: 'product_name', fieldDesc: '产品名称', mustFill: '0', sortNum: 2 },
    ])
  })
  it('编辑:带 id', () => {
    const p = buildUpsertPayload(header(), [row('a', 'A')], 'mgr-1')
    expect(p.id).toBe('mgr-1')
  })
  it('trim 表头与字段', () => {
    const p = buildUpsertPayload(
      header({ tableName: ' product ', tableDesc: ' 产品 ', permission: ' x ' }),
      [row(' f ', ' d ')],
    )
    expect(p.tableName).toBe('product')
    expect(p.tableDesc).toBe('产品')
    expect(p.permission).toBe('x')
    expect(p.spTableManagerItems[0]).toMatchObject({ field: 'f', fieldDesc: 'd' })
  })
  it('sortNum 反映 moveRow 后的顺序', () => {
    const reordered = moveRow([row('a', 'A'), row('b', 'B')], 0, 1)
    const p = buildUpsertPayload(header(), reordered)
    expect(p.spTableManagerItems.map((it) => [it.field, it.sortNum])).toEqual([['b', 1], ['a', 2]])
  })
})

describe('parseMustFill', () => {
  it("'1' → true", () => { expect(parseMustFill('1')).toBe(true) })
  it("'0' → false", () => { expect(parseMustFill('0')).toBe(false) })
  it("遗留 'Y' → true", () => { expect(parseMustFill('Y')).toBe(true) })
  it("遗留小写 'y' → true", () => { expect(parseMustFill('y')).toBe(true) })
  it("空串 → false", () => { expect(parseMustFill('')).toBe(false) })
  it("undefined → false", () => { expect(parseMustFill(undefined)).toBe(false) })
})
