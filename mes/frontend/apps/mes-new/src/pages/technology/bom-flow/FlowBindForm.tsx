import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@workspace/ui'
import { GitBranch } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { bomFlowFlows, bomFlowBind } from '@/api/technology/bom-flow'

// 字段名 bindFlowId 避开潜在 DOM clobbering(name/id/nodeName 等 HTMLFormElement 属性),
// 提交时再映射回后端要的 flowId。
const schema = z.object({
  bindFlowId: z.string().min(1, '请选择工艺路线'),
  remark: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  bomId: string
  initial?: { flowId?: string; remark?: string }
  onSaved: () => void
}

export default function FlowBindForm({ open, onOpenChange, bomId, initial, onSaved }: Props) {
  const { data: flows } = useQuery$(['bomFlow', 'flows'], () => bomFlowFlows(), { enabled: open })
  const { mutate, loading } = useMutation$(
    (b: { bomId: string; flowId: string; remark?: string }) => bomFlowBind(b),
  )
  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bindFlowId: '', remark: '' },
  })

  useEffect(() => {
    if (open) reset({ bindFlowId: initial?.flowId ?? '', remark: initial?.remark ?? '' })
  }, [open, initial, reset])

  const onSubmit = handleSubmit(async (v) => {
    try {
      await mutate({ bomId, flowId: v.bindFlowId, remark: v.remark ?? '' })
      toast.success('已绑定工艺路线')
      onSaved()
      onOpenChange(false)
    } catch {
      /* toast by interceptor */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="绑定工艺路线"
      description="为该 BOM 节点选择一条工艺路线"
      icon={GitBranch}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="工艺路线" tag="必填">
        <FormField label="工艺路线" required error={errors.bindFlowId?.message}>
          <Controller
            control={control}
            name="bindFlowId"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择工艺路线" />
                </SelectTrigger>
                <SelectContent>
                  {(flows ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.flow} {f.flowDesc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField label="备注" htmlFor="bind-remark">
          <Textarea id="bind-remark" {...register('remark')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
