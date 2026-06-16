// apps/mes-new/src/pages/basedata/process-unit/ProcessUnitForm.tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Switch, Textarea, toast } from '@workspace/ui'
import { Factory, Info } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { processUnitAddOrUpdate } from '@/api/basedata/process-unit'
import type { SpProcessUnit } from '@/types/process-unit'

const schema = z.object({
  code: z.string().min(1, '请输入单元代码'),
  name: z.string().min(1, '请输入单元名称'),
  type: z.string().optional(),
  hasLineWarehouse: z.boolean(),
  descr: z.string().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpProcessUnit | null
}

export default function ProcessUnitForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<SpProcessUnit>) => processUnitAddOrUpdate(dto))
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', type: '', hasLineWarehouse: false, descr: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: record?.code ?? '',
        name: record?.name ?? '',
        type: record?.type ?? '',
        hasLineWarehouse: record?.hasLineWarehouse === '1',
        descr: record?.descr ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        ...(record ?? {}),
        code: values.code,
        name: values.name,
        type: values.type ?? '',
        hasLineWarehouse: values.hasLineWarehouse ? '1' : '0',
        descr: values.descr ?? '',
      })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","process-unit"')
      onOpenChange(false)
    } catch {
      /* toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑工艺单元' : '新增工艺单元'}
      description="维护加工单元主数据"
      icon={Factory}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="单元代码" htmlFor="pu-code" required error={errors.code?.message}>
            <Input id="pu-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="单元名称" htmlFor="pu-name" required error={errors.name?.message}>
            <Input id="pu-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
        </div>
        <FormField label="单元类型" htmlFor="pu-type">
          <Input id="pu-type" placeholder="如:人员作业单元 / 设备作业单元" {...register('type')} />
        </FormField>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label htmlFor="pu-lw">是否有线边库</Label>
          <Controller
            control={control}
            name="hasLineWarehouse"
            render={({ field }) => <Switch id="pu-lw" checked={field.value} onCheckedChange={field.onChange} />}
          />
        </div>
        <FormField label="描述" htmlFor="pu-descr">
          <Textarea id="pu-descr" {...register('descr')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
