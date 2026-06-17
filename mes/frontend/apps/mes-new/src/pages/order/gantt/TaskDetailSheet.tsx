import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@workspace/ui'
import type { GanttTask } from '@/types/order'
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
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value || '—'}</span>
    </div>
  )
}

export default function TaskDetailSheet({ task, nowMs, open, onOpenChange }: Props) {
  const st = task ? getDisplayStatus(task, nowMs) : 'notStarted'
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:max-w-[380px]">
        <SheetHeader>
          <SheetTitle>{task ? `${task.orderCode} · ${task.operName}` : '任务详情'}</SheetTitle>
          <SheetDescription>派工任务只读详情</SheetDescription>
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
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
