import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { formList } from '@/api/workflow/form'
import { definitionSetForm } from '@/api/workflow/definition'
import type { WorkflowDefinition } from '@/types/workflow'

interface AssociateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  definition: WorkflowDefinition | null
}

const NONE = '__none__'

export default function AssociateFormDialog({ open, onOpenChange, definition }: AssociateFormDialogProps) {
  const { data: forms } = useQuery$(['workflow', 'form', 'all'], () => formList(), { enabled: open })
  const { mutate, loading } = useMutation$((arg: { id: string; formKey: string | null }) =>
    definitionSetForm(arg.id, arg.formKey),
  )
  const [selected, setSelected] = useState<string>(NONE)

  useEffect(() => {
    if (open) setSelected(definition?.formKey ?? NONE)
  }, [open, definition])

  const onSave = async () => {
    if (!definition) return
    try {
      await mutate({ id: definition.id, formKey: selected === NONE ? null : selected })
      toast.success('关联已更新')
      invalidate('["workflow","definition"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>关联流程表单</DialogTitle>
          <DialogDescription>为「{definition?.processName}」选择一个流程表单(按 key)。</DialogDescription>
        </DialogHeader>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择流程表单" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>未关联</SelectItem>
            {(forms ?? []).map((f) => (
              <SelectItem key={f.id} value={f.formKey}>
                {f.name}（{f.formKey}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSave} disabled={loading}>
            {loading ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
