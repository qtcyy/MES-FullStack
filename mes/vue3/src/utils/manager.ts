import type { SpTableManager, SpTableManagerItem, SpTableManagerDto } from '@/types/manager'

/** 必填读取:Y/y/1 视为必填 */
export function parseMustFill(raw?: string): boolean {
  return raw === 'Y' || raw === 'y' || raw === '1'
}

/** 表单校验:返回首个错误文案,合法则 null */
export function validateManagerForm(header: SpTableManager, rows: SpTableManagerItem[]): string | null {
  if (!header.tableName?.trim()) return '表名不能为空'
  if (!rows.length) return '至少配置一个字段'
  for (const r of rows) {
    if (!r.field?.trim()) return '字段名不能为空'
  }
  const fields = rows.map((r) => r.field.trim())
  if (new Set(fields).size !== fields.length) return '字段名不能重复'
  return null
}

/** 构造整体保存 payload:mustFill→"1"/"0"、按行序生成 sortNum(从1)、剥离 item id、编辑回带表头 id */
export function buildUpsertPayload(
  header: SpTableManager,
  rows: SpTableManagerItem[],
  existingId?: string,
): SpTableManagerDto {
  const items: SpTableManagerItem[] = rows.map((r, i) => ({
    field: r.field.trim(),
    fieldDesc: r.fieldDesc?.trim() ?? '',
    mustFill: parseMustFill(r.mustFill) ? '1' : '0',
    sortNum: i + 1,
  }))
  return {
    ...(existingId ? { id: existingId } : {}),
    tableName: header.tableName.trim(),
    tableDesc: header.tableDesc?.trim() ?? '',
    spTableManagerItems: items,
  }
}

/** 行上/下移(纯函数,越界返回原数组) */
export function moveRow(
  rows: SpTableManagerItem[],
  index: number,
  dir: 'up' | 'down',
): SpTableManagerItem[] {
  const target = dir === 'up' ? index - 1 : index + 1
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return rows
  const next = [...rows]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
