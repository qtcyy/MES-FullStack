import { useEffect, useMemo, useState } from 'react'
import {
  Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, toast,
} from '@workspace/ui'
import PageContainer from '@/components/PageContainer'
import { useMutation$, useQuery$ } from '@/http/hooks'
import {
  fetchGanttTasks, rescheduleTask, startTask, finishTask, updateTaskProgress, adjustTaskActual,
} from '@/api/order/gantt'
import type {
  GanttTask, GanttRescheduleReq, GanttStartReq, GanttFinishReq, GanttProgressReq, GanttActualReq,
} from '@/types/order'
import { computeRange, groupByOrder, groupByResource } from './ganttUtils'
import GanttChart from './GanttChart'
import TaskDetailSheet from './TaskDetailSheet'

const LEGEND: { cls: string; text: string }[] = [
  { cls: 'bg-slate-300 dark:bg-slate-600', text: '计划' },
  { cls: 'bg-slate-400', text: '未开工' },
  { cls: 'bg-amber-500', text: '进行中' },
  { cls: 'bg-green-500', text: '已完工' },
  { cls: 'bg-red-500', text: '逾期' },
]

export default function GanttPage() {
  const { data, loading, refetch } = useQuery$(['gantt', 'tasks'], () => fetchGanttTasks({}))
  // 改期乐观更新: 拖拽提交后先用本地新计划时间渲染,待 refetch 落库后清除,避免条体回弹/不跟手
  const [optimistic, setOptimistic] = useState<Record<string, { planStartTime: string; planEndTime: string }>>({})
  const tasks = useMemo(() => {
    const base = data ?? []
    if (Object.keys(optimistic).length === 0) return base
    return base.map((t) => (optimistic[t.id] ? { ...t, ...optimistic[t.id] } : t))
  }, [data, optimistic])
  // 新数据到达即清除乐观覆盖(此时服务端已是新计划时间,视觉无缝衔接)
  useEffect(() => {
    setOptimistic((prev) => (Object.keys(prev).length ? {} : prev))
  }, [data])
  // 仅首屏(尚无数据)显示骨架; refetch 时保留旧图表,避免整页刷新跳顶、滚动位置丢失
  const initialLoading = loading && !data
  // 挂载时快照一次"当前时间";用 lazy state initializer 而非 useMemo 包裹 Date.now(),
  // 满足 React 纯函数规则(useMemo 体内不得调用 Date.now 等不纯函数)。
  const [nowMs] = useState(() => Date.now())

  const [orderCode, setOrderCode] = useState('')
  const [teamId, setTeamId] = useState('all')
  const [tab, setTab] = useState('resource')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // active 按 id 从最新 tasks 派生,refetch 后自动反映新状态
  const active = useMemo(() => tasks.find((t) => t.id === activeId) ?? null, [tasks, activeId])

  const reM = useMutation$((b: GanttRescheduleReq) => rescheduleTask(b))
  const stM = useMutation$((b: GanttStartReq) => startTask(b))
  const fiM = useMutation$((b: GanttFinishReq) => finishTask(b))
  const prM = useMutation$((b: GanttProgressReq) => updateTaskProgress(b))
  const acM = useMutation$((b: GanttActualReq) => adjustTaskActual(b))
  const busy = reM.loading || stM.loading || fiM.loading || prM.loading || acM.loading

  const handleReschedule = async (t: GanttTask, planStartTime: string, planEndTime: string) => {
    // 先乐观渲染新位置,提交成功后由 refetch 落库并清除覆盖;失败则回滚
    setOptimistic((prev) => ({ ...prev, [t.id]: { planStartTime, planEndTime } }))
    try {
      await reM.mutate({ id: t.id, planStartTime, planEndTime })
      toast.success('已改期')
      refetch()
    } catch {
      setOptimistic((prev) => {
        const next = { ...prev }
        delete next[t.id]
        return next
      })
    }
  }
  const handleStart = async (id: string, actualStartTime: string) => {
    try { await stM.mutate({ id, actualStartTime: actualStartTime || undefined }); toast.success('已记录开工'); refetch() } catch { /* 拦截器已 toast */ }
  }
  const handleFinish = async (id: string, actualEndTime: string) => {
    try { await fiM.mutate({ id, actualEndTime: actualEndTime || undefined }); toast.success('已记录完工'); refetch() } catch { /* 拦截器已 toast */ }
  }
  const handleProgress = async (id: string, progress: number) => {
    try { await prM.mutate({ id, progress }); toast.success('进度已更新'); refetch() } catch { /* 拦截器已 toast */ }
  }
  const handleAdjustActual = async (id: string, actualStartTime: string, actualEndTime: string) => {
    try {
      await acM.mutate({ id, actualStartTime: actualStartTime || undefined, actualEndTime: actualEndTime || undefined })
      toast.success('实际时间已修正')
      refetch()
    } catch { /* 拦截器已 toast */ }
  }

  const teamOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of tasks) m.set(t.teamId, t.teamName || '未分组班组')
    return [...m].map(([id, name]) => ({ id, name }))
  }, [tasks])

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (!orderCode || (t.orderCode ?? '').toLowerCase().includes(orderCode.toLowerCase())) &&
          (teamId === 'all' || t.teamId === teamId),
      ),
    [tasks, orderCode, teamId],
  )

  const range = useMemo(() => computeRange(filtered, nowMs), [filtered, nowMs])
  const resourceGroups = useMemo(() => groupByResource(filtered), [filtered])
  const orderGroups = useMemo(() => groupByOrder(filtered), [filtered])

  const onTaskClick = (t: GanttTask) => {
    setActiveId(t.id)
    setSheetOpen(true)
  }

  const chartHandlers = {
    onTaskClick,
    onReschedule: handleReschedule,
    onQuickStart: (t: GanttTask) => handleStart(t.id, ''),
    onQuickFinish: (t: GanttTask) => handleFinish(t.id, ''),
  }

  return (
    <PageContainer
      title="生产甘特图"
      description="拖动计划条改期,点击任务回填执行(开工/完工/进度)"
      actions={
        <Button variant="outline" size="sm" onClick={refetch}>
          刷新
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="g-code">工单编号</label>
          <Input
            id="g-code"
            className="h-9 w-48"
            placeholder="按工单编号过滤"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="g-team">班组</label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger id="g-team" className="h-9 w-44">
              <SelectValue placeholder="全部班组" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部班组</SelectItem>
              {teamOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 pb-1.5">
          {LEGEND.map((l) => (
            <span key={l.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`inline-block h-2.5 w-4 rounded-sm ${l.cls}`} />
              {l.text}
            </span>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="resource">资源视角</TabsTrigger>
          <TabsTrigger value="order">订单视角</TabsTrigger>
        </TabsList>
        <TabsContent value="resource" className="pt-3">
          {initialLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <GanttChart
              groups={resourceGroups}
              rangeStartMs={range.startMs}
              rangeEndMs={range.endMs}
              nowMs={nowMs}
              {...chartHandlers}
            />
          )}
        </TabsContent>
        <TabsContent value="order" className="pt-3">
          {initialLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <GanttChart
              groups={orderGroups}
              rangeStartMs={range.startMs}
              rangeEndMs={range.endMs}
              nowMs={nowMs}
              {...chartHandlers}
            />
          )}
        </TabsContent>
      </Tabs>

      <TaskDetailSheet
        task={active}
        nowMs={nowMs}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        busy={busy}
        onStart={handleStart}
        onFinish={handleFinish}
        onProgress={handleProgress}
        onAdjustActual={handleAdjustActual}
      />
    </PageContainer>
  )
}
