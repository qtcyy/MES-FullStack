import type { GanttTask } from '@/types/order'

export const DAY_MS = 24 * 60 * 60 * 1000

export type DisplayStatus = 'notStarted' | 'inProgress' | 'overdue' | 'completed'

/** 解析 'yyyy-MM-dd'(可带时间后缀) 为当天本地 00:00 毫秒;空/非法返回 null */
export function parseDay(s?: string | null): number | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt.getTime()
}

/** 毫秒下取整到当天 00:00 */
export function floorDay(ms: number): number {
  const dt = new Date(ms)
  dt.setHours(0, 0, 0, 0)
  return dt.getTime()
}

/** 相隔整天数(按天取整) */
export function daysBetween(aMs: number, bMs: number): number {
  return Math.round((floorDay(bMs) - floorDay(aMs)) / DAY_MS)
}

/** 显示状态 */
export function getDisplayStatus(task: GanttTask, nowMs: number): DisplayStatus {
  if (task.actualEndTime) return 'completed'
  if (task.actualStartTime) {
    const pe = parseDay(task.planEndTime)
    if (pe != null && floorDay(nowMs) > pe) return 'overdue'
    return 'inProgress'
  }
  return 'notStarted'
}

/** 时间范围(两侧各 1 天 padding);无数据回退 now±3天 */
export function computeRange(tasks: GanttTask[], nowMs: number): { startMs: number; endMs: number } {
  const days: number[] = []
  for (const t of tasks) {
    for (const s of [t.planStartTime, t.planEndTime, t.actualStartTime, t.actualEndTime]) {
      const d = parseDay(s)
      if (d != null) days.push(d)
    }
  }
  if (days.length === 0) {
    const base = floorDay(nowMs)
    return { startMs: base - 3 * DAY_MS, endMs: base + 3 * DAY_MS }
  }
  return { startMs: Math.min(...days) - DAY_MS, endMs: Math.max(...days) + DAY_MS }
}

/** 枚举范围内每天 00:00 毫秒 */
export function enumerateDays(startMs: number, endMs: number): number[] {
  const out: number[] = []
  const e = floorDay(endMs)
  // 每步加 36h 后重新下取整: 跨 DST 切换日(本地午夜非恒定 86400000ms)也稳定落在次日午夜,不漏/不重日。
  for (let cur = floorDay(startMs); cur <= e; cur = floorDay(cur + DAY_MS + DAY_MS / 2)) out.push(cur)
  return out
}

/** 日期 → x 像素偏移 */
export function timeToX(dateMs: number, rangeStartMs: number, dayWidth: number): number {
  return daysBetween(rangeStartMs, dateMs) * dayWidth
}

export interface BarBox { left: number; width: number }
export interface TaskBars { plan: BarBox | null; actual: BarBox | null }

/** 计划/实际条像素盒;实际进行中(无完工时间)延伸到今天 */
export function taskBars(task: GanttTask, rangeStartMs: number, dayWidth: number, nowMs: number): TaskBars {
  const ps = parseDay(task.planStartTime)
  const pe = parseDay(task.planEndTime)
  const as = parseDay(task.actualStartTime)
  let ae = parseDay(task.actualEndTime)
  let plan: BarBox | null = null
  if (ps != null && pe != null) {
    const peClamped = pe < ps ? ps : pe // 与 actual 条对称: 防脏数据 planEnd<planStart 产生负宽度
    plan = { left: timeToX(ps, rangeStartMs, dayWidth), width: (daysBetween(ps, peClamped) + 1) * dayWidth }
  }
  let actual: BarBox | null = null
  if (as != null) {
    if (ae == null) ae = floorDay(nowMs)
    if (ae < as) ae = as
    actual = { left: timeToX(as, rangeStartMs, dayWidth), width: (daysBetween(as, ae) + 1) * dayWidth }
  }
  return { plan, actual }
}

export interface GanttRow { key: string; label: string; sublabel?: string; tasks: GanttTask[] }
export interface GanttGroup { key: string; label: string; tag?: string; rows: GanttRow[] }

