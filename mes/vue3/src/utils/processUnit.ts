import type { SpProcessUnit } from '@/types/processUnit'

function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out as Partial<T>
}

export function validateProcessUnit(form: Partial<SpProcessUnit>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('单元代码必填')
  if (!form.name?.trim()) errs.push('单元名称必填')
  return errs
}

export function buildProcessUnitPayload(form: Partial<SpProcessUnit>): Partial<SpProcessUnit> {
  const out = stripEmpty(form)
  // 开关字段始终显式带上(后端按 '1'/'0' 存)；缺省视为 '0'
  out.hasLineWarehouse = form.hasLineWarehouse === '1' ? '1' : '0'
  return out
}
