export interface StatusMeta {
  label: string
  className: string
}

const PENDING_CLASS = 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400'
const PARTIAL_CLASS = 'border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400'
const DONE_CLASS = 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
const MUTED_CLASS = 'border-transparent bg-muted text-muted-foreground'

/** 入库单状态 → 文案 + 色 */
export function receiptStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待确认', className: PENDING_CLASS }
    case 'partial': return { label: '部分登账', className: PARTIAL_CLASS }
    case 'completed': return { label: '已完成', className: DONE_CLASS }
    default: return { label: status || '—', className: MUTED_CLASS }
  }
}

/** 出库单状态 → 文案 + 色 */
export function outboundStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待确认', className: PENDING_CLASS }
    case 'partial': return { label: '部分出库', className: PARTIAL_CLASS }
    case 'completed': return { label: '已完成', className: DONE_CLASS }
    default: return { label: status || '—', className: MUTED_CLASS }
  }
}

/** 明细登账状态 → 文案 + 色 */
export function postStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'pending': return { label: '待登账', className: PENDING_CLASS }
    case 'posted': return { label: '已登账', className: DONE_CLASS }
    default: return { label: status || '—', className: MUTED_CLASS }
  }
}

/** 进度文案 posted/total */
export function progressText(posted?: number, total?: number): string {
  return `${posted ?? 0}/${total ?? 0}`
}

/** 进度百分比 0-100;total<=0 返回 0(不除零) */
export function progressPercent(posted?: number, total?: number): number {
  const t = total ?? 0
  if (t <= 0) return 0
  return Math.round(((posted ?? 0) / t) * 100)
}

export type LocationAvailability = 'empty' | 'same' | 'other'

/** 库位对目标物料的可用性:无占用→empty;同物料→same;他物料→other */
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
