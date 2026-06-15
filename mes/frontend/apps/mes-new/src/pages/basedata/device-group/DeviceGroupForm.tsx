// apps/mes-new/src/pages/basedata/device-group/DeviceGroupForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Textarea, toast } from '@workspace/ui'
import { Boxes } from 'lucide-react'
import FormDialog from '@/components/FormDialog'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { deviceGroupAddOrUpdate } from '@/api/basedata/device-group'
import type { SpDeviceGroup } from '@/types/device'

const schema = z.object({
  code: z.string().min(1, '请输入编组代码'),
  name: z.string().min(1, '请输入编组名称'),
  descr: z.string().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpDeviceGroup | null
}

export default function DeviceGroupForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<SpDeviceGroup>) => deviceGroupAddOrUpdate(dto))
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', descr: '' },
  })

  useEffect(() => {
    if (open) reset({ code: record?.code ?? '', name: record?.name ?? '', descr: record?.descr ?? '' })
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({ ...(record ?? {}), ...values })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","device-group"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑设备组' : '新增设备组'}
      description="维护设备编组主数据"
      icon={Boxes}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <div className="space-y-1.5">
        <Label htmlFor="dg-code">编组代码</Label>
        <Input id="dg-code" {...register('code')} />
        {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dg-name">编组名称</Label>
        <Input id="dg-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dg-descr">描述</Label>
        <Textarea id="dg-descr" {...register('descr')} />
      </div>
    </FormDialog>
  )
}
