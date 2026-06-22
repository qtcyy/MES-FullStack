/** Element Plus el-tag 类型 */
export type TagType = 'success' | 'warning' | 'info' | 'primary' | 'danger'
export interface StatusMeta { label: string; tag: TagType }

/** 入库单状态 → 文案 + tag */
export function receiptStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待确认', tag: 'warning' }
    case 'partial': return { label: '部分登账', tag: 'primary' }
    case 'completed': return { label: '已完成', tag: 'success' }
    default: return { label: status || '—', tag: 'info' }
  }
}

/** 出库单状态 → 文案 + tag */
export function outboundStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待确认', tag: 'warning' }
    case 'partial': return { label: '部分出库', tag: 'primary' }
    case 'completed': return { label: '已完成', tag: 'success' }
    default: return { label: status || '—', tag: 'info' }
  }
}

/** 明细登账状态 → 文案 + tag */
export function postStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待登账', tag: 'warning' }
    case 'posted': return { label: '已登账', tag: 'success' }
    default: return { label: status || '—', tag: 'info' }
  }
}

/** 登账进度文案 posted/total */
export function progressText(posted?: number, total?: number): string {
  return `${posted ?? 0}/${total ?? 0}`
}

/** 登账进度百分比 0-100;total<=0 返回 0(不除零) */
export function progressPercent(posted?: number, total?: number): number {
  const t = total ?? 0
  if (t <= 0) return 0
  return Math.round(((posted ?? 0) / t) * 100)
}

export type LocationAvailability = 'empty' | 'same' | 'other'

/** 库位对目标物料的可用性 */
export function locationAvailability(occupiedBy: string | undefined, target: string): LocationAvailability {
  if (!occupiedBy) return 'empty'
  return occupiedBy === target ? 'same' : 'other'
}

/** 库位下拉选项文案 */
export function locationOptionLabel(code: string, occupiedBy: string | undefined, target: string): string {
  switch (locationAvailability(occupiedBy, target)) {
    case 'empty': return `${code} · 空闲`
    case 'same': return `${code} · 已存本物料·可累加`
    case 'other': return `${code} · 已占 ${occupiedBy}`
  }
}

/** 由库存台账构建 库位id → 占用物料编码 映射(忽略无库位/0量;同库位取首个) */
export function buildOccupancyMap(
  inv: { locationId?: string; materialCode: string; quantity: number }[],
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const r of inv) {
    if (!r.locationId) continue
    if ((r.quantity ?? 0) <= 0) continue
    if (!map[r.locationId]) map[r.locationId] = r.materialCode
  }
  return map
}

export interface ManualInboundForm {
  materialCode?: string
  materialDesc?: string
  unit?: string
  warehouseId?: string
  locationId?: string
  quantity?: number
}

/** 手工入库校验:返回错误文案,合法返回 null */
export function validateManualInbound(f: ManualInboundForm): string | null {
  if (!f.materialCode?.trim()) return '请输入物料编码'
  if (!f.warehouseId) return '请选择库房'
  if (!f.locationId) return '请选择库位'
  if (!f.quantity || Number(f.quantity) <= 0) return '数量须为正数'
  return null
}

/** 手工入库提交体:trim + 数值化 + 缺省空串 */
export function buildManualInboundPayload(f: ManualInboundForm) {
  return {
    materialCode: f.materialCode!.trim(),
    materialDesc: f.materialDesc?.trim() || '',
    unit: f.unit?.trim() || '',
    warehouseId: f.warehouseId!,
    locationId: f.locationId!,
    quantity: Number(f.quantity),
  }
}
