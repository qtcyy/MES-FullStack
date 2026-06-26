import type { SpMaterile, SpSysDict } from '@/types/basedata'

/** 下拉选项 */
export interface DictOption {
  label: string
  value: string
}

/**
 * 构造 add-or-update 提交体:
 * - 剥除 undefined 与空字符串(避免无意义字段污染表单编码)
 * - 数值字段(leadTime/safetyStock)统一转 number
 * - deleted 缺省补 '0'(正常)
 */
export function buildMaterilePayload(form: Partial<SpMaterile>): Partial<SpMaterile> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === '') continue
    out[k] = v
  }
  if (out.leadTime !== undefined) out.leadTime = Number(out.leadTime)
  if (out.safetyStock !== undefined) out.safetyStock = Number(out.safetyStock)
  if (out.deleted === undefined) out.deleted = '0'
  return out as Partial<SpMaterile>
}

/** 字典 value → 显示 name;未命中或空字典兜底返回原值;空值返回空串 */
export function resolveDictLabel(value: string | undefined, dicts: SpSysDict[]): string {
  if (!value) return ''
  const hit = dicts.find((d) => d.value === value)
  return hit ? hit.name : value
}

/** 字典数组 → el-select 选项 */
export function toDictOptions(dicts: SpSysDict[]): DictOption[] {
  return dicts.map((d) => ({ label: d.name, value: d.value }))
}
