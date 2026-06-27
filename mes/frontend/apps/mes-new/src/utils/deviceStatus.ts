// 设备/设备组状态映射。设备状态码复用大屏既有约定(DashboardServiceImpl.deviceStatusLabel):
// 0=空闲 1=运行中 2=维修中 3=报废。设备组无自身状态,由成员设备状态派生。
export interface StatusMeta {
  label: string
  className: string
}

const IDLE_CLASS = 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
const RUNNING_CLASS = 'border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400'
const REPAIR_CLASS = 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400'
const MUTED_CLASS = 'border-transparent bg-muted text-muted-foreground'

/** 单台设备状态码 → 文案 + 色 */
export function deviceStatusMeta(status?: string): StatusMeta {
  switch (status) {
    case '0': return { label: '空闲', className: IDLE_CLASS }
    case '1': return { label: '运行中', className: RUNNING_CLASS }
    case '2': return { label: '维修中', className: REPAIR_CLASS }
    case '3': return { label: '报废', className: MUTED_CLASS }
    default: return { label: status || '—', className: MUTED_CLASS }
  }
}

export interface GroupStatusCounts {
  idleCount?: number
  runningCount?: number
  repairCount?: number
  scrapCount?: number
}

export interface GroupStatusMeta {
  meta: StatusMeta
  /** 计数明细:运行N·维修N·空闲N·报废N,仅非零项;无成员时为空串 */
  detail: string
}

/**
 * 设备组汇总状态:主徽标按优先级 占用中 > 维修中 > 空闲 > 报废 > 无设备。
 * "占用中" = 有成员设备处于"运行中"。
 */
export function deriveGroupStatusMeta(counts: GroupStatusCounts): GroupStatusMeta {
  const idle = counts.idleCount ?? 0
  const running = counts.runningCount ?? 0
  const repair = counts.repairCount ?? 0
  const scrap = counts.scrapCount ?? 0

  let meta: StatusMeta
  if (running > 0) meta = { label: '占用中', className: RUNNING_CLASS }
  else if (repair > 0) meta = { label: '维修中', className: REPAIR_CLASS }
  else if (idle > 0) meta = { label: '空闲', className: IDLE_CLASS }
  else if (scrap > 0) meta = { label: '报废', className: MUTED_CLASS }
  else meta = { label: '无设备', className: MUTED_CLASS }

  const parts: string[] = []
  if (running > 0) parts.push(`运行${running}`)
  if (repair > 0) parts.push(`维修${repair}`)
  if (idle > 0) parts.push(`空闲${idle}`)
  if (scrap > 0) parts.push(`报废${scrap}`)
  return { meta, detail: parts.join('·') }
}
