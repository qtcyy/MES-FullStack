import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea, toast } from '@workspace/ui'
import { ListChecks, Info } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { operStepAddOrUpdate } from '@/api/basedata/operStep'
import type { SpOperStep } from '@/types/technology'

const schema = z.object({
  stepTitle: z.string().min(1, '请输入步骤标题'),
  stepDesc: z.string().optional(),
  // 表单内以字符串持有;空串或纯数字均通过,提交时再转 number
  estMinutes: z
    .string()
    .optional()
    .refine((v) => v == null || v === '' || /^\d+$/.test(v), '请输入非负整数'),
  remark: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  operId: string
  record?: SpOperStep | null
}

export default function OperStepForm({ open, onOpenChange, operId, record }: Props) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<SpOperStep>) => operStepAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { stepTitle: '', stepDesc: '', estMinutes: '', remark: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        stepTitle: record?.stepTitle ?? '',
        stepDesc: record?.stepDesc ?? '',
        estMinutes: record?.estMinutes != null ? String(record.estMinutes) : '',
        remark: record?.remark ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        id: record?.id,
        operId,
        stepTitle: values.stepTitle,
        stepDesc: values.stepDesc ?? '',
        remark: values.remark ?? '',
        ...(values.estMinutes && values.estMinutes !== ''
          ? { estMinutes: Number(values.estMinutes) }
          : {}),
      })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["operStep","list"')
      if (!isEdit) invalidate('["oper","page"') // 新增改变步骤数,刷新工序列表
      onOpenChange(false)
    } catch {
      /* 错误已由响应拦截器 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑步骤' : '新增步骤'}
      description="维护工序作业步骤"
      icon={ListChecks}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="步骤信息" icon={Info}>
        <FormField label="步骤标题" htmlFor="step-title" required error={errors.stepTitle?.message}>
          <Input id="step-title" placeholder="如:贴装主芯片" aria-invalid={!!errors.stepTitle} {...register('stepTitle')} />
        </FormField>
        <FormField label="详细说明" htmlFor="step-desc">
          <Textarea id="step-desc" placeholder="描述本步骤的具体操作..." {...register('stepDesc')} />
        </FormField>
        <FormField label="预计耗时(分钟)" htmlFor="step-est" error={errors.estMinutes?.message}>
          <Input id="step-est" type="number" min={0} placeholder="可空" aria-invalid={!!errors.estMinutes} {...register('estMinutes')} />
        </FormField>
        <FormField label="备注" htmlFor="step-remark">
          <Textarea id="step-remark" {...register('remark')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
