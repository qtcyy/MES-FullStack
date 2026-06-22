import type { SpTableManagerItem } from '@/types/manager'
import { parseMustFill } from '@/utils/manager'

/** 字段明细 → 动态列定义(按 sortNum 升序,缺失退化为字段名) */
export function buildColumns(items: SpTableManagerItem[]): { field: string; label: string }[] {
  return [...items]
    .sort((a, b) => (a.sortNum ?? 0) - (b.sortNum ?? 0))
    .map((it) => ({ field: it.field, label: it.fieldDesc?.trim() || it.field }))
}

/** 新建行初值:各配置字段空串 */
export function emptyRow(items: SpTableManagerItem[]): Record<string, string> {
  const row: Record<string, string> = {}
  for (const it of items) row[it.field] = ''
  return row
}

/** 行校验:必填字段(mustFill)不能空,返回首个错误文案,合法 null */
export function validateRow(items: SpTableManagerItem[], values: Record<string, string>): string | null {
  for (const it of items) {
    if (parseMustFill(it.mustFill) && !values[it.field]?.trim()) {
      return `${it.fieldDesc?.trim() || it.field} 不能为空`
    }
  }
  return null
}

/** 构造 form 平铺 body:仅白名单字段值 + jsTableName/jsTableNameId + 可选 id */
export function buildDataPayload(
  items: SpTableManagerItem[],
  values: Record<string, string>,
  tableName: string,
  tableNameId: string,
  id?: string,
): Record<string, string> {
  const body: Record<string, string> = { jsTableName: tableName, jsTableNameId: tableNameId }
  for (const it of items) body[it.field] = values[it.field] ?? ''
  if (id) body.id = id
  return body
}
