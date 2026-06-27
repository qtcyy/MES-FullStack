import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  cn,
  toast,
} from '@workspace/ui'
import { ArrowDown, ArrowUp, GripVertical, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { operStepList, operStepDelete, operStepReorder } from '@/api/basedata/operStep'
import { moveItem } from '@/utils/transfer'
import type { SpOper, SpOperStep } from '@/types/technology'
import OperStepForm from './OperStepForm'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  oper: SpOper | null
}

export default function OperStepDrawer({ open, onOpenChange, oper }: Props) {
  const operId = oper?.id ?? ''
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpOperStep | null>(null)
  const [deleting, setDeleting] = useState<SpOperStep | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const { data: steps, loading } = useQuery$(
    ['operStep', 'list', operId],
    () => operStepList(operId),
    { enabled: open && !!operId },
  )
  const { mutate: removeStep } = useMutation$((id: string) => operStepDelete(id))
  const { mutate: reorderSteps } = useMutation$((ids: string[]) => operStepReorder(operId, ids))

  /** 排序变更后只刷新抽屉步骤列表 */
  const refreshSteps = () => invalidate('["operStep","list"')
  /** 增/删改变步骤数,连工序列表的步骤数一并刷新 */
  const refreshStepsAndCount = () => {
    invalidate('["operStep","list"')
    invalidate('["oper","page"')
  }

  const list = steps ?? []

  const confirmDelete = async () => {
    if (!deleting?.id) return
    try {
      await removeStep(deleting.id)
      toast.success('删除成功')
      refreshStepsAndCount()
    } catch {
      /* toast by interceptor */
    } finally {
      setDeleting(null)
    }
  }

  /** 持久化新顺序(拖拽与上下移共用) */
  const persistOrder = async (ordered: SpOperStep[]) => {
    const ids = ordered.map((s) => s.id).filter((id): id is string => !!id)
    if (ids.length === 0) return
    try {
      await reorderSteps(ids)
      refreshSteps()
    } catch {
      /* toast by interceptor */
    }
  }

  const handleDrop = (to: number) => {
    if (dragIndex === null || dragIndex === to) {
      setDragIndex(null)
      return
    }
    persistOrder(moveItem(list, dragIndex, to))
    setDragIndex(null)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ListChecks className="size-4 text-primary" />
            工序步骤
          </SheetTitle>
          <SheetDescription>{oper ? `${oper.operCode ?? ''} ${oper.operDesc ?? ''}` : ''}</SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">共 {list.length} 个步骤 · 可拖拽排序</span>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }} disabled={!operId}>
            <Plus className="size-4" />
            新增步骤
          </Button>
        </div>

        <div className="flex-1 overflow-auto px-4 pb-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">加载中…</p>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无步骤,点击「新增步骤」添加</p>
          ) : (
            <ol className="space-y-2">
              {list.map((s, idx) => (
                <li
                  key={s.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    dragIndex === idx && 'opacity-50',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-0.5 size-4 shrink-0 cursor-grab text-muted-foreground" />
                    <Badge variant="secondary" className="mt-0.5 shrink-0">{s.stepNo ?? idx + 1}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.stepTitle}</span>
                        {s.estMinutes != null && (
                          <span className="text-xs text-muted-foreground">约 {s.estMinutes} 分钟</span>
                        )}
                      </div>
                      {s.stepDesc && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.stepDesc}</p>}
                      {s.remark && <p className="mt-1 text-xs text-muted-foreground/80">备注:{s.remark}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon-sm" disabled={idx === 0} onClick={() => persistOrder(moveItem(list, idx, idx - 1))}>
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" disabled={idx === list.length - 1} onClick={() => persistOrder(moveItem(list, idx, idx + 1))}>
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(s); setFormOpen(true) }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(s)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {operId && (
          <OperStepForm open={formOpen} onOpenChange={setFormOpen} operId={operId} record={editing} />
        )}

        <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>确定删除步骤「{deleting?.stepTitle}」吗?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}
