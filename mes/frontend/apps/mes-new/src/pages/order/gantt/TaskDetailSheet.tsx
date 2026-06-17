import { useEffect, useState } from 'react'
import {
  Button, Input, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@workspace/ui'
import type { GanttTask } from '@/types/order'
import { fromDatetimeLocal, toDatetimeLocal } from '@/utils/datetime'
import { getDisplayStatus, type DisplayStatus } from './ganttUtils'

const STATUS_TEXT: Record<DisplayStatus, string> = {
  notStarted: '未开工',
  inProgress: '进行中',
  overdue: '逾期',
  completed: '已完工',
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value || '—'}</span>
    </div>
  )
}

export default function TaskDetailSheet({
  task, nowMs, open, onOpenChange, busy,
  onStart, onFinish, onProgress, onAdjustActual,
}: Props) {
  const st = task ? getDisplayStatus(task, nowMs) : 'notStarted'

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
      <SheetContent className="w-[380px] sm:max-w-[380px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task ? `${task.orderCode} · ${task.operName}` : '任务详情'}</SheetTitle>
          <SheetDescription>派工任务详情与执行回填</SheetDescription>
        </SheetHeader>
        {task && (
          <div className="mt-4">
            <Row label="工单编号" value={task.orderCode} />
            <Row label="物料" value={`${task.materielDesc || task.materiel}${task.qty != null ? ' ×' + task.qty : ''}`} />
            <Row label="订单类型" value={TYPE_TEXT[task.orderType] ?? task.orderType} />
            <Row label="工序" value={task.operName} />
            <Row label="班组 / 作业员" value={`${task.teamName} / ${task.userName}`} />
            <Row label="计划时间" value={`${task.planStartTime || '—'} ~ ${task.planEndTime || '—'}`} />
            <Row label="实际时间" value={`${task.actualStartTime || '—'} ~ ${task.actualEndTime || '进行中'}`} />
            <Row label="完工进度" value={`${task.progress ?? 0}%`} />
            <Row label="显示状态" value={STATUS_TEXT[st]} />

            {canEdit && (
              <div className="mt-5 space-y-4">
                <div className="text-sm font-semibold">执行回填</div>

                {/* 已派工: 记录开工 */}
                {status === 1 && onStart && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">记录实际开工(留空则用当前时间)</div>
                    <Input type="datetime-local" className="h-9" value={actStart} onChange={(e) => setActStart(e.target.value)} />
                    <Button size="sm" disabled={busy} onClick={() => onStart(task.id, fromDatetimeLocal(actStart))}>
                      记录开工
                    </Button>
                  </div>
                )}

                {/* 已开工: 记录完工 + 更新进度 */}
                {status === 2 && (
                  <>
                    {onFinish && (
                      <div className="space-y-2 rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">记录实际完工(留空则用当前时间;完工后进度置 100%)</div>
                        <Input type="datetime-local" className="h-9" value={actEnd} onChange={(e) => setActEnd(e.target.value)} />
                        <Button size="sm" disabled={busy} onClick={() => onFinish(task.id, fromDatetimeLocal(actEnd))}>
                          记录完工
                        </Button>
                      </div>
                    )}
                    {onProgress && (
                      <div className="space-y-2 rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">更新进度(0-100)</div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number" min={0} max={100} className="h-9 w-24"
                            value={prog}
                            onChange={(e) => setProg(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => onProgress(task.id, prog)}>
                            保存进度
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 已开工/已完工: 手动修正实际时间 */}
                {status != null && status >= 2 && onAdjustActual && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">手动修正实际时间(纠错用)</div>
                    <label className="text-xs text-muted-foreground">实际开工</label>
                    <Input type="datetime-local" className="h-9" value={actStart} onChange={(e) => setActStart(e.target.value)} />
                    <label className="text-xs text-muted-foreground">实际完工</label>
                    <Input type="datetime-local" className="h-9" value={actEnd} onChange={(e) => setActEnd(e.target.value)} />
                    <Button
                      size="sm" variant="outline" disabled={busy}
                      onClick={() => onAdjustActual(task.id, fromDatetimeLocal(actStart), fromDatetimeLocal(actEnd))}
                    >
                      保存修正
                    </Button>
                  </div>
                )}

                {status === 3 && (
                  <div className="text-xs text-muted-foreground">任务已完工。如需纠错可用上方“手动修正实际时间”。</div>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
