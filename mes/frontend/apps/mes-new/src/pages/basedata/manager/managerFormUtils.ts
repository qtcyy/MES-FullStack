import type { ManagerUpsertPayload } from '@/types/manager'

/** 弹窗内字段行编辑态(key 仅前端用于 React list key 与行操作,提交时丢弃) */
export interface FieldRow {
  key: string
  field: string
  fieldDesc: string
  mustFill: boolean
}

/** 表头编辑态 */
export interface ManagerHeader {
  tableName: string
  tableDesc: string
  permission: string
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/** 解析后端 must_fill(varchar(1)):支持新编码 "1" 与遗留 "Y"/"y";其余(含 "0"/空/undefined)为非必填 */
export function parseMustFill(raw: string | undefined): boolean {
  return raw === '1' || (raw ?? '').toUpperCase() === 'Y'
}

/** 提交前校验:表名必填、至少 1 字段、每行字段名/显示名非空、字段名不重复(忽略大小写) */
export function validateManagerForm(header: ManagerHeader, rows: FieldRow[]): ValidationResult {
  const errors: string[] = []
  if (!header.tableName.trim()) errors.push('表名不能为空')
  if (rows.length === 0) errors.push('至少需要一个字段')
  rows.forEach((r, i) => {
    if (!r.field.trim()) errors.push(`第 ${i + 1} 行:字段名不能为空`)
    if (!r.fieldDesc.trim()) errors.push(`第 ${i + 1} 行:显示名不能为空`)
  })
  const seen = new Set<string>()
  rows.forEach((r, i) => {
    const k = r.field.trim().toLowerCase()
    if (!k) return
    if (seen.has(k)) errors.push(`第 ${i + 1} 行:字段名「${r.field.trim()}」重复`)
    else seen.add(k)
  })
  return { ok: errors.length === 0, errors }
}

/** 相邻行交换(不可变);越界返回原引用 */
export function moveRow(rows: FieldRow[], index: number, dir: -1 | 1): FieldRow[] {
  const target = index + dir
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return rows
  const next = rows.slice()
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** 装配整体 upsert 提交体:mustFill→"1"/"0"、sortNum 按下标重排、剥离 item id、isDeleted="0" */
export function buildUpsertPayload(
  header: ManagerHeader,
  rows: FieldRow[],
  existingId?: string,
): ManagerUpsertPayload {
  const payload: ManagerUpsertPayload = {
    tableName: header.tableName.trim(),
    tableDesc: header.tableDesc.trim(),
    permission: header.permission.trim(),
    isDeleted: '0',
    spTableManagerItems: rows.map((r, i) => ({
      field: r.field.trim(),
      fieldDesc: r.fieldDesc.trim(),
      mustFill: r.mustFill ? '1' : '0',
      sortNum: i + 1,
    })),
  }
  if (existingId) payload.id = existingId
  return payload
}
