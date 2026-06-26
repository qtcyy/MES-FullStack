// src/utils/gantt.ts —— 甘特几何/状态/分组/拖拽纯函数
import type { GanttTask } from '@/types/order'

const DAY_MS = 86400000

/** 解析 'yyyy-MM-dd[ HH:mm:ss]' 到当天本地 00:00 毫秒；空值 null */
export function parseDay(s?: string | null): number | null {
  if (!s) return null
  const m = String(s).slice(0, 10).split('-')
  if (m.length !== 3) return null
  const [y, mo, d] = m.map(Number)
  if (!y || !mo || !d) return null
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(y, mo - 1, d).getTime()
}

/** 向下取整到当天 00:00 */
export function floorDay(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * 两个时间戳相差的整天数（端点差，非跨度）。
 * 注意：同一天返回 0；渲染条宽度需用 (daysBetween(start,end) + 1) 才是占用天数。
 */
export function daysBetween(a: number, b: number): number {
  return Math.round((floorDay(b) - floorDay(a)) / DAY_MS)
}

export type DisplayStatus = 'notStarted' | 'inProgress' | 'overdue' | 'completed'

/** 派生视觉状态 */
export function getDisplayStatus(task: GanttTask, nowMs: number): DisplayStatus {
  if (task.actualEndTime) return 'completed'
  if (task.actualStartTime) {
    const planEnd = parseDay(task.planEndTime)
    // 截止日当天不算逾期：仅当"今日零点"严格晚于"计划结束日零点"（即次日起）才判逾期
    if (planEnd !== null && nowMs > planEnd) return 'overdue'
    return 'inProgress'
  }
  return 'notStarted'
}

/** 计算时间窗：覆盖全部计划/实际边界，空任务回退 now±3 天 */
export function computeRange(tasks: GanttTask[], nowMs: number): { startMs: number; endMs: number } {
  const pts: number[] = []
  tasks.forEach((t) => {
    ;[t.planStartTime, t.planEndTime, t.actualStartTime, t.actualEndTime].forEach((s) => {
      const ms = parseDay(s)
      if (ms !== null) pts.push(ms)
    })
  })
  if (!pts.length) return { startMs: floorDay(nowMs) - 3 * DAY_MS, endMs: floorDay(nowMs) + 3 * DAY_MS }
  return { startMs: Math.min(...pts) - DAY_MS, endMs: Math.max(...pts) + DAY_MS }
}

/** 逐天枚举闭区间 [start,end] 的每天 00:00 */
export function enumerateDays(startMs: number, endMs: number): number[] {
  const out: number[] = []
  for (let d = floorDay(startMs); d <= floorDay(endMs); d += DAY_MS) out.push(d)
  return out
}

/** 日期→x 像素 */
export function timeToX(dateMs: number, rangeStart: number, dayWidth: number): number {
  return daysBetween(rangeStart, dateMs) * dayWidth
}

/** 像素位移→天数（四舍五入） */
export function pxToDays(deltaPx: number, dayWidth: number): number {
  return Math.round(deltaPx / dayWidth)
}

export type DragMode = 'move' | 'resize-start' | 'resize-end'

/** 拖拽后新计划时间（保留时分秒）；缩放至少留 1 天 */
export function shiftPlanByDays(task: GanttTask, deltaDays: number, mode: DragMode): { planStartTime?: string; planEndTime?: string } {
  const shift = (s: string | undefined, days: number): string | undefined => {
    if (!s) return s
    const time = String(s).slice(10) // ' HH:mm:ss' 或 ''
    const base = parseDay(s)
    if (base === null) return s
    const d = new Date(base + days * DAY_MS)
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return time ? `${ymd}${time}` : ymd
  }
  if (mode === 'move') {
    return { planStartTime: shift(task.planStartTime, deltaDays), planEndTime: shift(task.planEndTime, deltaDays) }
  }
  const ps = parseDay(task.planStartTime)
  const pe = parseDay(task.planEndTime)
  if (mode === 'resize-start') {
    if (ps !== null && pe !== null) {
      const newStart = floorDay(ps) + deltaDays * DAY_MS
      const clamped = Math.min(newStart, pe - DAY_MS)
      const days = daysBetween(ps, clamped)
      return { planStartTime: shift(task.planStartTime, days), planEndTime: task.planEndTime }
    }
    return { planStartTime: shift(task.planStartTime, deltaDays), planEndTime: task.planEndTime }
  }
  // resize-end
  if (ps !== null && pe !== null) {
    const newEnd = floorDay(pe) + deltaDays * DAY_MS
    const clamped = Math.max(newEnd, ps + DAY_MS)
    const days = daysBetween(pe, clamped)
    return { planStartTime: task.planStartTime, planEndTime: shift(task.planEndTime, days) }
  }
  return { planStartTime: task.planStartTime, planEndTime: shift(task.planEndTime, deltaDays) }
}

export interface GanttRow { id: string; label: string; sub?: string; tasks: GanttTask[] }
export interface GanttGroup { id: string; label: string; tag?: string; rows: GanttRow[] }

/** 资源视角：班组→作业员（保持插入序，作业员一行可多任务） */
export function groupByResource(tasks: GanttTask[]): GanttGroup[] {
  const groups: GanttGroup[] = []
  const gIdx = new Map<string, GanttGroup>()
  const rIdx = new Map<string, GanttRow>()
  tasks.forEach((t) => {
    const gid = t.teamId || '__noteam'
    let g = gIdx.get(gid)
    if (!g) { g = { id: gid, label: t.teamName || '未分组', rows: [] }; gIdx.set(gid, g); groups.push(g) }
    const rid = `${gid}::${t.userId || '__nouser'}`
    let r = rIdx.get(rid)
    if (!r) { r = { id: rid, label: t.userName || '未分配', tasks: [] }; rIdx.set(rid, r); g.rows.push(r) }
    r.tasks.push(t)
  })
  return groups
}

/** 订单视角：订单→工序（工序按 planStartTime 排序，一工序一行） */
export function groupByOrder(tasks: GanttTask[]): GanttGroup[] {
  const groups: GanttGroup[] = []
  const gIdx = new Map<string, GanttGroup>()
  tasks.forEach((t) => {
    let g = gIdx.get(t.orderId)
    if (!g) { g = { id: t.orderId, label: t.orderCode, tag: t.materielDesc, rows: [] }; gIdx.set(t.orderId, g); groups.push(g) }
    g.rows.push({ id: t.id, label: t.operName || '工序', sub: t.userName, tasks: [t] })
  })
  groups.forEach((g) => {
    g.rows.sort((a, b) => (parseDay(a.tasks[0].planStartTime) ?? 0) - (parseDay(b.tasks[0].planStartTime) ?? 0))
  })
  return groups
}
