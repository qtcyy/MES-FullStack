import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
} from '@workspace/ui'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { firstValueFrom } from 'rxjs'
import ScriptEditor from '@/components/ScriptEditor'
import { eventList, eventSave, eventDelete } from '@/api/workflow/event'
import {
  TRIGGER_OPTIONS,
  ACTION_OPTIONS,
  AUDIT_STATUS_OPTIONS,
  triggerLabel,
  auditStatusLabel,
  defaultEventRules,
} from '@/pages/workflow/formUtils'
import type {
  OrderAuditStatus,
  WorkflowDefinition,
  WorkflowEventActionType,
  WorkflowEventRule,
  WorkflowEventTrigger,
} from '@/types/workflow'

interface EventConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  definition: WorkflowDefinition | null
}

interface Draft {
  id: string
  name: string
  trigger: WorkflowEventTrigger
  actionType: WorkflowEventActionType
  targetStatus: OrderAuditStatus
  script: string
  enabled: boolean
}

const EMPTY_DRAFT: Draft = {
  id: '',
  name: '',
  trigger: 'START',
  actionType: 'SET_AUDIT_STATUS',
  targetStatus: 'APPROVING',
  script: '',
  enabled: true,
}

export default function EventConfigDialog({ open, onOpenChange, definition }: EventConfigDialogProps) {
  const [rules, setRules] = useState<WorkflowEventRule[]>([])
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)

  const reload = async () => {
    if (!definition) return
    setRules(await firstValueFrom(eventList(definition.id)))
  }

  useEffect(() => {
    if (open && definition) {
      setDraft(EMPTY_DRAFT)
      void reload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, definition])

  const persist = async (rule: WorkflowEventRule) => {
    await firstValueFrom(eventSave(rule))
    await reload()
  }

  const onAddOrUpdate = async () => {
    if (!definition) return
    if (draft.actionType === 'SCRIPT' && !draft.script.trim()) {
      toast.error('请填写脚本内容')
      return
    }
    const rule: WorkflowEventRule = {
      id: draft.id,
      definitionId: definition.id,
      name: draft.name || undefined,
      trigger: draft.trigger,
      businessType: 'ORDER_APPROVAL',
      actionType: draft.actionType,
      targetStatus: draft.actionType === 'SET_AUDIT_STATUS' ? draft.targetStatus : undefined,
      script: draft.actionType === 'SCRIPT' ? draft.script : undefined,
      enabled: draft.enabled,
    }
    await persist(rule)
    setDraft(EMPTY_DRAFT)
    toast.success(draft.id ? '规则已更新' : '规则已添加')
  }

  const onEdit = (r: WorkflowEventRule) => {
    setDraft({
      id: r.id,
      name: r.name ?? '',
      trigger: r.trigger,
      actionType: r.actionType,
      targetStatus: r.targetStatus ?? 'APPROVING',
      script: r.script ?? '',
      enabled: r.enabled,
    })
  }

  const onDelete = async (id: string) => {
    await firstValueFrom(eventDelete(id))
    await reload()
    if (draft.id === id) setDraft(EMPTY_DRAFT)
  }

  const onFillSample = async () => {
    if (!definition) return
    for (const d of defaultEventRules(definition.id)) {
      await firstValueFrom(eventSave({ id: '', ...d }))
    }
    await reload()
    toast.success('已填入生产订单审批示例规则')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>流程事件配置</DialogTitle>
          <DialogDescription>
            为「{definition?.processName}」配置审批过程/结束时的业务状态同步(生产订单 audit_status)。
          </DialogDescription>
        </DialogHeader>

        {/* 编辑器 */}
        <div className="space-y-3 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>规则名称</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="可选" />
            </div>
            <div className="space-y-1.5">
              <Label>触发时机</Label>
              <Select value={draft.trigger} onValueChange={(v) => setDraft((d) => ({ ...d, trigger: v as WorkflowEventTrigger }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>同步动作</Label>
              <Select value={draft.actionType} onValueChange={(v) => setDraft((d) => ({ ...d, actionType: v as WorkflowEventActionType }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {draft.actionType === 'SET_AUDIT_STATUS' ? (
              <div className="space-y-1.5">
                <Label>目标审批状态</Label>
                <Select value={draft.targetStatus} onValueChange={(v) => setDraft((d) => ({ ...d, targetStatus: v as OrderAuditStatus }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIT_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="col-span-2 space-y-1.5">
                <Label>脚本</Label>
                <ScriptEditor value={draft.script} onChange={(v) => setDraft((d) => ({ ...d, script: v }))} />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} />
              <span>启用</span>
            </label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onFillSample}>
                <Wand2 className="size-4" />填入示例
              </Button>
              <Button size="sm" onClick={onAddOrUpdate}>
                <Plus className="size-4" />{draft.id ? '更新规则' : '添加规则'}
              </Button>
            </div>
          </div>
        </div>

        {/* 规则列表 */}
        <div className="space-y-2">
          {rules.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">暂无事件规则</p>}
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{triggerLabel(r.trigger)}</Badge>
                <span className="text-muted-foreground">→</span>
                <span>
                  {r.actionType === 'SET_AUDIT_STATUS' ? `设置审批状态 = ${auditStatusLabel(r.targetStatus)}` : '执行脚本'}
                </span>
                {!r.enabled && <Badge variant="secondary">已停用</Badge>}
                {r.name && <span className="text-xs text-muted-foreground">({r.name})</span>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)}>编辑</Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onDelete(r.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