const STATUE_TEXT: Record<number, string> = {
  0: '待派工', 1: '已派工', 2: '进行中', 3: '已完成', 4: '已终结',
}

/** 资源视角: 班组 → 作业员(行内多任务),保持出现顺序 */
export function groupByResource(tasks: GanttTask[]): GanttGroup[] {
  const groups: GanttGroup[] = []
  const gIndex = new Map<string, GanttGroup>()
  const rIndex = new Map<string, GanttRow>()
  for (const t of tasks) {
    let g = gIndex.get(t.teamId)
    if (!g) {
      g = { key: t.teamId, label: t.teamName || '未分组班组', rows: [] }
      gIndex.set(t.teamId, g)
      groups.push(g)
    }
    const rk = t.teamId + '/' + t.userId
    let r = rIndex.get(rk)
    if (!r) {
      r = { key: rk, label: t.userName || '未指派', tasks: [] }
      rIndex.set(rk, r)
      g.rows.push(r)
    }
    r.tasks.push(t)
  }
  return groups
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

/** 订单视角: 订单 → 工序(每工序一行,按计划开始排序,带序号) */
export function groupByOrder(tasks: GanttTask[]): GanttGroup[] {
  const groups: GanttGroup[] = []
  const index = new Map<string, { group: GanttGroup; items: GanttTask[] }>()
  for (const t of tasks) {
    let e = index.get(t.orderId)
    if (!e) {
      const tag = [t.materielDesc || t.materiel, t.qty != null ? '×' + t.qty : '', STATUE_TEXT[t.orderStatue] ?? '']
        .filter(Boolean)
        .join(' · ')
      const group: GanttGroup = { key: t.orderId, label: t.orderCode || t.orderId, tag, rows: [] }
      e = { group, items: [] }
      index.set(t.orderId, e)
      groups.push(group)
    }
    e.items.push(t)
  }
  for (const { group, items } of index.values()) {
    items.sort((a, b) => (parseDay(a.planStartTime) ?? 0) - (parseDay(b.planStartTime) ?? 0))
    group.rows = items.map((t, i) => ({
      key: t.id,
      label: (CIRCLED[i] ?? i + 1 + '.') + ' ' + t.operName,
      tasks: [t],
    }))
  }
  return groups
}

export type DragMode = 'move' | 'resize-start' | 'resize-end'

/** 像素位移 → 天数(四舍五入) */
export function pxToDays(deltaPx: number, dayWidth: number): number {
  return Math.round(deltaPx / dayWidth)
}

/** 把 'yyyy-MM-dd[ 后缀]' 的日期部分平移 deltaDays 天,保留原后缀;非法/空原样返回 */
function shiftDateStr(s: string | undefined, deltaDays: number): string | undefined {
  if (!s) return s
  const m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(s.trim())
  if (!m) return s
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  dt.setDate(dt.getDate() + deltaDays)
  const y = dt.getFullYear()
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${mo}-${d}${m[4]}`
}

/** 拖拽计算新计划起止;move=两端同移,resize-*=单端移并 clamp(起≤止,保留至少 1 天) */
export function shiftPlanByDays(
  task: GanttTask,
  deltaDays: number,
  mode: DragMode,
): { planStartTime?: string; planEndTime?: string } {
  const ps = task.planStartTime
  const pe = task.planEndTime
  if (mode === 'move') {
    return { planStartTime: shiftDateStr(ps, deltaDays), planEndTime: shiftDateStr(pe, deltaDays) }
  }
  const psDay = parseDay(ps)
  const peDay = parseDay(pe)
  if (psDay == null || peDay == null) {
    return { planStartTime: ps, planEndTime: pe }
  }
  if (mode === 'resize-start') {
    const maxDelta = Math.round((peDay - psDay) / DAY_MS) // 起最多前进到止当天
    const d = Math.min(deltaDays, maxDelta)
    return { planStartTime: shiftDateStr(ps, d), planEndTime: pe }
  }
  // resize-end
  const minDelta = Math.round((psDay - peDay) / DAY_MS) // 止最多后退到起当天
  const d = Math.max(deltaDays, minDelta)
  return { planStartTime: ps, planEndTime: shiftDateStr(pe, d) }
}
