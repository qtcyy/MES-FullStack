import type { SpDevice, SpComponent, SpDeviceGroup } from '@/types/basedata'
import type { TransferItem } from '@/types/technology'

/** 剥去 undefined / 空串字段(保留有值字段，含 id) */
function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out as Partial<T>
}

export function validateDevice(form: Partial<SpDevice>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('设备编码必填')
  if (!form.name?.trim()) errs.push('设备名称必填')
  return errs
}

export function buildDevicePayload(form: Partial<SpDevice>): Partial<SpDevice> {
  return stripEmpty(form)
}

export function validateComponent(form: Partial<SpComponent>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('零部件编码必填')
  if (!form.name?.trim()) errs.push('零部件名称必填')
  return errs
}

export function buildComponentPayload(form: Partial<SpComponent>): Partial<SpComponent> {
  return stripEmpty(form)
}

export function validateGroup(form: Partial<SpDeviceGroup>): string[] {
  const errs: string[] = []
  if (!form.code?.trim()) errs.push('编组编码必填')
  if (!form.name?.trim()) errs.push('编组名称必填')
  return errs
}

export function buildGroupPayload(form: Partial<SpDeviceGroup>): Partial<SpDeviceGroup> {
  return stripEmpty(form)
}

/** 候选 = 全集剔除已选 id */
export function excludeSelected<T extends { id?: string }>(all: T[], selectedIds: Set<string>): T[] {
  return all.filter((it) => !selectedIds.has(it.id ?? ''))
}

/** 成员 diff:新选集合相对原集合的 added / removed */
export function diffMembers(originalIds: string[], nextIds: string[]): { added: string[]; removed: string[] } {
  const orig = new Set(originalIds)
  const next = new Set(nextIds)
  return {
    added: nextIds.filter((id) => !orig.has(id)),
    removed: originalIds.filter((id) => !next.has(id)),
  }
}

/** SpDevice → 穿梭框项(primary=名称, secondary=编码) */
export function deviceToTransferItem(d: Partial<SpDevice>): TransferItem {
  return { id: d.id ?? '', primary: d.name ?? '', secondary: d.code ?? '' }
}
