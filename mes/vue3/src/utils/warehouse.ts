import type { SpWarehouse } from '@/types/warehouse'

/** 仓库维度子集(用于网格汇总 / 变更比对) */
type Dims = Pick<SpWarehouse, 'groups' | 'rows' | 'layers' | 'columns'>

/** 剥去 undefined / null / 空串字段(保留有值字段，含 id) */
function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out as Partial<T>
}

function isPositiveInt(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1
}

export function validateWarehouse(form: Partial<SpWarehouse>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('库房编码必填')
  if (!form.name?.trim()) errs.push('库房名称必填')
  if (!isPositiveInt(form.groups)) errs.push('组须为 ≥1 的整数')
  if (!isPositiveInt(form.rows)) errs.push('排须为 ≥1 的整数')
  if (!isPositiveInt(form.layers)) errs.push('层须为 ≥1 的整数')
  if (!isPositiveInt(form.columns)) errs.push('列须为 ≥1 的整数')
  return errs
}

export function buildWarehousePayload(form: Partial<SpWarehouse>): Partial<SpWarehouse> {
  const out = stripEmpty(form)
  // 维度强制 Number(el-input-number 已给 number，但兼容字符串场景)
  for (const k of ['groups', 'rows', 'layers', 'columns'] as const) {
    if (out[k] !== undefined) out[k] = Number(out[k])
  }
  return out
}

export function locationGridSummary(w: Partial<Dims>): { total: number; label: string } {
  const g = w.groups ?? 0
  const r = w.rows ?? 0
  const l = w.layers ?? 0
  const c = w.columns ?? 0
  return { total: g * r * l * c, label: `${g}组 × ${r}排 × ${l}层 × ${c}列 = ${g * r * l * c}` }
}

/** 维度是否变化(与后端守卫语义对称)：无旧记录(新建)→ true；任一维度不同 → true */
export function dimensionsChanged(oldW: Dims | null | undefined, next: Dims): boolean {
  if (!oldW) return true
  return (
    oldW.groups !== next.groups ||
    oldW.rows !== next.rows ||
    oldW.layers !== next.layers ||
    oldW.columns !== next.columns
  )
}
