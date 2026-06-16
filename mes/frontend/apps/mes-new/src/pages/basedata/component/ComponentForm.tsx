// apps/mes-new/src/pages/basedata/component/ComponentForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CircuitBoard } from 'lucide-react'
import { Input, Label, Textarea, toast } from '@workspace/ui'
import FormDialog from '@/components/FormDialog'
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
        <div className="space-y-1.5">
          <Label htmlFor="c-code">组件编码</Label>
          <Input id="c-code" value={record?.code ?? ''} disabled />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="c-name">组件名称</Label>
        <Input id="c-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-descr">描述</Label>
        <Textarea id="c-descr" {...register('descr')} />
      </div>
    </FormDialog>
  )
}
