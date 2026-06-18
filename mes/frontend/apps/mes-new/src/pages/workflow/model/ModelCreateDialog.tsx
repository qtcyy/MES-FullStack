import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Workflow, Info } from 'lucide-react'
import { Input, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { modelSave } from '@/api/workflow/model'
import { initialBpmnXml } from './bpmnUtils'

interface ModelCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 新建成功后回传 modelId,父组件可直接打开设计器 */
  onCreated: (modelId: string) => void
}

const schema = z.object({
  name: z.string().min(1, '请输入模型名称'),
  modelKey: z
    .string()
    .min(1, '请输入模型 key')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '以字母开头,仅含字母/数字/下划线'),
})

type FormValues = z.infer<typeof schema>

export default function ModelCreateDialog({ open, onOpenChange, onCreated }: ModelCreateDialogProps) {
  const { mutate, loading } = useMutation$((v: FormValues) =>
    modelSave({ name: v.name, modelKey: v.modelKey, bpmnXml: initialBpmnXml(v.modelKey, v.name) }),
  )
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', modelKey: '' },
  })

  useEffect(() => {
    if (open) reset({ name: '', modelKey: '' })
  }, [open, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const id = await mutate(values)
      toast.success('已创建模型')
      invalidate('["workflow","model"')
      onOpenChange(false)
      onCreated(id)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="创建流程模型"
      icon={Workflow}
      description="填写模型名称与 key(如 生产订单审批流程 / orderRecord)"
      onSubmit={onSubmit}
      submitting={loading}
      submitText="创建并设计"
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <FormField label="模型名称" htmlFor="mc-name" required error={errors.name?.message}>
          <Input id="mc-name" aria-invalid={!!errors.name} placeholder="生产订单审批流程" {...register('name')} />
        </FormField>
        <FormField label="模型 key" htmlFor="mc-key" required error={errors.modelKey?.message}>
          <Input id="mc-key" aria-invalid={!!errors.modelKey} placeholder="orderRecord" {...register('modelKey')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
