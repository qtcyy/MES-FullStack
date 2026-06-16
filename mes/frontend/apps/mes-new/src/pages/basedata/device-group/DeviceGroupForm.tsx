// apps/mes-new/src/pages/basedata/device-group/DeviceGroupForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea, toast } from '@workspace/ui'
import { Boxes } from 'lucide-react'
import FormDialog from '@/components/FormDialog'
import FormField from '@/components/FormField'
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
      // 仅提交实体字段 + id + deleted,避免把 DTO 专属字段(deviceList 等)/时间戳回传给后端
      await mutate({ id: record?.id, deleted: record?.deleted ?? '0', ...values })
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
      <FormField label="编组代码" htmlFor="dg-code" required error={errors.code?.message}>
        <Input id="dg-code" aria-invalid={!!errors.code} {...register('code')} />
      </FormField>
      <FormField label="编组名称" htmlFor="dg-name" required error={errors.name?.message}>
        <Input id="dg-name" aria-invalid={!!errors.name} {...register('name')} />
      </FormField>
      <FormField label="描述" htmlFor="dg-descr">
        <Textarea id="dg-descr" {...register('descr')} />
      </FormField>
    </FormDialog>
  )
}
