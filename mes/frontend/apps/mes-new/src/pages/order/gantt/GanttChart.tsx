import { Fragment, useMemo } from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@workspace/ui'
import type { GanttTask } from '@/types/order'
import {
  enumerateDays, floorDay, getDisplayStatus, taskBars, timeToX,
  type DisplayStatus, type GanttGroup,
} from './ganttUtils'

const LABEL_W = 176
const DAY_W = 44
const ROW_H = 34
const GROUP_H = 30

const STATUS_BAR: Record<DisplayStatus, string> = {
  notStarted: 'bg-slate-400',
  inProgress: 'bg-amber-500',
  overdue: 'bg-red-500',
  completed: 'bg-green-500',
}
const STATUS_TEXT: Record<DisplayStatus, string> = {
  notStarted: '未开工',
  inProgress: '进行中',
  overdue: '逾期',
  completed: '已完工',
}

function fmtDay(ms: number): string {
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

interface Props {
  groups: GanttGroup[]
  rangeStartMs: number
  rangeEndMs: number
  nowMs: number
  onTaskClick: (t: GanttTask) => void
}

export default function GanttChart({ groups, rangeStartMs, rangeEndMs, nowMs, onTaskClick }: Props) {
  const days = useMemo(() => enumerateDays(rangeStartMs, rangeEndMs), [rangeStartMs, rangeEndMs])
  const trackWidth = days.length * DAY_W
  const todayLeft = timeToX(floorDay(nowMs), rangeStartMs, DAY_W)
  const showToday = floorDay(nowMs) >= floorDay(rangeStartMs) && floorDay(nowMs) <= floorDay(rangeEndMs)

  // 每 DAY_W 像素画一条 1px 日列分隔线。注意本项目 --border 是原始色值(#d8dee7 / oklch(...)),
  // 不可用 hsl(var(--border)) 包裹(那会得到无效色而整条渐变被丢弃),直接用 var(--border)。
  const gridStyle = {
    width: trackWidth,
    backgroundImage:
      `repeating-linear-gradient(to right, transparent, transparent ${DAY_W - 1}px, var(--border) ${DAY_W - 1}px, var(--border) ${DAY_W}px)`,
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
        暂无派工任务数据
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <div style={{ minWidth: LABEL_W + trackWidth }}>
          {/* 表头 */}
          <div className="flex border-b bg-muted/40">
            <div
              className="sticky left-0 z-20 shrink-0 border-r bg-muted/40 px-3 text-xs font-medium text-muted-foreground flex items-center"
              style={{ width: LABEL_W, height: GROUP_H }}
            >
              班组 / 工序
            </div>
            <div className="relative" style={{ width: trackWidth, height: GROUP_H }}>
              {days.map((d, i) => (
                <div
                  key={d}
                  className="absolute top-0 flex h-full items-center justify-center border-r text-[11px] text-muted-foreground"
                  style={{ left: i * DAY_W, width: DAY_W }}
                >
                  {fmtDay(d)}
                </div>
              ))}
              {showToday && (
                <div className="absolute top-0 z-10 h-full w-px bg-red-500/70" style={{ left: todayLeft }} />
              )}
            </div>
          </div>

          {/* 分组 + 行 */}
          {groups.map((g) => (
            <div key={g.key}>
              <div className="flex items-center border-b bg-muted/60" style={{ height: GROUP_H }}>
                <div
                  className="sticky left-0 z-10 shrink-0 truncate border-r bg-muted/60 px-3 text-sm font-semibold"
                  style={{ width: LABEL_W, height: GROUP_H, lineHeight: `${GROUP_H}px` }}
                  title={g.label}
                >
                  {g.label}
                  {g.tag && <span className="ml-1 text-xs font-normal text-muted-foreground">{g.tag}</span>}
                </div>
                <div className="relative" style={{ width: trackWidth, height: GROUP_H }}>
                  {showToday && <div className="absolute top-0 h-full w-px bg-red-500/40" style={{ left: todayLeft }} />}
                </div>
              </div>

              {g.rows.map((row) => (
                <div key={row.key} className="flex border-b last:border-b-0">
                  <div
                    className="sticky left-0 z-10 shrink-0 truncate border-r bg-card px-3 text-sm"
                    style={{ width: LABEL_W, height: ROW_H, lineHeight: `${ROW_H}px` }}
                    title={row.label}
                  >
                    {row.label}
                  </div>
                  <div className="relative" style={{ ...gridStyle, height: ROW_H }}>
                    {showToday && <div className="absolute top-0 z-10 h-full w-px bg-red-500/40" style={{ left: todayLeft }} />}
                    {row.tasks.map((t) => {
                      const bars = taskBars(t, rangeStartMs, DAY_W, nowMs)
                      const st = getDisplayStatus(t, nowMs)
                      return (
                        <Fragment key={t.id}>
                          {bars.plan && (
                            <div
                              className="absolute rounded bg-slate-300/80 dark:bg-slate-600/70"
                              style={{ left: bars.plan.left + 2, width: Math.max(bars.plan.width - 4, 2), top: 4, height: 7 }}
                            />
                          )}
                          {bars.actual && (
                            <HoverCard openDelay={120} closeDelay={60}>
                              <HoverCardTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onTaskClick(t)}
                                  className={`absolute flex items-center overflow-hidden rounded px-1.5 text-left text-[11px] text-white transition hover:brightness-110 hover:ring-2 hover:ring-ring focus:outline-none focus:ring-2 focus:ring-ring ${STATUS_BAR[st]}`}
                                  style={{ left: bars.actual.left + 2, width: Math.max(bars.actual.width - 4, 14), top: 14, height: ROW_H - 18 }}
                                >
                                  <span className="truncate">
                                    {t.operName}
                                    {t.progress != null ? ` ${t.progress}%` : ''}
                                  </span>
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-64 text-xs" side="top">
                                <div className="mb-1 text-sm font-semibold">
                                  {t.orderCode} · {t.operName}
                                </div>
                                <div className="space-y-0.5 text-muted-foreground">
                                  <div>班组：{t.teamName} / {t.userName}</div>
                                  <div>计划：{t.planStartTime || '—'} ~ {t.planEndTime || '—'}</div>
                                  <div>实际：{t.actualStartTime || '—'} ~ {t.actualEndTime || '进行中'}</div>
                                  <div>进度：{t.progress ?? 0}% · {STATUS_TEXT[st]}</div>
                                </div>
                                <div className="mt-1 text-primary">点击查看详情 →</div>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
