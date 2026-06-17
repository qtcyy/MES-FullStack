import { useEffect, useState, type ReactNode } from 'react'
import {
  Badge, Button, Input, Progress, Separator,
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@workspace/ui'
import { Check, Gauge, Pencil, Play } from 'lucide-react'
import type { GanttTask } from '@/types/order'
import { fromDatetimeLocal, toDatetimeLocal } from '@/utils/datetime'
import { getDisplayStatus, type DisplayStatus } from './ganttUtils'

type BarColor = 'primary' | 'blue' | 'yellow' | 'orange' | 'red' | 'green'

const STATUS_META: Record<DisplayStatus, { text: string; badge: string; dot: string; bar: BarColor }> = {
  notStarted: { text: '未开工', badge: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300', dot: 'bg-slate-400', bar: 'primary' },
  inProgress: { text: '进行中', badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400', dot: 'bg-amber-500', bar: 'yellow' },
  overdue: { text: '逾期', badge: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400', dot: 'bg-red-500', bar: 'red' },
  completed: { text: '已完工', badge: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-400', dot: 'bg-green-500', bar: 'green' },
}
const TYPE_TEXT: Record<string, string> = { P: '量产', A: '验证', F: '返工' }

interface Props {
  task: GanttTask | null
  nowMs: number
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  onStart?: (id: string, actualStartTime: string) => void
  onFinish?: (id: string, actualEndTime: string) => void
  onProgress?: (id: string, progress: number) => void
  onAdjustActual?: (id: string, actualStartTime: string, actualEndTime: string) => void
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{children}</h3>
}

function Field({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground" title={typeof value === 'string' ? value : undefined}>
        {value || '—'}
      </dd>
    </div>
  )
}

function TimeRow({ label, start, end, dot }: { label: string; start: string; end: string; dot: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm font-medium tabular-nums text-foreground">
          {start || '—'}
          <span className="px-1.5 text-muted-foreground">→</span>
          {end || '—'}
        </div>
      </div>
    </div>
  )
}

function ActionCard({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3.5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md border bg-background text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium">{title}</span>
        {hint && <span className="ml-auto text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

export default function TaskDetailSheet({
  task, nowMs, open, onOpenChange, busy,
  onStart, onFinish, onProgress, onAdjustActual,
}: Props) {
  const st = task ? getDisplayStatus(task, nowMs) : 'notStarted'
  const meta = STATUS_META[st]

  // 受控输入(避开 RHF 字段名 DOM 冲突)
  const [actStart, setActStart] = useState('')
  const [actEnd, setActEnd] = useState('')
  const [prog, setProg] = useState(0)

  useEffect(() => {
    if (!task) return
    setActStart(toDatetimeLocal(task.actualStartTime))
    setActEnd(toDatetimeLocal(task.actualEndTime))
    setProg(task.progress ?? 0)
  }, [task?.id, task?.actualStartTime, task?.actualEndTime, task?.progress])

  const status = task?.dispatchStatus
  const canEdit = !!task && (!!onStart || !!onFinish || !!onProgress || !!onAdjustActual)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[400px] flex-col gap-0 p-0 sm:max-w-[400px]">
        <SheetHeader className="gap-3 border-b px-5 pb-4 pr-12 pt-5">
          {task ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md font-normal">
                  {TYPE_TEXT[task.orderType] ?? task.orderType}
                </Badge>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.text}
                </span>
              </div>
              <div className="space-y-1">
                <SheetTitle className="text-lg leading-snug">{task.operName}</SheetTitle>
                <SheetDescription className="font-mono text-xs tracking-tight">{task.orderCode}</SheetDescription>
              </div>
            </>
          ) : (
            <>
              <SheetTitle>任务详情</SheetTitle>
              <SheetDescription>未选择任务</SheetDescription>
            </>
          )}
        </SheetHeader>

        {task && (
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {/* 概览 */}
            <section>
              <SectionLabel>概览</SectionLabel>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Field className="col-span-2" label="物料" value={task.materielDesc || task.materiel} />
                <Field label="数量" value={task.qty != null ? `× ${task.qty}` : '—'} />
                <Field label="工序" value={task.operName} />
                <Field label="班组" value={task.teamName} />
                <Field label="作业员" value={task.userName} />
              </dl>
            </section>

            <Separator />

            {/* 时间 */}
            <section>
              <SectionLabel>时间</SectionLabel>
              <div className="space-y-3.5">
                <TimeRow label="计划" dot="bg-slate-400" start={task.planStartTime || ''} end={task.planEndTime || ''} />
                <TimeRow
                  label="实际"
                  dot={meta.dot}
                  start={task.actualStartTime || ''}
                  end={task.actualEndTime || (task.actualStartTime ? '进行中' : '')}
                />
              </div>
            </section>

            <Separator />

            {/* 进度 */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">完工进度</h3>
                <span className="text-sm font-semibold tabular-nums">{task.progress ?? 0}%</span>
              </div>
              <Progress value={task.progress ?? 0} color={meta.bar} />
            </section>

            {/* 执行回填 */}
            {canEdit && (
              <>
                <Separator />
                <section className="space-y-3">
                  <SectionLabel>执行回填</SectionLabel>

                  {status === 1 && onStart && (
                    <ActionCard icon={<Play className="size-3.5" />} title="记录开工" hint="留空=当前时间">
                      <Input type="datetime-local" className="h-9" value={actStart} onChange={(e) => setActStart(e.target.value)} />
                      <Button size="sm" className="w-full" disabled={busy} onClick={() => onStart(task.id, fromDatetimeLocal(actStart))}>
                        记录开工
                      </Button>
                    </ActionCard>
                  )}

                  {status === 2 && (
                    <>
                      {onFinish && (
                        <ActionCard icon={<Check className="size-3.5" />} title="记录完工" hint="进度置 100%">
                          <Input type="datetime-local" className="h-9" value={actEnd} onChange={(e) => setActEnd(e.target.value)} />
                          <Button size="sm" className="w-full" disabled={busy} onClick={() => onFinish(task.id, fromDatetimeLocal(actEnd))}>
                            记录完工
                          </Button>
                        </ActionCard>
                      )}
                      {onProgress && (
                        <ActionCard icon={<Gauge className="size-3.5" />} title="更新进度">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number" min={0} max={100} className="h-9 w-24"
                              value={prog}
                              onChange={(e) => setProg(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                            <Button size="sm" variant="secondary" className="ml-auto" disabled={busy} onClick={() => onProgress(task.id, prog)}>
                              保存
                            </Button>
                          </div>
                        </ActionCard>
                      )}
                    </>
                  )}

                  {status != null && status >= 2 && onAdjustActual && (
                    <ActionCard icon={<Pencil className="size-3.5" />} title="修正实际时间" hint="纠错用">
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">实际开工</label>
                        <Input type="datetime-local" className="h-9" value={actStart} onChange={(e) => setActStart(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">实际完工</label>
                        <Input type="datetime-local" className="h-9" value={actEnd} onChange={(e) => setActEnd(e.target.value)} />
                      </div>
                      <Button
                        size="sm" variant="outline" className="w-full" disabled={busy}
                        onClick={() => onAdjustActual(task.id, fromDatetimeLocal(actStart), fromDatetimeLocal(actEnd))}
                      >
                        保存修正
                      </Button>
                    </ActionCard>
                  )}

                  {status === 3 && (
                    <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      任务已完工。如需纠错可用上方“修正实际时间”。
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
