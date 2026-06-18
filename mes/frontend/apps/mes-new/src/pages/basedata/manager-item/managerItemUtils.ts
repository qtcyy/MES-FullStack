import type { SpTableManagerItem } from '@/types/manager'
import { parseMustFill } from '../manager/managerFormUtils'

export interface ColumnMeta {
  field: string
  fieldDesc: string
  required: boolean
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/** 由字段元数据构造表格列定义(顺序 = 后端返回顺序 = sortNum) */
export function buildColumnMetas(items: SpTableManagerItem[]): ColumnMeta[] {
  return items.map((it) => ({
    field: it.field,
    fieldDesc: it.fieldDesc || it.field,
    required: parseMustFill(it.mustFill),
  }))
}

/** 新建空行:每个配置字段初始化为空串 */
export function emptyRow(items: SpTableManagerItem[]): Record<string, string> {
  const row: Record<string, string> = {}
  for (const it of items) row[it.field] = ''
  return row
}

/** 必填校验:required 字段非空白 */
export function validateRow(
  items: SpTableManagerItem[],
  values: Record<string, string>,
): ValidationResult {
  const errors: string[] = []
  for (const it of items) {
    if (parseMustFill(it.mustFill) && !(values[it.field] ?? '').trim()) {
      errors.push(`${it.fieldDesc || it.field}不能为空`)
    }
  }
  return { ok: errors.length === 0, errors }
}

/** 装配 add-or-update 提交体(平铺 form):jsTableName/jsTableNameId/id?(编辑) + 各字段(trim) */
export function buildRowPayload(
  tableName: string,
  tableNameId: string,
  items: SpTableManagerItem[],
  values: Record<string, string>,
  id?: string,
): Record<string, string> {
  const payload: Record<string, string> = { jsTableName: tableName, jsTableNameId: tableNameId }
  for (const it of items) payload[it.field] = (values[it.field] ?? '').trim()
  if (id) payload.id = id
  return payload
}
