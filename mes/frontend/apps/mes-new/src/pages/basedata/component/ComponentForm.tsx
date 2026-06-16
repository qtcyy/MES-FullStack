// apps/mes-new/src/pages/basedata/component/ComponentForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CircuitBoard } from 'lucide-react'
import { Input, Textarea, toast } from '@workspace/ui'
import FormDialog from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { componentAddOrUpdate } from '@/api/basedata/component'
import type { SpComponent } from '@/types/basedata'

interface ComponentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpComponent | null
  onSaved: () => void
}

const schema = z.object({
  name: z.string().min(1, '请输入组件名称'),
  descr: z.string().optional(),
})

export default function ComponentForm({ open, onOpenChange, record, onSaved }: ComponentFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<SpComponent>) => componentAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', descr: '' },
  })

  useEffect(() => {
    if (open) reset({ name: record?.name ?? '', descr: record?.descr ?? '' })
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: Partial<SpComponent> = {
      ...(record ?? { deleted: '0' }),
      name: values.name,
      descr: values.descr ?? '',
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","component"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑组件' : '新增组件'} icon={CircuitBoard} description="维护元器件主数据" onSubmit={onSubmit} submitting={loading}>
      {isEdit && (
        <FormField label="组件编码" htmlFor="c-code">
          <Input id="c-code" value={record?.code ?? ''} disabled />
        </FormField>
      )}
      <FormField label="组件名称" htmlFor="c-name" required error={errors.name?.message}>
        <Input id="c-name" aria-invalid={!!errors.name} {...register('name')} />
      </FormField>
      <FormField label="描述" htmlFor="c-descr">
        <Textarea id="c-descr" {...register('descr')} />
      </FormField>
    </FormDialog>
  )
}
